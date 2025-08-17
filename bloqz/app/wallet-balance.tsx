import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Easing,
  Animated,
  RefreshControl,
  ToastAndroid,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAppKitAccount } from "@reown/appkit-ethers5-react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTransak } from '../contexts/TransakContext';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/ThemeProvider';
import { apiService } from '@/services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import BuyCryptoButton from '../components/BuyCryptoButton';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePrivy, getUserEmbeddedEthereumWallet, getUserEmbeddedSolanaWallet } from '@privy-io/expo';
import * as Clipboard from 'expo-clipboard';
import ReceiveModal from '../components/ReceiveModal';

// Token balance type definition
interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  balanceUSD: string;
  change24h: number;
  logoUrl?: string;
  address?: string;
  priceUSD?: number;
}

// Helper to truncate long strings in the middle
function truncateMiddle(str: string, maxLength: number) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  const keep = Math.floor((maxLength - 3) / 2);
  return str.slice(0, keep) + '...' + str.slice(-keep);
}

interface ApiResponse {
  balances: Array<{
    token: string;
    symbol: string;
    balance: string;
    decimals: number;
    address: string;
    logo_url?: string;
    priceUSD?: number;
    balanceUSD?: string;
    change24h?: number;
    isNative?: boolean;
  }>;
}

