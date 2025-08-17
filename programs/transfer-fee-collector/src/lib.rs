use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("G6rJUiBCRzoTy1VNskvqxNr9zTkKoBScqnNLHbwtKdBz");

#[program]
pub mod transfer_fee_collector {
    use super::*;

    /// Initialize the transfer fee collector
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_bps: u16,
    ) -> Result<()> {
        let fee_collector = &mut ctx.accounts.fee_collector;
        fee_collector.authority = ctx.accounts.authority.key();
        fee_collector.fee_recipient = ctx.accounts.fee_recipient.key();
        fee_collector.fee_bps = fee_bps;
        fee_collector.bump = *ctx.bumps.get("fee_collector").unwrap();
        
        msg!("Transfer fee collector initialized with {} BPS fee", fee_bps);
        Ok(())
    }

    /// Transfer SOL with fee collection
    pub fn transfer_sol_with_fee(
        ctx: Context<TransferSolWithFee>,
        amount: u64,
    ) -> Result<()> {
        let fee_collector = &ctx.accounts.fee_collector;
        
        // Calculate fee (amount * fee_bps / 10000)
        let fee_amount = (amount as u128)
            .checked_mul(fee_collector.fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        
        let transfer_amount = amount.checked_sub(fee_amount).unwrap();
        
        // Transfer SOL to recipient
        let transfer_recipient_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.sender.key(),
            &ctx.accounts.recipient.key(),
            transfer_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_recipient_ix,
            &[
                ctx.accounts.sender.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
            ],
        )?;
        
        // Transfer fee to fee recipient
        let transfer_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.sender.key(),
            &ctx.accounts.fee_recipient.key(),
            fee_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_fee_ix,
            &[
                ctx.accounts.sender.to_account_info(),
                ctx.accounts.fee_recipient.to_account_info(),
            ],
        )?;
        
        // Emit event
        emit!(TransferWithFeeEvent {
            from: ctx.accounts.sender.key(),
            to: ctx.accounts.recipient.key(),
            token_mint: Pubkey::default(), // SOL has no mint
            amount: transfer_amount,
            fee_amount,
        });
        
        msg!("SOL transfer completed: {} SOL transferred, {} SOL fee collected", 
             transfer_amount as f64 / 1e9, fee_amount as f64 / 1e9);
        
        Ok(())
    }

    /// Transfer SPL token with fee collection
    pub fn transfer_spl_with_fee(
        ctx: Context<TransferSplWithFee>,
        amount: u64,
    ) -> Result<()> {
        let fee_collector = &ctx.accounts.fee_collector;
        
        // Calculate fee (amount * fee_bps / 10000)
        let fee_amount = (amount as u128)
            .checked_mul(fee_collector.fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        
        let transfer_amount = amount.checked_sub(fee_amount).unwrap();
        
        // Transfer tokens to recipient
        let transfer_recipient_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        
        token::transfer(transfer_recipient_ctx, transfer_amount)?;
        
        // Transfer fee to fee recipient
        let transfer_fee_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.fee_recipient_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        
        token::transfer(transfer_fee_ctx, fee_amount)?;
        
        // Emit event
        emit!(TransferWithFeeEvent {
            from: ctx.accounts.sender.key(),
            to: ctx.accounts.recipient.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount: transfer_amount,
            fee_amount,
        });
        
        msg!("SPL token transfer completed: {} tokens transferred, {} tokens fee collected", 
             transfer_amount, fee_amount);
        
        Ok(())
    }

    /// Update fee configuration (authority only)
    pub fn update_fee_config(
        ctx: Context<UpdateFeeConfig>,
        new_fee_bps: u16,
        new_fee_recipient: Pubkey,
    ) -> Result<()> {
        let fee_collector = &mut ctx.accounts.fee_collector;
        
        require!(new_fee_bps <= 1000, TransferFeeError::FeeTooHigh);
        require!(new_fee_recipient != Pubkey::default(), TransferFeeError::InvalidFeeRecipient);
        
        fee_collector.fee_bps = new_fee_bps;
        fee_collector.fee_recipient = new_fee_recipient;
        
        emit!(FeeConfigUpdatedEvent {
            new_fee_bps,
            new_fee_recipient,
        });
        
        msg!("Fee config updated: {} BPS, recipient: {}", new_fee_bps, new_fee_recipient);
        
        Ok(())
    }

    /// Blacklist/unblacklist a token mint
    pub fn set_token_blacklist(
        ctx: Context<SetTokenBlacklist>,
        token_mint: Pubkey,
        blacklisted: bool,
    ) -> Result<()> {
        let fee_collector = &mut ctx.accounts.fee_collector;
        
        if blacklisted {
            fee_collector.blacklisted_tokens.insert(token_mint);
        } else {
            fee_collector.blacklisted_tokens.remove(&token_mint);
        }
        
        emit!(TokenBlacklistedEvent {
            token_mint,
            blacklisted,
        });
        
        msg!("Token {} {}", token_mint, if blacklisted { "blacklisted" } else { "unblacklisted" });
        
        Ok(())
    }

    /// Emergency withdrawal (authority only)
    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
        amount: u64,
    ) -> Result<()> {
        let fee_collector = &ctx.accounts.fee_collector;
        
        // Transfer SOL from program to authority
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.fee_collector.key(),
            &ctx.accounts.authority.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.fee_collector.to_account_info(),
                ctx.accounts.authority.to_account_info(),
            ],
        )?;
        
        msg!("Emergency withdrawal: {} SOL withdrawn", amount as f64 / 1e9);
        
        Ok(())
    }

    /// Emergency withdraw SPL tokens (authority only)
    pub fn emergency_withdraw_spl(
        ctx: Context<EmergencyWithdrawSpl>,
        amount: u64,
    ) -> Result<()> {
        let fee_collector = &ctx.accounts.fee_collector;
        
        // Transfer SPL tokens from program to authority
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.program_token_account.to_account_info(),
                to: ctx.accounts.authority_token_account.to_account_info(),
                authority: ctx.accounts.fee_collector.to_account_info(),
            },
        );
        
        token::transfer(transfer_ctx, amount)?;
        
        msg!("Emergency SPL withdrawal: {} tokens withdrawn", amount);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + FeeCollector::INIT_SPACE,
        seeds = [b"fee_collector"],
        bump
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: This is the fee recipient address
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferSolWithFee<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// CHECK: This is the recipient address
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// CHECK: This is the fee recipient address
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferSplWithFee<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    /// CHECK: This is the fee recipient address
    pub fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFeeConfig<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetTokenBlacklist<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyWithdrawSpl<'info> {
    #[account(
        seeds = [b"fee_collector"],
        bump = fee_collector.bump,
        has_one = authority
    )]
    pub fee_collector: Account<'info, FeeCollector>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub program_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct FeeCollector {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub fee_bps: u16, // Fee in basis points (1-10000)
    pub bump: u8,
    pub blacklisted_tokens: Vec<Pubkey>, // Use Vec instead of BTreeSet for Anchor compatibility
}

#[event]
pub struct TransferWithFeeEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub fee_amount: u64,
}

#[event]
pub struct FeeConfigUpdatedEvent {
    pub new_fee_bps: u16,
    pub new_fee_recipient: Pubkey,
}

#[event]
pub struct TokenBlacklistedEvent {
    pub token_mint: Pubkey,
    pub blacklisted: bool,
}

#[error_code]
pub enum TransferFeeError {
    #[msg("Fee cannot exceed 10% (1000 BPS)")]
    FeeTooHigh,
    #[msg("Invalid fee recipient address")]
    InvalidFeeRecipient,
    #[msg("Token is blacklisted")]
    TokenBlacklisted,
    #[msg("Insufficient balance")]
    InsufficientBalance,
} 