import React, { createContext, useContext, useState, ReactNode } from 'react';
import TransakWidget from '../components/TransakWidget';

// Define the transaction data type for share cards
interface TransactionData {
  type: 'buy' | 'sell';
  amount: string;
  tokenSymbol: string;
  network: string;
  to: string;
  hash: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: number;
  fiatAmount?: string;
  fiatCurrency?: string;
  orderId?: string;
  partnerOrderId?: string;
}

// Define the backend Transak response type
interface TransakBackendResponse {
  id: string;
  params: any;
  transakParams: {
    walletAddress: string | null;
    defaultCryptoCurrency: string;
    defaultFiatAmount: string;
    defaultFiatCurrency: string;
    isBuy: boolean;
    network: string;
  };
  explanation: string;
  createdAt: string;
  responseType: 'TRANSAK';
}

// Define the context type
interface TransakContextType {
  showTransak: boolean;
  transakParams: {
    walletAddress: string;
    defaultCryptoCurrency: string;
    defaultFiatAmount: string;
    defaultFiatCurrency: string;
    isBuy: boolean;
    network?: string;
    messageId?: string; // Add message ID for tracking
  };
  openTransak: (params: {
    walletAddress: string;
    defaultCryptoCurrency?: string;
    defaultFiatAmount?: string;
    defaultFiatCurrency?: string;
    isBuy?: boolean;
    network?: string;
    messageId?: string; // Add message ID parameter
  }) => void;
  closeTransak: () => void;
  handleOrderComplete: (transactionData: TransactionData) => void;
  handleBackendResponse: (response: TransakBackendResponse, messageId?: string) => void;
  // Add global callback registration
  registerOrderCompleteCallback: (callback: (transactionData: TransactionData) => void) => void;
  unregisterOrderCompleteCallback: () => void;
}

// Create the context
const TransakContext = createContext<TransakContextType | undefined>(undefined);

// Props for the provider component
interface TransakProviderProps {
  children: ReactNode;
  onOrderComplete?: (transactionData: TransactionData) => void;
}

/**
 * TransakProvider - Context provider for managing Transak widget state
 * 
 * This provider makes it easy to open the Transak widget from anywhere in your app,
 * including from your natural language processing service responses.
 */
export const TransakProvider: React.FC<TransakProviderProps> = ({ 
  children,
  onOrderComplete 
}) => {
  // State for controlling the widget visibility and parameters
  const [showTransak, setShowTransak] = useState(false);
  const [transakParams, setTransakParams] = useState({
    walletAddress: '',
    defaultCryptoCurrency: 'ETH',
    defaultFiatAmount: '100',
    defaultFiatCurrency: 'USD',
    isBuy: true,
    network: undefined as string | undefined,
    messageId: undefined as string | undefined, // Add message ID state
  });

  // Global callback for order completion
  const [orderCompleteCallback, setOrderCompleteCallback] = useState<((transactionData: TransactionData) => void) | null>(null);

  // Register callback function
  const registerOrderCompleteCallback = (callback: (transactionData: TransactionData) => void) => {
    setOrderCompleteCallback(() => callback);
  };

  // Unregister callback function
  const unregisterOrderCompleteCallback = () => {
    setOrderCompleteCallback(null);
  };

  // Function to open the Transak widget with specified parameters
  const openTransak = (params: {
    walletAddress: string;
    defaultCryptoCurrency?: string;
    defaultFiatAmount?: string;
    defaultFiatCurrency?: string;
    isBuy?: boolean;
    network?: string;
    messageId?: string; // Add message ID parameter
  }) => {
    if (!params.walletAddress) {
      console.error('Wallet address is required to open Transak');
      return;
    }

    setTransakParams({
      walletAddress: params.walletAddress,
      defaultCryptoCurrency: params.defaultCryptoCurrency || 'ETH',
      defaultFiatAmount: params.defaultFiatAmount || '100',
      defaultFiatCurrency: params.defaultFiatCurrency || 'USD',
      isBuy: params.isBuy !== undefined ? params.isBuy : true,
      network: params.network,
      messageId: params.messageId, // Store message ID for tracking
    });
    
    setShowTransak(true);
  };

  // Function to close the Transak widget
  const closeTransak = () => {
    setShowTransak(false);
  };

  // Handle order completion with transaction data
  const handleOrderComplete = (transactionData: TransactionData) => {
    console.log('✅ Transak order completed:', transactionData);
    
    // Close the widget when order is complete
    closeTransak();
    
    // Call the registered callback if available
    if (orderCompleteCallback) {
      orderCompleteCallback(transactionData);
    }
    
    // Call the external handler if provided
    if (onOrderComplete) {
      onOrderComplete(transactionData);
    }
  };
  
  // Handle backend response with Transak parameters
  const handleBackendResponse = (response: TransakBackendResponse, messageId?: string) => {
    if (response.responseType === 'TRANSAK' && response.transakParams) {
      // Extract parameters from the backend response
      const params = response.transakParams;
      
      // Open the Transak widget with the parameters from the backend
      if (params.walletAddress) {
        openTransak({
          walletAddress: params.walletAddress,
          defaultCryptoCurrency: params.defaultCryptoCurrency,
          defaultFiatAmount: params.defaultFiatAmount,
          defaultFiatCurrency: params.defaultFiatCurrency,
          isBuy: params.isBuy,
          network: params.network,
          messageId: messageId // Pass message ID for tracking
        });
        return true;
      } else {
        console.error('Wallet address is required to open Transak');
      }
    }
    return false;
  };

  return (
    <TransakContext.Provider
      value={{
        showTransak,
        transakParams,
        openTransak,
        closeTransak,
        handleOrderComplete,
        handleBackendResponse,
        registerOrderCompleteCallback,
        unregisterOrderCompleteCallback,
      }}
    >
      {children}
      
      {/* Render the TransakWidget here so it's available globally */}
      <TransakWidget
        isVisible={showTransak}
        onClose={closeTransak}
        onOrderComplete={handleOrderComplete}
        walletAddress={transakParams.walletAddress}
        defaultCryptoCurrency={transakParams.defaultCryptoCurrency}
        defaultFiatAmount={transakParams.defaultFiatAmount}
        defaultFiatCurrency={transakParams.defaultFiatCurrency}
        isBuy={transakParams.isBuy}
        network={transakParams.network}
        messageId={transakParams.messageId} // Pass message ID to widget
      />
    </TransakContext.Provider>
  );
};

/**
 * useTransak - Hook to access the Transak context
 * 
 * Use this hook in your components to open/close the Transak widget
 * and access other Transak-related functionality.
 */
export const useTransak = (): TransakContextType => {
  const context = useContext(TransakContext);
  
  if (context === undefined) {
    throw new Error('useTransak must be used within a TransakProvider');
  }
  
  return context;
};
