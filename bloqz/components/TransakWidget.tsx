import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import {
  TransakWebView,
  Environments,
  Events,
  TransakConfig,
  EventTypes,
  Order,
} from '@transak/react-native-sdk';
import { apiService } from '../services/api.service';

export interface TransakWidgetProps {
  isVisible: boolean;
  onClose: () => void;
  onOrderComplete?: (transactionData: any) => void;
  walletAddress: string;
  defaultCryptoCurrency?: string;
  defaultFiatAmount?: string;
  defaultFiatCurrency?: string;
  isBuy?: boolean;
  network?: string;
  messageId?: string; // Add message ID for tracking
}

/**
 * TransakWidget - A component that provides crypto on/off-ramp functionality
 * 
 * This component uses the Transak SDK to enable users to buy or sell cryptocurrency
 * directly within the app. It handles all the KYC, payment processing, and crypto
 * transfers through the Transak service.
 */
const TransakWidget: React.FC<TransakWidgetProps> = ({
  isVisible,
  onClose,
  onOrderComplete,
  walletAddress,
  defaultCryptoCurrency = 'ETH',
  defaultFiatAmount = '100',
  defaultFiatCurrency = 'USD',
  isBuy = true,
  network,
  messageId, // Message ID for tracking the transaction
}) => {
  // Generate a unique order ID for tracking
  const partnerOrderId = `BLOQZ-${Date.now()}`;
  
  // Configure Transak
  const transakConfig: TransakConfig = {
    apiKey: 'b9704b22-eb27-4c3c-a209-19fc71470cb0', //'7d45cd62-e78f-4689-bf6a-c13adf7a1d50', // this is for production
    environment: Environments.STAGING, // Use PRODUCTION for live app
    defaultCryptoCurrency,
    defaultFiatAmount: Number(defaultFiatAmount), // Convert to number to fix type error
    defaultFiatCurrency,
    walletAddress,
    exchangeScreenTitle: isBuy ? 'Fund Wallet with Bloqz' : 'Sell Crypto with Bloqz',
    hideMenu: true,
    productsAvailed: isBuy ? 'BUY' : 'SELL',
    partnerOrderId,
    themeColor: '#ae1cff',
    colorMode: 'DARK',
    // If network is specified, use it
    ...(network && { network }),
  };

  // Handle Transak events
  const onTransakEventHandler = async (event: EventTypes, data: Order) => {
    console.log('Transak event:', event, data);
    
    switch(event) {
      case Events.ORDER_CREATED:
        console.log('Order created:', data);
        break;

      case Events.ORDER_PROCESSING:
        console.log('Order processing:', data);
        break;

      case Events.ORDER_COMPLETED:
        console.log('Order completed:', data);
        
        // ✅ NEW: Track transaction in backend database
        if (messageId) {
          try {
            const trackingResponse = await apiService.trackTransaction({
              messageId: messageId,
              transactionHash: (data as any).transactionHash || data.id || partnerOrderId,
              network: (data as any).network || network || 'ethereum',
              from: walletAddress,
              to: (data as any).walletAddress || walletAddress,
              amount: (data as any).cryptoAmount || (data as any).amount || '0',
              tokenSymbol: (data as any).cryptoCurrency || defaultCryptoCurrency,
              gasUsed: undefined, // Not available from Transak
              blockNumber: undefined, // Not available from Transak
              status: 'success',
              transactionType: isBuy ? 'buy' : 'sell'
            });
            console.log('✅ Transak transaction tracked in backend database');
            
            // ✅ NEW: Get enhanced transaction data for sharing with achievements
            if (trackingResponse) {
              const enhancedData = (trackingResponse as any).data;
              console.log('✅ Enhanced Transak transaction data received:', {
                hasAchievement: !!enhancedData.achievement,
                hasUserStats: !!enhancedData.userStats,
                hasSocialProof: !!enhancedData.socialProof,
                personalizedMessage: enhancedData.personalizedMessage
              });
            }
          } catch (trackingError) {
            console.warn('⚠️ Transak transaction completed but tracking failed:', trackingError);
            // Don't fail the transaction if tracking fails - transaction was successful
          }
        } else {
          console.warn('⚠️ No messageId provided for Transak transaction tracking');
        }
        
        // Create transaction data for share card
        const transactionData = {
          type: isBuy ? 'buy' : 'sell',
          amount: (data as any).cryptoAmount || (data as any).amount || '0',
          tokenSymbol: (data as any).cryptoCurrency || defaultCryptoCurrency,
          network: (data as any).network || network || 'ethereum',
          to: (data as any).walletAddress || walletAddress,
          hash: (data as any).transactionHash || data.id || partnerOrderId,
          status: 'success',
          timestamp: Date.now(),
          // Add Transak-specific data
          fiatAmount: (data as any).fiatAmount,
          fiatCurrency: (data as any).fiatCurrency,
          orderId: data.id,
          partnerOrderId: partnerOrderId
        };
        
        // Call the onOrderComplete callback with transaction data
        if (onOrderComplete) {
          onOrderComplete(transactionData);
        }
        break;

      case Events.ORDER_FAILED:
        console.log('Order failed:', data);
        
        // Track failed transaction if we have messageId
        if (messageId) {
          try {
            const trackingResponse = await apiService.trackTransaction({
              messageId: messageId,
              transactionHash: (data as any).transactionHash || data.id || partnerOrderId,
              network: (data as any).network || network || 'ethereum',
              from: walletAddress,
              to: (data as any).walletAddress || walletAddress,
              amount: (data as any).cryptoAmount || (data as any).amount || '0',
              tokenSymbol: (data as any).cryptoCurrency || defaultCryptoCurrency,
              gasUsed: undefined,
              blockNumber: undefined,
              status: 'failed',
              transactionType: isBuy ? 'buy' : 'sell'
            });
            console.log('❌ Failed Transak transaction tracked in backend database');
            
            // ✅ NEW: Get enhanced transaction data for failed transactions too
            if (trackingResponse) {
              const enhancedData = (trackingResponse as any).data;
              console.log('✅ Enhanced failed Transak transaction data received:', {
                hasAchievement: !!enhancedData.achievement,
                hasUserStats: !!enhancedData.userStats,
                hasSocialProof: !!enhancedData.socialProof,
                personalizedMessage: enhancedData.personalizedMessage
              });
            }
          } catch (trackingError) {
            console.warn('⚠️ Failed to track failed Transak transaction:', trackingError);
          }
        }
        break;

      default:
        console.log('Other event:', event, data);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isBuy ? 'Buy Crypto with Bloqz' : 'Sell Crypto with Bloqz'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.webViewContainer}>
          <TransakWebView
            transakConfig={transakConfig}
            onTransakEvent={onTransakEventHandler}
            style={styles.webView}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40, // Same width as close button for balanced header
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default TransakWidget;
