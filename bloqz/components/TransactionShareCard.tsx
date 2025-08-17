import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// Define the transaction details interface
export interface TransactionShareData {
  type: string;
  amount?: string;
  tokenSymbol?: string;
  network?: string;
  to?: string;
  hash?: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  // New personalization fields
  achievement?: Achievement;
  userStats?: UserStats;
  personalizedMessage?: string;
  socialProof?: SocialProof;
}

interface Achievement {
  type: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  unlockedAt: number;
}

interface UserStats {
  totalTransactions: number;
  totalValue: number;
  networksUsed: string[];
  streakDays: number;
  rank?: string; // "Top 1%", "Whale", etc.
}

interface SocialProof {
  networkRank: string; // "Top 5% on Ethereum"
  globalRank: string; // "Top 1000 users"
  networkStats: {
    totalUsers: number;
    userRank: number;
  };
}

interface TransactionShareCardProps {
  transaction: TransactionShareData;
  onPress: () => void;
}

const { width } = Dimensions.get('window');

export const TransactionShareCard: React.FC<TransactionShareCardProps> = ({ 
  transaction, 
  onPress 
}) => {
  console.log('[TransactionShareCard] transaction prop:', transaction);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && require('react-native').useColorScheme() === 'dark');
  
  // Helper function to get network icon
  const getNetworkIcon = (network: string = 'ethereum') => {
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
  
  // Helper function to get transaction type icon
  const getTransactionTypeIcon = () => {
    switch ((transaction.type || '').toUpperCase()) {
      case 'SEND':
        return 'paper-plane';
      case 'SWAP':
        return 'swap-horizontal';
      case 'BUY':
        return 'trending-up';
      case 'SELL':
        return 'trending-down';
      case 'STAKE':
        return 'lock-closed';
      case 'UNSTAKE':
        return 'lock-open';
      case 'APPROVE':
        return 'checkmark-circle';
      case 'TRANSAK':
        return (transaction.type || '').includes('BUY') ? 'trending-up' : 'trending-down';
      default:
        return 'checkmark-circle';
    }
  };
  
  // Helper function to format transaction type for display
  const getTransactionTypeDisplay = () => {
    if ((transaction.type || '').toUpperCase() === 'TRANSAK') {
      return (transaction.type || '').includes('BUY') ? 'Buy' : 'Sell';
    }
    
    return (transaction.type || '').charAt(0).toUpperCase() + (transaction.type || '').slice(1).toLowerCase();
  };
  
  // Helper function to get transaction type image
  const getTransactionTypeImage = () => {
    switch ((transaction.type || '').toUpperCase()) {
      case 'SEND':
      case 'TRANSFER':
        return require('../assets/shareCard/transfer.png');
      case 'SWAP':
        return require('../assets/shareCard/swap.png');
      case 'STAKE':
        return require('../assets/shareCard/stake.png');
      case 'UNSTAKE':
        return require('../assets/shareCard/unstake.png');
      case 'BUY':
      case 'SELL':
        return require('../assets/shareCard/buySell.png');
      default:
        return null;
    }
  };
  
  // Helper function to get achievement badge
  const getAchievementBadge = () => {
    console.log('[TransactionShareCard] getAchievementBadge achievement:', transaction.achievement);
    if (!transaction.achievement) return null;
    
    const badgeColors = {
      common: ['#4CAF50', '#45a049'] as const,
      rare: ['#2196F3', '#1976D2'] as const,
      epic: ['#9C27B0', '#7B1FA2'] as const,
      legendary: ['#FF9800', '#F57C00'] as const
    };
    
    const colors = badgeColors[transaction.achievement.rarity] || badgeColors.common;
    
    return (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.achievementBadge}
      >
        <Ionicons name="trophy" size={16} color="#fff" />
        <Text style={styles.achievementText}>{transaction.achievement.title}</Text>
      </LinearGradient>
    );
  };

  // Helper function to get ranking display
  const getRankingDisplay = () => {
    if (!transaction.socialProof) return null;
    
    return (
      <View style={styles.rankingContainer}>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.rankingPill}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.rankingText}>{transaction.socialProof.networkRank}</Text>
        </BlurView>
        {transaction.socialProof.globalRank && (
          <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.rankingPill}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={styles.rankingText}>{transaction.socialProof.globalRank}</Text>
          </BlurView>
        )}
      </View>
    );
  };

  // Helper function to get user stats display
  const getUserStatsDisplay = () => {
    if (!transaction.userStats) return null;
    
    return (
      <View style={styles.statsContainer}>
        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.statsPill}>
          <Ionicons name="flash" size={12} color="#fff" />
          <Text style={styles.statsText}>{transaction.userStats.totalTransactions} tx</Text>
        </BlurView>
        {transaction.userStats.streakDays > 0 && (
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.statsPill}>
            <Ionicons name="flame" size={12} color="#FF6B35" />
            <Text style={styles.statsText}>{transaction.userStats.streakDays}d streak</Text>
          </BlurView>
        )}
        {transaction.userStats.rank && (
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.statsPill}>
            <Ionicons name="diamond" size={12} color="#00D4FF" />
            <Text style={styles.statsText}>{transaction.userStats.rank}</Text>
          </BlurView>
        )}
      </View>
    );
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, isDark ? styles.containerDark : styles.containerLight]} 
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Commented out LinearGradient for now, fallback if no image */}
      {/*
      <LinearGradient
        colors={['#a259f7', '#6c13ce']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
      */}
      {getTransactionTypeImage() ? (
        <ImageBackground source={getTransactionTypeImage()} style={styles.gradientContainer} resizeMode="cover">
          {/* Card content here */}
          <View style={styles.headerRow}>
            <View style={styles.iconContainerSmall}>
              <Ionicons name={getTransactionTypeIcon()} size={20} color="#fff" />
            </View>
            <Text style={styles.titleSmall}>Transaction Successful!</Text>
            <Ionicons name="share-outline" size={20} color="#fff" style={styles.shareIconSmall} />
          </View>
          
          {/* Achievement Badge */}
          {getAchievementBadge() && (
            <View style={styles.achievementContainer}>
              {getAchievementBadge()}
            </View>
          )}
          
          {/* Rankings */}
          {getRankingDisplay() && (
            <View style={styles.rankingWrapper}>
              {getRankingDisplay()}
            </View>
          )}
          
          <View style={styles.detailsCompactRow}>
            {transaction.amount && transaction.tokenSymbol && (
              <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
                <Text style={styles.amountCompact}>
                  {transaction.amount}{" "}
                  {(transaction.tokenSymbol && transaction.tokenSymbol.length > 0)
                    ? transaction.tokenSymbol.toUpperCase()
                    : (transaction.network === "solana" && transaction.type === "stake")
                      ? "SOL"
                      : "ETH"}
                </Text>
              </BlurView>
            )}
            <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
              <Text style={styles.detailValueCompact}>{getTransactionTypeDisplay()}</Text>
            </BlurView>
            {transaction.network && (
              <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
                <View style={styles.networkRowCompact}>
                  <Image 
                    source={getNetworkIcon(transaction.network)} 
                    style={styles.networkIconCompact} 
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    placeholder={require('../assets/networks/ethereum.png')}
                    onError={() => {
                      console.log('Network icon failed to load');
                      // Optionally, you could set a fallback state here to show a default icon
                    }}
                  />
                  <Text style={styles.detailValueCompact}>{transaction.network.charAt(0).toUpperCase() + transaction.network.slice(1)}</Text>
                </View>
              </BlurView>
            )}
          </View>
          
          {/* User Stats */}
          {getUserStatsDisplay() && (
            <View style={styles.statsWrapper}>
              {getUserStatsDisplay()}
            </View>
          )}
          
          <View style={styles.footerCompact}>
            <Image 
              source={require('../assets/images/bloqz_logo.png')} 
              style={styles.logoCompact}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              placeholder={require('../assets/images/bloqz_logo.png')}
            />
            <Text style={styles.poweredByCompact}>Powered by Bloqz AI</Text>
            <View style={styles.tapToShareCompact}>
              <Text style={styles.tapToShareTextCompact}>Tap to share</Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={['#a259f7', '#6c13ce']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Card content here (same as above) */}
          <View style={styles.headerRow}>
            <View style={styles.iconContainerSmall}>
              <Ionicons name={getTransactionTypeIcon()} size={20} color="#fff" />
            </View>
            <Text style={styles.titleSmall}>Transaction Successful!</Text>
            <Ionicons name="share-outline" size={20} color="#fff" style={styles.shareIconSmall} />
          </View>
          
          {/* Achievement Badge */}
          {getAchievementBadge() && (
            <View style={styles.achievementContainer}>
              {getAchievementBadge()}
            </View>
          )}
          
          {/* Rankings */}
          {getRankingDisplay() && (
            <View style={styles.rankingWrapper}>
              {getRankingDisplay()}
            </View>
          )}
          
          <View style={styles.detailsCompactRow}>
            {transaction.amount && transaction.tokenSymbol && (
              <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
                <Text style={styles.amountCompact}>{transaction.amount} {transaction.tokenSymbol}</Text>
              </BlurView>
            )}
            <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
              <Text style={styles.detailValueCompact}>{getTransactionTypeDisplay()}</Text>
            </BlurView>
            {transaction.network && (
              <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.glassPill}>
                <View style={styles.networkRowCompact}>
                  <Image 
                    source={getNetworkIcon(transaction.network)} 
                    style={styles.networkIconCompact} 
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    placeholder={require('../assets/networks/ethereum.png')}
                    onError={() => {
                      console.log('Network icon failed to load');
                      // Optionally, you could set a fallback state here to show a default icon
                    }}
                  />
                  <Text style={styles.detailValueCompact}>{transaction.network.charAt(0).toUpperCase() + transaction.network.slice(1)}</Text>
                </View>
              </BlurView>
            )}
          </View>
          
          {/* User Stats */}
          {getUserStatsDisplay() && (
            <View style={styles.statsWrapper}>
              {getUserStatsDisplay()}
            </View>
          )}
          
          <View style={styles.footerCompact}>
            <Image 
              source={require('../assets/images/icon.png')} 
              style={styles.logoCompact}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              placeholder={require('../assets/images/icon.png')}
            />
            <Text style={styles.poweredByCompact}>Powered by Bloqz AI</Text>
            <View style={styles.tapToShareCompact}>
              <Text style={styles.tapToShareTextCompact}>Tap to share</Text>
            </View>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.75,
    borderRadius: 18,
    marginVertical: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginLeft: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  containerLight: {
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#18181b',
  },
  gradientContainer: {
    padding: 14,
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  shareIconSmall: {
    marginLeft: 6,
  },
  detailsCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  amountCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailDivider: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginHorizontal: 4,
    fontWeight: '600',
  },
  detailValueCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkIconCompact: {
    width: 14,
    height: 14,
    marginRight: 3,
  },
  footerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.13)',
  },
  logoCompact: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  poweredByCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  tapToShareCompact: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tapToShareTextCompact: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  glassPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)', // fallback for non-blur
    marginRight: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  achievementText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  rankingPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  rankingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statsPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  achievementContainer: {
    marginBottom: 8,
  },
  rankingWrapper: {
    marginBottom: 8,
  },
  statsWrapper: {
    marginBottom: 8,
  },
});
