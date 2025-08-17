import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from './ThemedView';
import { useAppKitAccount, useAppKitProvider, useAppKitError } from "@reown/appkit-ethers5-react-native";
import { apiService } from '../services/api.service';
import { LinearGradient } from 'expo-linear-gradient';
import { TransactionShareData } from './TransactionShareCard';
import { ethers } from "ethers";
import { usePrivy, getUserEmbeddedEthereumWallet, getUserEmbeddedSolanaWallet, useEmbeddedEthereumWallet, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { Connection } from '@solana/web3.js';
import { Transaction } from '@solana/web3.js';

const { width } = Dimensions.get('window');

interface TransactionPreviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (transactionData: any) => void;
  transactionDetails: {
    id: string;
    type: string;
    amount?: string;
    tokenSymbol?: string;
    network?: string;
    to?: string;
    responseType?: string;
    transakParams?: {
      isBuy?: boolean;
    };
    explanation?: string;
    estimatedGas?: string;
    estimatedFee?: string;
    gas?: string;
    gasPrice?: string;
    fee?: string;
    networkIconUrl?: string;
    ui?: {
      networkIconUrl?: string;
    };
    params?: {
      intent?: string;
      network?: string;
      protocol?: string;
      token?: string;
      from?: string;
    };
    unsignedTransaction?: any;
  };
}