export default function WalletBalanceScreen() {
  // const { address, isConnected } = useWalletConnectModal();
  const { address, isConnected } = useAppKitAccount();
  const { currentTheme } = useTheme();
  const { user: privyUser } = usePrivy();
  const privyEvmAddress = getUserEmbeddedEthereumWallet(privyUser)?.address;
  const privySolanaAddress = getUserEmbeddedSolanaWallet(privyUser)?.address;
  
  // State
  const [selectedNetwork, setSelectedNetwork] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [privyEvmBalances, setPrivyEvmBalances] = useState<TokenBalance[]>([]);
  const [privySolanaBalances, setPrivySolanaBalances] = useState<TokenBalance[]>([]);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  // Animation values for refresh button
  const rotateAnimation = React.useRef(new Animated.Value(0)).current;
  
  // Available networks
  const networks = ['All', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Solana'];
  
  // Mock token balances for fallback
  const mockTokenBalances: TokenBalance[] = [
    {
      id: 'ETH',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '0',
      balanceUSD: '0.00',
      change24h: 0,
      logoUrl: 'https://www.datocms-assets.com/86369/1669619533-ethereum.png'
    },
    {
      id: 'USDC',
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '0',
      balanceUSD: '0.00',
      change24h: 0,
      logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      id: 'USDT',
      symbol: 'USDT',
      name: 'Tether',
      balance: '0',
      balanceUSD: '0.00',
      change24h: 0,
      logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
    }
  ];
  
  // Add a loading counter to track both fetches
  const [loadingCount, setLoadingCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Fetch token balances when wallet is connected or when network changes
  useEffect(() => {
    if (isConnected && !isConnecting) {
      console.log('[WalletBalance] useEffect: isConnected, calling fetchTokenBalances with', selectedNetwork);
      setIsConnecting(true);
      // Add delay to prevent crash from simultaneous API calls
      setTimeout(() => {
        setLoadingCount(count => count + 1);
        fetchTokenBalances(selectedNetwork).finally(() => {
          setLoadingCount(count => Math.max(0, count - 1));
          setIsConnecting(false);
        });
      }, 1500); // 1.5 second delay to let wallet connection stabilize
    } else {
      setTokenBalances([]);
    }
  }, [isConnected, selectedNetwork]);
  
  // Fetch Privy balances (EVM and Solana) when network changes
  useEffect(() => {
    // Only fetch Privy balances if not in the middle of wallet connection
    if (!isConnecting) {
      setLoadingCount(count => count + 1);
      const fetchPrivyBalances = async (network: string) => {
        console.log('[WalletBalance] fetchPrivyBalances START', network);
        // Helper to fetch balances for a given network and address
        const fetchBalances = async (networkKey: string, address: string | undefined, setter: (b: any[]) => void) => {
          if (!address) {
            setter([]);
            return;
          }
          try {
            const resp: any = await apiService.getWalletBalances(networkKey, address);
            let balances: any[] = [];
            if (Array.isArray(resp)) {
              balances = resp;
            } else if (resp && Array.isArray(resp.balances)) {
              balances = resp.balances;
            } else if (resp && resp.data && Array.isArray(resp.data.balances)) {
              balances = resp.data.balances;
            }
            console.log(`[WalletBalance] fetchBalances for ${networkKey} (${address}):`, balances);
            setter(balances);
          } catch (e) {
            console.log(`[WalletBalance] fetchBalances ERROR for ${networkKey} (${address}):`, e);
            setter([]);
          }
        };
        if (network === 'All') {
          await fetchBalances('ethereum', privyEvmAddress, setPrivyEvmBalances);
          await fetchBalances('solana', privySolanaAddress, setPrivySolanaBalances);
        } else if (network === 'Solana') {
          await fetchBalances('solana', privySolanaAddress, setPrivySolanaBalances);
          setPrivyEvmBalances([]);
        } else {
          await fetchBalances(network.toLowerCase(), privyEvmAddress, setPrivyEvmBalances);
          setPrivySolanaBalances([]);
        }
        console.log('[WalletBalance] fetchPrivyBalances END', network);
      };
      fetchPrivyBalances(selectedNetwork).finally(() => {
        setLoadingCount(count => Math.max(0, count - 1));
      });
    }
  }, [privyEvmAddress, privySolanaAddress, selectedNetwork, isConnecting]);
  
  // Effect to update isLoading based on loadingCount
  useEffect(() => {
    setIsLoading(loadingCount > 0);
  }, [loadingCount]);
  
  // Reset connection state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setIsConnecting(false);
      setTokenBalances([]);
      setPrivyEvmBalances([]);
      setPrivySolanaBalances([]);
    }
  }, [isConnected]);
  
  // Start rotation animation for refresh button
  const startRotateAnimation = () => {
    rotateAnimation.setValue(0);
    Animated.timing(rotateAnimation, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };
  
  // Function to fetch token balances from connected wallet
  const fetchTokenBalances = async (network: string) => {
    console.log('[WalletBalance] fetchTokenBalances START', network);
    if (!isConnected || !address || isConnecting) {
      console.log('[WalletBalance] Skipping fetch - not connected, no address, or connecting');
      return;
    }
    
    startRotateAnimation();
    try {
      let balances: any[] = [];
      if (network === 'All') {
        const evmNetworks = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
        let allBalances: any[] = [];
        
        // Add delay between network calls to prevent overwhelming the API
        for (const net of evmNetworks) {
          try {
            if (!isConnected) break; // Stop if wallet disconnected during fetch
            
            const resp: any = await apiService.getWalletBalances(net, address);
            if (Array.isArray(resp)) {
              allBalances = allBalances.concat(resp);
            } else if (resp && Array.isArray(resp.balances)) {
              allBalances = allBalances.concat(resp.balances);
            } else if (resp && resp.data && Array.isArray(resp.data.balances)) {
              allBalances = allBalances.concat(resp.data.balances);
            }
            
            // Small delay between network calls
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) {
            console.log(`[WalletBalance] Error fetching ${net} balances:`, e);
            // Continue with other networks even if one fails
          }
        }
        balances = allBalances;
      } else {
        try {
          const resp: any = await apiService.getWalletBalances(network.toLowerCase(), address);
          if (Array.isArray(resp)) {
            balances = resp;
          } else if (resp && Array.isArray(resp.balances)) {
            balances = resp;
          } else if (resp && resp.data && Array.isArray(resp.data.balances)) {
            balances = resp;
          }
        } catch (e) {
          console.log(`[WalletBalance] Error fetching ${network} balances:`, e);
          balances = [];
        }
      }
      
      if (isConnected) { // Only update state if still connected
        setTokenBalances(balances);
      }
    } catch (error) {
      console.error('[WalletBalance] fetchTokenBalances error:', error);
      if (isConnected) {
        setTokenBalances([]);
      }
    }
  };
  
  // Unify wallet presence
  const hasAnyWallet = (isConnected && address) || privyEvmAddress || privySolanaAddress;

  // Merge all token balances into a single list
  const allTokenBalances = [
    ...(tokenBalances || []),
    ...(privyEvmBalances || []),
    ...(privySolanaBalances || [])
  ];

  // Network filter
  const filteredTokens = allTokenBalances;

  // Calculate total balance across all wallets (filtered)
  const totalBalanceUSD = filteredTokens.reduce(
    (sum, token) => sum + parseFloat(token.balanceUSD || '0'),
    0
  );

  // For actions like Buy Crypto, use the first available wallet address
  const firstWalletAddress = address || privyEvmAddress || privySolanaAddress || null;
  
  // Rotation interpolation for refresh button
  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Unified renderTokenItem with guards for undefined values
  const renderTokenItem = ({ item }: { item: TokenBalance }) => (
    <View style={styles.tokenCard}>
      <View style={styles.tokenInfo}>
        <View style={[styles.tokenIcon, { backgroundColor: currentTheme.primary + '40' }]}> 
          {item.logoUrl ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="normal"
              placeholder={require('../assets/images/icon.png')}
              onError={() => {/* Optionally handle error, fallback to letter */}}
            />
          ) : (
            <Text style={{ fontSize: 16, color: '#FFFFFF' }}>{item.symbol?.charAt(0) || '?'}</Text>
          )}
        </View>
        <View style={styles.tokenDetails}>
          <Text style={[styles.tokenSymbol, { color: '#FFFFFF' }]}>{item.symbol}</Text>
          <View style={{ maxWidth: 120, flexShrink: 1 }}>
            <Text
              style={[styles.tokenName, { color: 'rgba(255, 255, 255, 0.7)', flexShrink: 1 }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {truncateMiddle(item.name, 10)}
            </Text>
          </View>
          {item.priceUSD !== undefined && (
            <Text style={{ color: '#aaa', fontSize: 12 }}>
              ${typeof item.priceUSD === 'number' ? item.priceUSD.toFixed(2) : Number(item.priceUSD || 0).toFixed(2)} (current price)
            </Text>
          )}
        </View>
      </View>
      <View style={styles.tokenBalance}>
        <Text style={[styles.tokenBalanceText, { color: '#FFFFFF' }]}> 
          {item.balance} {item.symbol}
        </Text>
        <Text style={[styles.tokenBalanceUSD, { color: 'rgba(255, 255, 255, 0.7)' }]}> 
          ${item.balanceUSD !== undefined ? Number(item.balanceUSD).toFixed(2) : '0.00'}
        </Text>
        <Text 
          style={[
            styles.tokenChange, 
            { color: item.change24h !== undefined && item.change24h >= 0 ? '#4CAF50' : '#F44336' }
          ]}
        >
          {item.change24h !== undefined ? (item.change24h >= 0 ? '+' : '') + item.change24h.toFixed(2) + '%' : ''}
        </Text>
      </View>
    </View>
  );
  
  // Helper to get the correct wallet address for the selected network
  function getWalletAddressForNetwork(selectedNetwork: string) {
    if (selectedNetwork === 'Solana') {
      return privySolanaAddress || null;
    }
    // For all EVM networks
    return address || privyEvmAddress || null;
  }

  // Helper to copy address and show toast
  const handleCopyAddress = (addr: string) => {
    Clipboard.setStringAsync(addr);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Address copied!', ToastAndroid.SHORT);
    } else {
      // For iOS, you can use a custom Toast or Alert
      // For now, fallback to Alert
      // Alert.alert('Copied', 'Address copied!');
    }
  };
  
  return (
    <ThemedView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: '#FFFFFF' }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>Wallet Balance</Text>
        <TouchableOpacity 
          onPress={() => {
            setSelectedNetwork('All');
            setIsLoading(true);
            setTokenBalances([]);
            setPrivyEvmBalances([]);
            setPrivySolanaBalances([]);
          }}
          disabled={isLoading || !isConnected}
        >
          <Animated.Text 
            style={[
              styles.refreshButton, 
              { 
                color: '#FFFFFF',
                opacity: isLoading || !isConnected ? 0.5 : 1,
                transform: [{ rotate: isLoading ? spin : '0deg' }]
              }
            ]}
          >
            ↻
          </Animated.Text>
        </TouchableOpacity>
      </View>
      
      <ThemedView style={[styles.totalBalanceCard, { backgroundColor: currentTheme.primary }]}>
        <Text style={[styles.totalBalanceLabel, { color: '#FFFFFF' }]}>
          {hasAnyWallet ? 'Total Balance' : 'Wallet Not Connected'}
        </Text>
        {hasAnyWallet ? (
          <Text style={[styles.totalBalanceValue, { color: '#FFFFFF' }]}>
            ${totalBalanceUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        ) : (
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => router.push('/')}
          >
            <Text style={[styles.connectButtonText, { color: '#FFFFFF' }]}>
              Connect Wallet
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.networkSelector}>
          {networks.map(network => (
            <TouchableOpacity
              key={network}
              style={[
                styles.networkButton,
                { 
                  backgroundColor: selectedNetwork === network 
                    ? currentTheme.accent 
                    : 'transparent',
                }
              ]}
              onPress={() => {
                setSelectedNetwork(network);
                setIsLoading(true);
                setTokenBalances([]);
                setPrivyEvmBalances([]);
                setPrivySolanaBalances([]);
              }}
            >
              <Text 
                style={[
                  styles.networkButtonText, 
                  { 
                    color: selectedNetwork === network 
                      ? '#FFFFFF' 
                      : 'rgba(255, 255, 255, 0.7)' 
                  }
                ]}
              >
                {network}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Wallet Address Pills */}
        {hasAnyWallet && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            {selectedNetwork === 'All' ? (
              <>
                {(address || privyEvmAddress) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.18)',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      marginRight: privySolanaAddress ? 8 : 0,
                      marginBottom: 8,
                      marginTop: 4,
                    }}
                    onPress={() => handleCopyAddress((address || privyEvmAddress)!)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, marginRight: 8 }}>
                      EVM: {(address || privyEvmAddress)!.slice(0, 6)}...{(address || privyEvmAddress)!.slice(-4)}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
                {privySolanaAddress && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.18)',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      marginBottom: 8,
                      marginTop: 4,
                    }}
                    onPress={() => handleCopyAddress(privySolanaAddress)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, marginRight: 8 }}>
                      SOL: {privySolanaAddress.slice(0, 6)}...{privySolanaAddress.slice(-4)}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              getWalletAddressForNetwork(selectedNetwork) && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.18)',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                  onPress={() => handleCopyAddress(getWalletAddressForNetwork(selectedNetwork)!)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#fff', fontSize: 14, marginRight: 8 }}>
                    {getWalletAddressForNetwork(selectedNetwork)!.slice(0, 6)}...{getWalletAddressForNetwork(selectedNetwork)!.slice(-4)}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color="#fff" />
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </ThemedView>
      
      {/* Show message only if no wallet is present */}
      {!hasAnyWallet && (
        <Text style={{ textAlign: 'center', color: currentTheme.textSecondary, marginVertical: 16 }}>
          Connect your wallet to view your token balances.
        </Text>
      )}

      {/* Buy Crypto & Receive Buttons - works for any wallet */}
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
        <BuyCryptoButton 
          isConnected={!!hasAnyWallet} 
          address={getWalletAddressForNetwork(selectedNetwork)} 
          selectedNetwork={selectedNetwork} 
        />
        <TouchableOpacity
          style={{
            marginLeft: 14,
            backgroundColor: '#8A2BE2',
            borderRadius: 22,
            paddingVertical: 12,
            paddingHorizontal: 22,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#8A2BE2',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => setShowReceiveModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Receive</Text>
        </TouchableOpacity>
      </View>

      {isLoading && tokenBalances.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>Loading balances...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTokens}
          renderItem={renderTokenItem}
          keyExtractor={item => `${item.id}-${item.symbol}`}
          contentContainerStyle={styles.tokenList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: '#FFFFFF' }]}>
                {isConnected 
                  ? "No tokens found for the selected network." 
                  : "Connect your wallet to view your token balances."}
              </Text>
            </View>
          }
        />
      )}
      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        userAddresses={{
          ethereum: address || privyEvmAddress || '',
          polygon: address || privyEvmAddress || '',
          solana: privySolanaAddress || '',
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 70,
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalBalanceCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  totalBalanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  connectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  networkSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  networkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  networkButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tokenList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tokenCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenDetails: {},
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tokenName: {
    fontSize: 14,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenBalanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tokenBalanceUSD: {
    fontSize: 14,
    marginBottom: 4,
  },
  tokenChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
