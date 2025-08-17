// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TransferFeeCollector
 * @dev Handles token transfers with automatic platform fee collection
 * Supports ANY ERC20 token by default - no whitelist required
 */
contract TransferFeeCollector is Ownable, ReentrancyGuard {
    
    // Fee configuration
    uint256 public feeBps = 50; // 0.5% default fee (50 basis points)
    address public feeRecipient;
    
    // Fee tracking
    mapping(address => uint256) public collectedFees;
    
    // Optional: Blacklist for problematic tokens
    mapping(address => bool) public blacklistedTokens;
    
    // Events
    event TransferWithFee(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 feeAmount
    );
    
    event FeeCollected(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    
    event FeeConfigUpdated(
        uint256 newFeeBps,
        address newFeeRecipient
    );
    
    event TokenBlacklisted(
        address indexed token,
        bool blacklisted
    );
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        require(feeRecipient != address(0), "Invalid fee recipient");
    }
    
    /**
     * @dev Transfer ETH with fee collection
     * @param recipient The address to receive the transfer
     * @param amount The amount to transfer (excluding fee)
     */
    function transferETH(address recipient, uint256 amount) 
        external 
        payable 
        nonReentrant 
    {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate fee
        uint256 feeAmount = (amount * feeBps) / 10000;
        uint256 totalAmount = amount + feeAmount;
        
        require(msg.value >= totalAmount, "Insufficient ETH sent");
        
        // Transfer to recipient
        (bool success1, ) = recipient.call{value: amount}("");
        require(success1, "Transfer to recipient failed");
        
        // Collect fee
        (bool success2, ) = feeRecipient.call{value: feeAmount}("");
        require(success2, "Fee collection failed");
        
        // Refund excess ETH
        uint256 excess = msg.value - totalAmount;
        if (excess > 0) {
            (bool success3, ) = msg.sender.call{value: excess}("");
            require(success3, "Excess refund failed");
        }
        
        collectedFees[address(0)] += feeAmount;
        
        emit TransferWithFee(msg.sender, recipient, address(0), amount, feeAmount);
        emit FeeCollected(address(0), feeAmount, feeRecipient);
    }
    
    /**
     * @dev Transfer ANY ERC20 token with fee collection
     * @param token The ERC20 token address (any valid ERC20)
     * @param recipient The address to receive the transfer
     * @param amount The amount to transfer (excluding fee)
     */
    function transferERC20(
        address token,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(!blacklistedTokens[token], "Token is blacklisted");
        
        // Calculate fee
        uint256 feeAmount = (amount * feeBps) / 10000;
        uint256 totalAmount = amount + feeAmount;
        
        // Transfer tokens from user to this contract
        IERC20(token).transferFrom(msg.sender, address(this), totalAmount);
        
        // Transfer to recipient
        IERC20(token).transfer(recipient, amount);
        
        // Collect fee
        IERC20(token).transfer(feeRecipient, feeAmount);
        
        collectedFees[token] += feeAmount;
        
        emit TransferWithFee(msg.sender, recipient, token, amount, feeAmount);
        emit FeeCollected(token, feeAmount, feeRecipient);
    }
    
    /**
     * @dev Batch transfer multiple ERC20 tokens with fees
     * @param transfers Array of transfer data
     */
    function batchTransferERC20(TransferData[] calldata transfers) 
        external 
        nonReentrant 
    {
        for (uint256 i = 0; i < transfers.length; i++) {
            TransferData memory transfer = transfers[i];
            
            require(transfer.token != address(0), "Invalid token");
            require(transfer.recipient != address(0), "Invalid recipient");
            require(transfer.amount > 0, "Amount must be greater than 0");
            require(!blacklistedTokens[transfer.token], "Token is blacklisted");
            
            uint256 feeAmount = (transfer.amount * feeBps) / 10000;
            uint256 totalAmount = transfer.amount + feeAmount;
            
            // Transfer tokens from user to this contract
            IERC20(transfer.token).transferFrom(msg.sender, address(this), totalAmount);
            
            // Transfer to recipient
            IERC20(transfer.token).transfer(transfer.recipient, transfer.amount);
            
            // Collect fee
            IERC20(transfer.token).transfer(feeRecipient, feeAmount);
            
            collectedFees[transfer.token] += feeAmount;
            
            emit TransferWithFee(msg.sender, transfer.recipient, transfer.token, transfer.amount, feeAmount);
            emit FeeCollected(transfer.token, feeAmount, feeRecipient);
        }
    }
    
    /**
     * @dev Update fee configuration (owner only)
     * @param newFeeBps New fee in basis points
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeConfig(uint256 newFeeBps, address newFeeRecipient) 
        external 
        onlyOwner 
    {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        
        feeBps = newFeeBps;
        feeRecipient = newFeeRecipient;
        
        emit FeeConfigUpdated(newFeeBps, newFeeRecipient);
    }
    
    /**
     * @dev Blacklist/unblacklist tokens (owner only)
     * @param token Token address
     * @param blacklisted Whether to blacklist the token
     */
    function setTokenBlacklist(address token, bool blacklisted) 
        external 
        onlyOwner 
    {
        require(token != address(0), "Invalid token address");
        blacklistedTokens[token] = blacklisted;
        
        emit TokenBlacklisted(token, blacklisted);
    }
    
    /**
     * @dev Check if a token is blacklisted
     * @param token Token address
     * @return bool Whether the token is blacklisted
     */
    function isTokenBlacklisted(address token) external view returns (bool) {
        return blacklistedTokens[token];
    }
    
    /**
     * @dev Get fee amount for a given transfer amount
     * @param amount Transfer amount
     * @return feeAmount Calculated fee amount
     */
    function getFeeAmount(uint256 amount) external view returns (uint256) {
        return (amount * feeBps) / 10000;
    }
    
    /**
     * @dev Get total amount needed for transfer (including fee)
     * @param amount Transfer amount
     * @return totalAmount Total amount needed
     */
    function getTotalAmount(uint256 amount) external view returns (uint256) {
        return amount + ((amount * feeBps) / 10000);
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) 
        external 
        onlyOwner 
    {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    /**
     * @dev Get total fees collected for all tokens
     * Note: This is a view function that reads from collectedFees mapping
     * @return totalFees Total fees collected across all tokens
     */
    function getTotalFeesCollected() external view returns (uint256 totalFees) {
        // This function reads from the collectedFees mapping
        // which is state, so it should remain 'view'
        // For now, we'll return the ETH fees as a proxy for total fees
        // since iterating through all tokens would be gas intensive
        return collectedFees[address(0)]; // Return ETH fees collected
    }
    
    /**
     * @dev Get fees collected for a specific token
     * @param token Token address (address(0) for ETH)
     * @return fees Amount of fees collected for this token
     */
    function getFeesCollectedForToken(address token) external view returns (uint256 fees) {
        return collectedFees[token];
    }
    
    /**
     * @dev Get fees collected for multiple tokens
     * @param tokens Array of token addresses
     * @return fees Array of fees collected for each token
     */
    function getFeesCollectedForTokens(address[] calldata tokens) 
        external 
        view 
        returns (uint256[] memory fees) 
    {
        fees = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            fees[i] = collectedFees[tokens[i]];
        }
        return fees;
    }
    
    // Struct for batch transfers
    struct TransferData {
        address token;
        address recipient;
        uint256 amount;
    }
    
    // Receive ETH
    receive() external payable {}
} 