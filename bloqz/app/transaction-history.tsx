import React, { useState } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ScrollView,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';

type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
type TransactionType = 'send' | 'receive' | 'swap' | 'stake' | 'unstake';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: string;
  token: string;
  status: TransactionStatus;
  timestamp: Date;
  hash: string;
  network: string;
}

export default function TransactionHistoryScreen() {
  const { theme, currentTheme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedFilter, setSelectedFilter] = useState<'All' | TransactionType>('All');
  
  // Mock transaction data
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'swap',
      description: 'Swap ETH for USDC',
      amount: '0.1 ETH → 175.25 USDC',
      token: 'ETH',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      hash: '0x7c6b...3d2f',
      network: 'Ethereum',
    },
    {
      id: '2',
      type: 'stake',
      description: 'Stake ETH with Lido',
      amount: '0.5 ETH → 0.5 stETH',
      token: 'ETH',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      hash: '0x8d5a...9e4c',
      network: 'Ethereum',
    },
    {
      id: '3',
      type: 'send',
      description: 'Send USDC',
      amount: '50 USDC',
      token: 'USDC',
      status: 'pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      hash: '0x3f2e...7a1b',
      network: 'Polygon',
    },
    {
      id: '4',
      type: 'receive',
      description: 'Receive SOL',
      amount: '2 SOL',
      token: 'SOL',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      hash: '5Wsd...j7Kq',
      network: 'Solana',
    },
    {
      id: '5',
      type: 'unstake',
      description: 'Unstake mSOL',
      amount: '1 mSOL → 0.995 SOL',
      token: 'mSOL',
      status: 'failed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      hash: '3qRm...p9Tz',
      network: 'Solana',
    },
    {
      id: '6',
      type: 'swap',
      description: 'Swap SOL for USDC',
      amount: '1 SOL → 75 USDC',
      token: 'SOL',
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      hash: '2xVp...k8Rw',
      network: 'Solana',
    },
    {
      id: '7',
      type: 'send',
      description: 'Send ETH',
      amount: '0.05 ETH',
      token: 'ETH',
      status: 'cancelled',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      hash: '0x6d4c...2e9f',
      network: 'Optimism',
    },
  ];
  
  const filters: ('All' | TransactionType)[] = ['All', 'send', 'receive', 'swap', 'stake', 'unstake'];
  
  const filteredTransactions = selectedFilter === 'All' 
    ? mockTransactions 
    : mockTransactions.filter(tx => tx.type === selectedFilter);
  
  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'pending': return '#FFC107'; // Yellow
      case 'completed': return '#4CAF50'; // Green
      case 'failed': return '#F44336'; // Red
      case 'cancelled': return '#9E9E9E'; // Gray
      default: return '#9E9E9E';
    }
  };
  
  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'cancelled': return '−';
      default: return '?';
    }
  };
  
  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'send': return '↑';
      case 'receive': return '↓';
      case 'swap': return '⇄';
      case 'stake': return '↓';
      case 'unstake': return '↑';
      default: return '?';
    }
  };
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };
  
  const openExplorer = (hash: string, network: string) => {
    let url = '';
    
    switch (network) {
      case 'Ethereum':
        url = `https://etherscan.io/tx/${hash}`;
        break;
      case 'Polygon':
        url = `https://polygonscan.com/tx/${hash}`;
        break;
      case 'Arbitrum':
        url = `https://arbiscan.io/tx/${hash}`;
        break;
      case 'Optimism':
        url = `https://optimistic.etherscan.io/tx/${hash}`;
        break;
      case 'Base':
        url = `https://basescan.org/tx/${hash}`;
        break;
      case 'Solana':
        url = `https://solscan.io/tx/${hash}`;
        break;
      default:
        url = `https://etherscan.io/tx/${hash}`;
    }
    
    Linking.openURL(url);
  };
  
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.transactionCard}
      onPress={() => openExplorer(item.hash, item.network)}
    >
      {/* Status indicator positioned at top right */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.transactionHeader}>
        <View style={styles.transactionLeft}>
          <View style={styles.typeIcon}>
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>{getTypeIcon(item.type)}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>
              {item.description}
            </Text>
            <Text style={styles.transactionNetwork}>
              {formatTime(item.timestamp)} • {item.network}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.transactionDetails, { borderTopColor: currentTheme.border }]}>
        <Text style={styles.transactionAmount}>
          {item.amount}
        </Text>
        <Text style={styles.transactionHash}>
          {item.hash}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonContainer} onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transaction History</Text>
          <TouchableOpacity style={styles.optionsButtonContainer}>
            <Text style={styles.optionsButton}>⋮</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterContainer}>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: selectedFilter === filter 
                      ? '#8A2BE2' // Purple for selected filter 
                      : '#2A2A2A', // Dark gray for unselected filters
                  }
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <ThemedText 
                  style={[
                    styles.filterButtonText, 
                    { 
                      color: selectedFilter === filter 
                        ? '#FFFFFF' 
                        : '#999999' // Light gray for unselected text
                    }
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.transactionList}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background to match screenshot
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121212', // Match the background color
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White title text
    textAlign: 'center',
  },
  optionsButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsButton: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterScrollView: {
    marginBottom: 16,
    backgroundColor: '#121212', // Match the background color
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
    marginBottom: 8,
    height: 40, // Fixed height for all filter buttons
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#1A1A1A', // Darker card background to match screenshot
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#8A2BE2', // Purple background for icons
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  transactionNetwork: {
    fontSize: 12,
    color: '#999999',
  },
  statusContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  transactionDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  transactionHash: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#999999',
  },
});