export const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  transactionDetails
}) => {
  console.log('[TransactionPreviewModal] Rendered with:', { isVisible, transactionDetails });
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && require('react-native').useColorScheme() === 'dark');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('0.0023'); // Mock gas estimate
  
  // Wallet integration
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider();
  const { error: appKitError } = useAppKitError();
  // Privy integration
  const { user: privyUser } = usePrivy();
  const privyEvmAccount = getUserEmbeddedEthereumWallet(privyUser);
  const privySolanaAccount = getUserEmbeddedSolanaWallet(privyUser);
  const { wallets: evmWallets } = useEmbeddedEthereumWallet();
  const { wallets: solanaWallets } = useEmbeddedSolanaWallet();

  // Log any AppKit errors for debugging
  useEffect(() => {
    if (appKitError) {
      console.error('🛑🛑 AppKit Error:', appKitError);
    }
  }, [appKitError]);

  // Helper function to get transaction title
  const getTransactionTitle = () => {
    console.log('⭐ transactionDetails.type for the transaction title:', transactionDetails.type);
    switch (transactionDetails.type) {
      case 'swap':
        return 'Swap Preview';
      case 'send':
        return 'Send Preview';
      case 'stake':
        return 'Stake Preview';
      case 'unstake':
        return 'Unstake Preview';
      case 'approve':
        return 'Approve Preview';
      default:
        return 'Transaction Preview';
    }
  };

  // Helper function to get network icon
  const getNetworkIcon = (network = 'ethereum') => {
    switch ((network || '').toLowerCase()) {
      case 'ethereum':
        return require('../assets/networks/ethereum.png');
      case 'polygon':
        return require('../assets/networks/polygon.png');
      case 'arbitrum':
        return require('../assets/networks/arbitrium.png');
      case 'optimism':
        return require('../assets/networks/optimism.png');
      case 'base':
        return require('../assets/networks/base.png');
      case 'solana':
        return require('../assets/networks/solana.png');
      default:
        return require('../assets/networks/ethereum.png');
    }
  };

  // Helper function to get block explorer URL
  const getBlockExplorerUrl = (network: string, txHash: string) => {
    switch (network.toLowerCase()) {
      case 'ethereum':
        return `https://etherscan.io/tx/${txHash}`;
      case 'polygon':
        return `https://polygonscan.com/tx/${txHash}`;
      case 'arbitrum':
        return `https://arbiscan.io/tx/${txHash}`;
      case 'optimism':
        return `https://optimistic.etherscan.io/tx/${txHash}`;
      case 'base':
        return `https://basescan.org/tx/${txHash}`;
      case 'solana':
        return `https://solscan.io/tx/${txHash}`;
      default:
        return `https://etherscan.io/tx/${txHash}`;
    }
  };

  function toHex(value: any) {
    if (!value) return undefined;
    if (typeof value === 'string' && value.startsWith('0x')) return value;
    return '0x' + BigInt(value).toString(16);
  }

  // Unified sendTransaction for WalletConnect/AppKit and Privy (EVM & Solana)
  const sendTransaction = async (txData: any) => {
    const network = (transactionDetails.network || '').toLowerCase();
    const isEvm = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(network);
    const isSolana = network === 'solana';

    // Prefer WalletConnect/AppKit if connected and EVM
    if (isEvm && isConnected && walletProvider && address) {
    try {
      console.log('Sending transaction via AppKit:', txData);
      const provider = new ethers.providers.Web3Provider(walletProvider);
      const signer = provider.getSigner();
      const transaction = {
          from: address,
        to: txData.to,
        value: txData.value ? ethers.utils.parseEther(txData.value) : ethers.utils.parseEther('0'),
        data: txData.data || '0x',
        gas: txData.gasLimit ? ethers.BigNumber.from(txData.gasLimit) : ethers.BigNumber.from(21000),
        gasPrice: txData.gasPrice ? ethers.BigNumber.from(txData.gasPrice) : undefined,
      };
        console.log('Transaction object for sending:', transaction);
        const txResponse = await signer.sendTransaction(transaction);
        const receipt = await txResponse.wait();
        return { success: true, hash: receipt.transactionHash, error: '' };
      } catch (error: any) {
        console.error('Error sending transaction via AppKit:', error);
        return { success: false, error: error.message || 'Failed to send transaction', hash: '' };
      }
    }

    // Privy EVM
    if (isEvm && privyEvmAccount) {
      try {
        const provider = await evmWallets[0].getProvider();
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const txParams = {
          from: accounts[0],
          to: txData.to,
          value: toHex(txData.value), // usually "0x0" for approve
          data: txData.data || '0x',
          gas: toHex(txData.gasLimit),
          gasPrice: toHex(txData.gasPrice),
        };
        console.log('Sending EVM tx via Privy:', txParams);
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        });
        return { success: true, hash: txHash, error: '' };
      } catch (error: any) {
        console.error('Error sending EVM tx via Privy:', error);
        return { success: false, error: error.message || 'Failed to send transaction', hash: '' };
      }
    }

    // Privy Solana
    if (isSolana && privySolanaAccount && solanaWallets && solanaWallets.length > 0) {
      try {
        const solanaProvider = await solanaWallets[0].getProvider();
        
        // Create a connection to the Solana network
        const connection = new Connection('https://purple-flashy-tent.solana-mainnet.quiknode.pro/e792ad1c2a839ee7468f87d1592bec5921e8d915/');
        
        // txData.unsignedTransaction should be a base64 serialized Solana transaction
        console.log('Sending Solana tx via Privy:', txData.unsignedTransaction);
        
        // Convert base64 string to Transaction object
        let transaction;
        if (typeof txData.unsignedTransaction === 'string') {
          // If it's a base64 string, deserialize it
          const transactionBuffer = Buffer.from(txData.unsignedTransaction, 'base64');
          transaction = Transaction.from(transactionBuffer);
        } else {
          // If it's already a Transaction object, use it directly
          transaction = txData.unsignedTransaction;
        }
        
        // Get a fresh blockhash to avoid "Blockhash not found" error
        console.log('Getting fresh blockhash for Solana transaction...');
        const { blockhash } = await connection.getLatestBlockhash();
        console.log('Fresh blockhash:', blockhash);
        
        // Update the transaction with the fresh blockhash
        transaction.recentBlockhash = blockhash;
        
        // Send the transaction using Privy's Solana provider
        const { signature } = await solanaProvider.request({
          method: 'signAndSendTransaction',
          params: {
            transaction: transaction,
            connection: connection
          }
        });
        
        console.log('Solana transaction sent successfully:', signature);
        return { success: true, hash: signature, error: '' };
    } catch (error: any) {
        console.error('Error sending Solana tx via Privy:', error);
        return { success: false, error: error.message || 'Failed to send transaction', hash: '' };
      }
    }

    return { success: false, error: 'No wallet connected', hash: '' };
  };

  const handleConfirmTransaction = async () => {
    if (!transactionDetails) return;
    
    setIsProcessing(true);
    
    try {
      // Check if wallet is connected
      const isPrivyConnected = !!privyUser && (privyEvmAccount || privySolanaAccount);
      if (!(isConnected && walletProvider) && !isPrivyConnected) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to proceed with the transaction.');
        return;
      }

      // Use the raw unsignedTransaction data from the backend
      const unsignedTx = transactionDetails.unsignedTransaction;
      
      if (!unsignedTx) {
        Alert.alert('Transaction Error', 'No transaction data available. Please try again.');
        return;
      }

      console.log('Raw unsigned transaction from backend:', unsignedTx);
      
      // Create transaction object using the raw data from backend
      // Note: gas and gasPrice are in separate fields, not in unsignedTransaction
      const transaction = {
        to: unsignedTx.to,
        value: unsignedTx.value || '0x0',
        data: unsignedTx.data || '0x',
        gasLimit: transactionDetails.gas || transactionDetails.estimatedGas || '21000', // Use raw gas value
        gasPrice: transactionDetails.gasPrice || '0x', // Use raw gas price
        network: transactionDetails.network || 'ethereum', // Pass network for proper handling
        unsignedTransaction: unsignedTx, // Pass the full unsigned transaction for Solana
        // Note: network is not part of the Ethereum RPC spec for eth_signTransaction
        // The wallet provider determines the network based on its current configuration
      };
      
      console.log('Executing transaction:', transaction);
      
      // Send the transaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        // ✅ NEW: Track transaction in backend database
        try {
          const trackingResponse = await apiService.trackTransaction({
            messageId: transactionDetails.id, // Original chat message ID
            transactionHash: result.hash,
            network: transactionDetails.network || 'ethereum',
            from: address || '', // Ensure address is a string
            to: transactionDetails.to,
            amount: transactionDetails.amount || '0',
            tokenSymbol: transactionDetails.tokenSymbol || 'ETH',
            gasUsed: undefined, // Not available from current result
            blockNumber: undefined, // Not available from current result
            status: 'success',
            transactionType: transactionDetails.type
          });
          console.log('✅ Transaction tracked in backend database');
          
          // ✅ NEW: Get enhanced transaction data for sharing with achievements
          let enhancedTransactionData = null;
          if (trackingResponse) {
            // The backend already enhanced the data during tracking
            enhancedTransactionData = (trackingResponse as any).data;
            console.log('✅ Enhanced transaction data received:', {
              hasAchievement: !!enhancedTransactionData.achievement,
              hasUserStats: !!enhancedTransactionData.userStats,
              hasSocialProof: !!enhancedTransactionData.socialProof,
              personalizedMessage: enhancedTransactionData.personalizedMessage
            });
          } else {
            // Fallback: create basic transaction data
            enhancedTransactionData = {
          type: transactionDetails.type,
          amount: transactionDetails.amount,
          tokenSymbol: transactionDetails.tokenSymbol,
          network: transactionDetails.network || 'ethereum',
          to: transactionDetails.to,
          hash: result.hash,
          status: 'success',
          timestamp: Date.now()
        };
          }
        
          // Call the onConfirm callback with the enhanced transaction data
          onConfirm(enhancedTransactionData);
        
        // Close the modal immediately after successful transaction
        onClose();
        
        } catch (trackingError) {
          console.warn('⚠️ Transaction executed but tracking failed:', trackingError);
          // Don't fail the transaction if tracking fails - transaction was successful
          // Create basic transaction data as fallback
          const basicTransactionData = {
            type: transactionDetails.type,
            amount: transactionDetails.amount,
            tokenSymbol: transactionDetails.tokenSymbol,
            network: transactionDetails.network || 'ethereum',
            to: transactionDetails.to,
            hash: result.hash,
            status: 'success',
            timestamp: Date.now()
          };
          onConfirm(basicTransactionData);
          
          // Close the modal immediately after successful transaction (even if tracking failed)
        onClose();
        }
      } else {
        Alert.alert('Transaction Failed', result.error || 'Failed to send transaction');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert(
        "Transaction Failed", 
        "There was an error processing your transaction. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to get a short summary of the explanation
  const getShortExplanation = (text: string, maxLength = 120) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    // Try to cut at the nearest sentence or word
    const truncated = text.slice(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('. ');
    if (lastPeriod > 40) return truncated.slice(0, lastPeriod + 1);
    return truncated + '...';
  };

  // State for explanation expand/collapse
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  // Use only params from transactionDetails.params (do not fall back to transactionDetails)
  const params = transactionDetails.params;

  // If this is a Transak transaction, we don't need to show the preview
  // as it will be handled by the Transak widget
  if (transactionDetails.responseType === 'TRANSAK') {
    return (
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <ThemedView style={styles.centeredContainer}>
          <View style={[styles.loadingContainer, isDark && styles.containerDark]}>
            <ActivityIndicator size="large" color="#ae1cff" />
            <Text style={[styles.loadingText, isDark && styles.textLight]}>
              Opening {transactionDetails.transakParams?.isBuy ? 'buy' : 'sell'} interface...
            </Text>
            <TouchableOpacity style={[styles.button, styles.cancelButtonStyle]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isDark && styles.containerDark]}>
          <View style={styles.headerContainer}>
            <Text style={[styles.headerTitle, isDark && styles.textLight]}>
              {getTransactionTitle()}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={[styles.card, isDark && styles.cardDark]}>
              <View style={styles.networkContainer}>
                <Image 
                  source={getNetworkIcon(transactionDetails.network)}
                  style={styles.networkIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  priority="high"
                  placeholder={require('../assets/networks/ethereum.png')}
                />
                <Text style={[styles.networkText, { color: '#fff' }]}> 
                  {transactionDetails.network ? transactionDetails.network.charAt(0).toUpperCase() + transactionDetails.network.slice(1).toLowerCase() : ''} Chain
                </Text>
              </View>  

              {/* Show stake-specific fields if present */}
              {params && (params as any).protocol && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Protocol</Text>
                  <Text style={[styles.addressText, isDark && styles.textLight]}>{(params as any).protocol}</Text>
                </View>
              )}
              {params && (params as any).token && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Token</Text>
                  <Text style={[styles.addressText, isDark && styles.textLight]}>{((params as any).token || '').toUpperCase()}</Text>
                </View>
              )}
              {params && (params as any).from && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>From</Text>
                  <Text style={[styles.addressText, isDark && styles.textLight]} numberOfLines={1} ellipsizeMode="middle">{(params as any).from}</Text>
                </View>
              )}
              {/* You can add more stake-specific fields here as needed, e.g. lockup, rewards, etc. */}
              {transactionDetails.explanation && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Explanation</Text>
                  <Text style={[styles.addressText, isDark && styles.textLight]} numberOfLines={showFullExplanation ? undefined : 3}>
                    {showFullExplanation
                      ? transactionDetails.explanation
                      : getShortExplanation(transactionDetails.explanation)}
                  </Text>
                  {transactionDetails.explanation.length > 120 && (
                    <TouchableOpacity onPress={() => setShowFullExplanation(v => !v)}>
                      <Text style={{ color: '#ae1cff', marginTop: 4, fontWeight: '500' }}>
                        {showFullExplanation ? 'Show less' : 'Show more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {transactionDetails.amount &&  (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Amount</Text>
                  <View style={styles.amountContainer}>
                    <Text style={[styles.amountText, isDark && styles.textLight]}>
                      {transactionDetails.amount} {transactionDetails.tokenSymbol}
                    </Text>
                  </View>
                </View>
              )}
              {transactionDetails.to && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>To</Text>
                  <View style={styles.addressContainer}>
                    <Text style={[styles.addressText, isDark && styles.textLight]} numberOfLines={1} ellipsizeMode="middle">
                      {transactionDetails.to}
                    </Text>
                  </View>
                </View>
              )}
              {/* Network Fee Section */}
              {transactionDetails.network && transactionDetails.network.toLowerCase() === 'solana' ? (
                <>
                  {/* <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textLight]}>Compute Units</Text>
                    <View style={styles.gasContainer}>
                      <Text style={[styles.gasText, isDark && styles.textLight]}>
                        {transactionDetails.estimatedGas || '150000'} 
                      </Text>
                    </View>
                  </View> */}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textLight]}>Gas Price</Text>
                    <View style={styles.gasContainer}>
                      <Text style={[styles.gasText, isDark && styles.textLight]}>
                        {transactionDetails.estimatedFee}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
              {transactionDetails.estimatedGas && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Estimated Gas</Text>
                  <View style={styles.gasContainer}>
                    <Text style={[styles.gasText, isDark && styles.textLight]}>
                      {transactionDetails.estimatedGas}
                    </Text>
                  </View>
                </View>
              )}
              {transactionDetails.estimatedFee && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDark && styles.textLight]}>Estimated Fee</Text>
                  <View style={styles.gasContainer}>
                    <Text style={[styles.gasText, isDark && styles.textLight]}>
                      {transactionDetails.estimatedFee}
                    </Text>
                  </View>
                </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.confirmButton]} 
              onPress={handleConfirmTransaction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Confirm</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButtonStyle]} 
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  containerDark: {
    backgroundColor: '#1A1A1A',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    maxHeight: '70%',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#2A2A2A',
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  networkIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amountContainer: {
    marginTop: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addressContainer: {
    marginTop: 4,
  },
  addressText: {
    fontSize: 16,
  },
  gasContainer: {
    marginTop: 4,
  },
  gasText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButtonStyle: {
    backgroundColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#8A2BE2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  textLight: {
    color: '#ffffff',
  },
});

export default TransactionPreviewModal;