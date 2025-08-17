import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '../theme/ThemeProvider';
import { useTransak } from '../contexts/TransakContext';
import { apiService } from '../services/api.service';
import { useAppKitAccount, useAppKitProvider, useDisconnect } from "@reown/appkit-ethers5-react-native";

// Define BlockchainNetwork enum since we don't have access to the original model
enum BlockchainNetwork {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  BASE = 'base',
  SOLANA = 'solana',
}

interface TransactionDetails {
  to?: string;
  amount?: string;
  network: string;
  tokenSymbol?: string;
  gasEstimate?: string;
  gasPrice?: string;
  data?: any;
  nonce?: number;
  responseType?: string;
  explanation?: string;
  transakParams?: {
    walletAddress: string | null;
    defaultCryptoCurrency: string;
    defaultFiatAmount: string;
    defaultFiatCurrency: string;
    isBuy: boolean;
    network: string;
  };
}

export default function TransactionPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && require('react-native').useColorScheme() === 'dark');
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider();
  const { disconnect } = useDisconnect();

  const { handleBackendResponse } = useTransak();
  
  // // Define the transaction functions we need
  // const sendTransaction = async (txData: any) => {
  //   // Implementation will be added later
  //   console.log('Sending transaction:', txData);
  //   return { success: false, error: 'Not implemented yet', hash: '' };
  // };

  const sendTransaction = async (txData: any) => {
    if (!isConnected || !walletProvider) {
      return { success: false, error: 'Wallet not connected', hash: '' };
    }
  
    try {
      console.log('Sending transaction:', txData);
      
      // For EVM transactions, we need to sign and send
      if (txData.network !== 'solana') {
        // Create the transaction object for signing
        const transaction = {
          to: txData.to,
          value: txData.value || '0x0',
          data: txData.data || '0x',
          gasLimit: txData.gasLimit || '21000',
          gasPrice: txData.gasPrice || '0x',
        };
  
        console.log('Transaction object:', transaction);
  
        // Sign the transaction using the wallet provider
        const signedTransaction = await walletProvider.request({
          method: 'eth_signTransaction',
          params: [transaction],
        });
  
        console.log('Transaction signed:', signedTransaction);
  
        // Type assertion to convert unknown to string
        const signedTxString = signedTransaction as string;
  
        // Send the signed transaction to the backend for execution
        const result = await apiService.executeTransaction(
          txData.network, 
          signedTxString
        );
        
        if (result.success) {
          return { success: true, hash: result.transactionHash || '', error: '' };
        } else {
          return { success: false, error: result.error || 'Backend execution failed', hash: '' };
        }
      } else {
        // For Solana transactions, we need different handling
        return { success: false, error: 'Solana transactions not yet implemented', hash: '' };
      }
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send transaction', 
        hash: '' 
      };
    }
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [totalFee, setTotalFee] = useState<string | null>(null);
  
  // Get transaction details from route params
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  
  // Function to estimate gas for the transaction
  const estimateGas = async (txData: TransactionDetails) => {
    setIsLoading(true);
    try {
      // This would be replaced with actual gas estimation logic
      // For now, we'll just simulate it with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock gas estimation
      setGasEstimate('0.0021');
      setTotalFee('$3.42');
    } catch (error) {
      console.error('Error estimating gas:', error);
      Alert.alert('Error', 'Failed to estimate gas for this transaction');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to get transaction title based on type
  const getTransactionTitle = () => {
    if (!transactionDetails) return 'Transaction Preview';
    
    switch (transactionDetails.responseType) {
      case 'SEND':
        return 'Send Transaction';
      case 'SWAP':
        return 'Swap Transaction';
      case 'STAKE':
        return 'Stake Transaction';
      case 'UNSTAKE':
        return 'Unstake Transaction';
      case 'APPROVE':
        return 'Approve Transaction';
      default:
        return 'Transaction Preview';
    }
  };
  
  useEffect(() => {
    // Parse transaction data from params
    if (params.data) {
      try {
        const txData = JSON.parse(decodeURIComponent(params.data as string));
        setTransactionDetails(txData);
        
        // If this is a Transak transaction, handle it immediately
        if (txData.responseType === 'TRANSAK' && txData.transakParams) {
          handleBackendResponse(txData);
          // Navigate back after a short delay
          setTimeout(() => {
            router.back();
          }, 500);
        } else {
          console.log('[TransactionPreview] 🛑🛑 Initial transaction data from backend:', txData);
          // For other transaction types, estimate gas
          estimateGas(txData);
        }
      } catch (error) {
        console.error('Error parsing transaction data:', error);
        Alert.alert('Error', 'Failed to parse transaction data');
      }
    }
    }, [params.data]);
  
  useEffect(() => {
    // Calculate gas estimate and total fee
    const calculateGas = async () => {
      if (!transactionDetails || transactionDetails.responseType === 'TRANSAK') return;
      
      setIsLoading(true);
      
      try {
        // In a real app, you would call a service to estimate gas
        // This is a placeholder
        setTimeout(() => {
          const estimatedGas = '21000';
          const gasPrice = '50';
          const totalFeeValue = (parseInt(estimatedGas) * parseInt(gasPrice) / 1e9).toFixed(6);
          
          setGasEstimate(estimatedGas);
          setTotalFee(totalFeeValue);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error estimating gas:', error);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to estimate transaction fee');
      }
    };
    
    calculateGas();
  }, [transactionDetails]);
  
  const handleConfirmTransaction = async () => {
    if (!transactionDetails) return;
    
    setIsConfirming(true);
    
    try {
      // Create transaction object based on the network
      const transaction = {
        to: transactionDetails.to,
        value: transactionDetails.amount,
        data: transactionDetails.data || '0x',
        gasLimit: gasEstimate || '21000',
        gasPrice: transactionDetails.gasPrice || '50',
      };
      
      // Send the transaction
      const result = await sendTransaction(transaction);
      
      setIsConfirming(false);
      
      if (result.success) {
        Alert.alert(
          'Transaction Sent',
          `Your transaction has been submitted to the network.\n\nTransaction Hash: ${result.hash}`,
          [
            {
              text: 'View on Explorer',
              onPress: () => {
                // Open transaction in block explorer
                const explorerUrl = getBlockExplorerUrl(transactionDetails.network, result.hash as string);
                // You would need to implement opening URLs in React Native
                console.log('Open explorer:', explorerUrl);
              },
            },
            {
              text: 'OK',
              onPress: () => router.push('/transaction-history'),
            },
          ]
        );
      } else {
        Alert.alert('Transaction Failed', result.error || 'Failed to send transaction');
      }
    } catch (error) {
      console.error('Error sending transaction:', error);
      setIsConfirming(false);
      Alert.alert('Error', 'An unexpected error occurred while sending your transaction');
    }
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  if (!transactionDetails) {
    return (
      <ThemedView style={styles.container}>
        <Text style={[styles.errorText, isDark && styles.textLight]}>
          No transaction details provided
        </Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Helper function to get network icon
  const getNetworkIcon = (network: string) => {
    switch (network.toLowerCase()) {
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
  
  // If this is a Transak transaction, we don't need to show the preview
  // as it will be handled by the Transak widget
  if (transactionDetails.responseType === 'TRANSAK') {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#ae1cff" />
        <Text style={[styles.loadingText, isDark && styles.textLight]}>
          Opening {transactionDetails.transakParams?.isBuy ? 'buy' : 'sell'} interface...
        </Text>
      </ThemedView>
    );
  }
  
  return (
    <ScrollView 
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>
          {getTransactionTitle()}
        </Text>
      </View>
      
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.networkContainer}>
          <Image 
            source={getNetworkIcon(transactionDetails.network)}
            style={styles.networkIcon}
          />
          <Text style={[styles.networkName, isDark && styles.textLight]}>
            {transactionDetails.network.charAt(0).toUpperCase() + transactionDetails.network.slice(1)}
          </Text>
        </View>
        
        {transactionDetails.amount && transactionDetails.tokenSymbol && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDark && styles.textLight]}>Sending</Text>
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
            <Text style={[styles.addressText, isDark && styles.textLight]} numberOfLines={1} ellipsizeMode="middle">
              {transactionDetails.to}
            </Text>
          </View>
        )}
        
        {transactionDetails.explanation && (
          <View style={styles.detailRow}>
            <Text style={[styles.explanationText, isDark && styles.textLight]}>
              {transactionDetails.explanation}
            </Text>
          </View>
        )}
        
        <View style={styles.divider} />
        
        <View style={styles.feeContainer}>
          <Text style={[styles.feeTitle, isDark && styles.textLight]}>Network Fee</Text>
          
          {isLoading ? (
            <ActivityIndicator size="small" color="#ae1cff" />
          ) : (
            <>
              <View style={styles.feeDetailRow}>
                <Text style={[styles.feeLabel, isDark && styles.textLightSecondary]}>Gas Limit</Text>
                <Text style={[styles.feeValue, isDark && styles.textLight]}>
                  {gasEstimate || '21000'}
                </Text>
              </View>
              
              <View style={styles.feeDetailRow}>
                <Text style={[styles.feeLabel, isDark && styles.textLightSecondary]}>Gas Price</Text>
                <Text style={[styles.feeValue, isDark && styles.textLight]}>
                  {transactionDetails.gasPrice || '50'} Gwei
                </Text>
              </View>
              
              <View style={styles.feeDetailRow}>
                <Text style={[styles.feeTotalLabel, isDark && styles.textLight]}>Total Fee</Text>
                <Text style={[styles.feeTotalValue, isDark && styles.textLight]}>
                  {totalFee || '0.00105'} {transactionDetails.network.toLowerCase() === 'solana' ? 'SOL' : 'ETH'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isConfirming}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmTransaction}
          disabled={isLoading || isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  networkIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    maxWidth: '70%',
  },
  explanationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  feeContainer: {
    marginTop: 4,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  feeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  feeTotalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginTop: 8,
  },
  feeTotalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ae1cff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 24,
  },
  textLight: {
    color: '#ffffff',
  },
  textLightSecondary: {
    color: '#aaaaaa',
  },
});
