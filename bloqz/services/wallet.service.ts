// wallet.service.ts
export enum BlockchainNetwork {
  ETHEREUM = 'Ethereum',
  POLYGON = 'Polygon',
  ARBITRUM = 'Arbitrum',
  OPTIMISM = 'Optimism',
  AVALANCHE = 'Avalanche',
  SOLANA = 'Solana',
  BITCOIN = 'Bitcoin'
}

export interface WalletContact {
  id: string;
  name: string;
  address: string;
  network: BlockchainNetwork;
  notes?: string;
  isFavorite: boolean;
}

// Add a method to get the current wallet address from storage
export const getCurrentWalletAddress = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('current_wallet_address');
  } catch (error) {
    console.error('Error getting current wallet address:', error);
    return null;
  }
};

// Add a method to set the current wallet address in storage
export const setCurrentWalletAddress = async (address: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('current_wallet_address', address);
    console.log('✅ [Wallet Service] Current wallet address stored:', address);
  } catch (error) {
    console.error('Error storing current wallet address:', error);
  }
};

// Add a method to clear the current wallet address
export const clearCurrentWalletAddress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('current_wallet_address');
    console.log('✅ [Wallet Service] Current wallet address cleared');
  } catch (error) {
    console.error('Error clearing current wallet address:', error);
  }
};
