import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTransak } from '../contexts/TransakContext';

interface BuyCryptoButtonProps {
  isConnected: boolean;
  address: string | null;
  selectedNetwork: string;
}

/**
 * BuyCryptoButton - A button component that opens the Transak widget
 * 
 * This component handles the logic for opening the Transak widget when a user
 * wants to buy crypto. It checks if the wallet is connected and passes the
 * appropriate parameters to the Transak widget.
 */
const BuyCryptoButton: React.FC<BuyCryptoButtonProps> = ({
  isConnected,
  address,
  selectedNetwork
}) => {
  // Get the Transak context
  const transak = useTransak();

  // Handle button press
  const handlePress = () => {
    if (isConnected && address) {
      // Format the network name for Transak
      let network = selectedNetwork.toLowerCase();
      if (network === 'all') {
        network = 'ethereum'; // Default to Ethereum if 'All' is selected
      }
      
      // Open Transak widget
      console.log('Opening Transak widget with these:', {
        walletAddress: address,
        defaultCryptoCurrency: 'ETH',
        defaultFiatAmount: '100',
        defaultFiatCurrency: 'USD',
        isBuy: true,
        network
      });
      transak.openTransak({
        walletAddress: address,
        defaultCryptoCurrency: 'ETH',
        defaultFiatAmount: '100',
        defaultFiatCurrency: 'USD',
        isBuy: true,
        network
      });
    } else {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to buy crypto.');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        !isConnected && styles.buttonDisabled
      ]}
      onPress={handlePress}
      disabled={!isConnected}
    >
      <Text style={styles.buttonText}>Buy Crypto</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8A2BE2', // Purple color
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginVertical: 16,
    alignSelf: 'center',
    minWidth: 150,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4A4A4A', // Darker color when disabled
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default BuyCryptoButton;
