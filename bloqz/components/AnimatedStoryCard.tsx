import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { TransactionShareData } from './TransactionShareCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const STORY_WIDTH = screenWidth;
const STORY_HEIGHT = screenHeight;
const CARD_WIDTH = STORY_WIDTH * 0.9;
const CARD_HEIGHT = STORY_HEIGHT * 0.75;

// Helper function to format token amounts with appropriate decimals
function formatTokenAmount(amount: number | string, symbol: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === 0) return '0';
  if (num < 0.000001) return num.toExponential(2); // Use scientific notation for very small values
  if (num < 0.01) return num.toFixed(6); // Show up to 6 decimals for small values
  if (num < 1) return num.toFixed(4); // Show up to 4 decimals for values less than 1
  if (num < 1000) return num.toFixed(2); // Show 2 decimals for normal values
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Use locale formatting for large values
}

interface AnimatedStoryCardProps {
  transaction: TransactionShareData;
  onAnimationComplete?: () => void;
  isRecording?: boolean;
}

export const AnimatedStoryCard: React.FC<AnimatedStoryCardProps> = ({
  transaction,
  onAnimationComplete,
  isRecording = false,
}) => {
  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardRotation = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotation = useRef(new Animated.Value(0)).current;
  const amountScale = useRef(new Animated.Value(0)).current;
  const amountOpacity = useRef(new Animated.Value(0)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const particleScale = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const swipeUpOpacity = useRef(new Animated.Value(0)).current;
  const swipeUpTranslateY = useRef(new Animated.Value(20)).current;

  // State for counting animation
  const [displayAmount, setDisplayAmount] = useState('0');
  const [currentCount, setCurrentCount] = useState(0);

  // Get transaction type icon and color
  const getTransactionTypeIcon = () => {
    switch (transaction.type) {
      case 'swap': return '🔄';
      case 'stake': return '🔒';
      case 'send': return '💸';
      case 'buy': return '🛒';
      case 'sell': return '💰';
      default: return '⚡';
    }
  };

  const getTransactionTypeColor = () => {
    switch (transaction.type) {
      case 'swap': return ['#FF6B6B', '#4ECDC4'] as const;
      case 'stake': return ['#A8E6CF', '#45B7D1'] as const;
      case 'send': return ['#FFD93D', '#FF6B6B'] as const;
      case 'buy': return ['#6BCF7F', '#4ECDC4'] as const;
      case 'sell': return ['#FF8E53', '#FF6B6B'] as const;
      default: return ['#8A2BE2', '#FF6B6B'] as const;
    }
  };

  const getNetworkIcon = (network: string = 'ethereum') => {
    const networkIcons: { [key: string]: any } = {
      ethereum: require('../assets/networks/ethereum.png'),
      polygon: require('../assets/networks/polygon.png'),
      arbitrum: require('../assets/networks/arbitrium.png'),
      optimism: require('../assets/networks/optimism.png'),
      base: require('../assets/networks/base.png'),
      solana: require('../assets/networks/solana.png'),
    };
    return networkIcons[network] || networkIcons.ethereum;
  };

  // Start animations
  useEffect(() => {
    let isMounted = true;
    let countUpTimeout: number;
    let swipeTimeout: number;

    const startAnimations = async () => {
      if (!isMounted) return;

      // Reset all animations
      cardScale.setValue(0);
      cardOpacity.setValue(0);
      cardRotation.setValue(0);
      badgeScale.setValue(0);
      badgeRotation.setValue(0);
      amountScale.setValue(0);
      amountOpacity.setValue(0);
      detailsOpacity.setValue(0);
      glowOpacity.setValue(0);
      particleScale.setValue(0);
      progressBarWidth.setValue(0);
      swipeUpOpacity.setValue(0);
      swipeUpTranslateY.setValue(20);

      // Card entrance animation
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardRotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Glow effect
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }).start();

      // Badge animation
      setTimeout(() => {
        if (!isMounted) return;
        
        Animated.parallel([
          Animated.timing(badgeScale, {
            toValue: 1,
            duration: 600,
            easing: Easing.elastic(1.1),
            useNativeDriver: true,
          }),
          Animated.timing(badgeRotation, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);

      // Amount counting animation
      setTimeout(() => {
        if (!isMounted) return;
        
        const targetAmount = parseFloat(transaction.amount || '0');
        const duration = 2000;
        const steps = 60;
        const increment = targetAmount / steps;
        const stepDuration = duration / steps;

        const countUp = () => {
          if (!isMounted) return;
          
          setCurrentCount(prev => {
            const newCount = Math.min(prev + increment, targetAmount);
            setDisplayAmount(formatTokenAmount(newCount, transaction.tokenSymbol || ''));
            
            if (newCount < targetAmount) {
              countUpTimeout = setTimeout(countUp, stepDuration) as number;
            } else {
              // Start amount reveal animation
              Animated.parallel([
                Animated.timing(amountScale, {
                  toValue: 1,
                  duration: 600,
                  easing: Easing.elastic(1.1),
                  useNativeDriver: true,
                }),
                Animated.timing(amountOpacity, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]).start();
            }
            return newCount;
          });
        };
        countUp();
      }, 800);

      // Details fade in
      setTimeout(() => {
        if (!isMounted) return;
        
        Animated.timing(detailsOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 1200);

      // Progress bar animation
      setTimeout(() => {
        if (!isMounted) return;
        
        Animated.timing(progressBarWidth, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }).start();
      }, 1500);

      // Swipe up hint
      setTimeout(() => {
        if (!isMounted) return;
        
        Animated.parallel([
          Animated.timing(swipeUpOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(swipeUpTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Pulse the swipe hint
        const pulseSwipe = () => {
          if (!isMounted) return;
          
          Animated.sequence([
            Animated.timing(swipeUpOpacity, {
              toValue: 0.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(swipeUpOpacity, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (isMounted) {
              swipeTimeout = setTimeout(pulseSwipe, 2000) as number;
            }
          });
        };
        swipeTimeout = setTimeout(pulseSwipe, 2000) as number;
      }, 3500);
    };

    startAnimations();

    return () => {
      isMounted = false;
      cardScale.stopAnimation();
      cardOpacity.stopAnimation();
      cardRotation.stopAnimation();
      badgeScale.stopAnimation();
      badgeRotation.stopAnimation();
      amountScale.stopAnimation();
      amountOpacity.stopAnimation();
      detailsOpacity.stopAnimation();
      glowOpacity.stopAnimation();
      particleScale.stopAnimation();
      progressBarWidth.stopAnimation();
      swipeUpOpacity.stopAnimation();
      swipeUpTranslateY.stopAnimation();
      if (countUpTimeout) clearTimeout(countUpTimeout);
      if (swipeTimeout) clearTimeout(swipeTimeout);
    };
  }, [transaction]);

  // Continuous animations
  useEffect(() => {
    if (isRecording) {
      // Pulsing glow effect
      const pulseGlow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseGlow.start();

      // Floating badge animation
      const floatBadge = Animated.loop(
        Animated.sequence([
          Animated.timing(badgeScale, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(badgeScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      floatBadge.start();

      return () => {
        pulseGlow.stop();
        floatBadge.stop();
      };
    }
  }, [isRecording]);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0A0A', '#1A1A2E', '#16213E']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            opacity: glowOpacity,
            transform: [
              {
                scale: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={getTransactionTypeColor()}
          style={styles.glowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardOpacity,
            transform: [
              {
                scale: cardScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
              },
              {
                rotate: cardRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-10deg', '0deg'],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView intensity={30} tint="dark" style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    {
                      scale: badgeScale.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                    {
                      rotate: badgeRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-180deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={getTransactionTypeColor()}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.transactionIcon}>{getTransactionTypeIcon()}</Text>
              </LinearGradient>
            </Animated.View>
            
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Transaction Successful!</Text>
              <Text style={styles.cardSubtitle}>Bloqz AI</Text>
            </View>
          </View>

          {/* Amount display */}
          <Animated.View
            style={[
              styles.amountContainer,
              {
                opacity: amountOpacity,
                transform: [
                  {
                    scale: amountScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <BlurView intensity={40} tint="dark" style={styles.amountPill}>
              <Text style={styles.amountText}>
                {displayAmount} {transaction.tokenSymbol}
              </Text>
            </BlurView>
          </Animated.View>

          {/* Transaction details */}
          <Animated.View
            style={[
              styles.detailsContainer,
              { opacity: detailsOpacity },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{transaction.type.toUpperCase()}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network</Text>
              <View style={styles.networkContainer}>
                <Image
                  source={getNetworkIcon(transaction.network || 'ethereum')}
                  style={styles.networkIcon}
                />
                <Text style={styles.detailValue}>
                  {transaction.network ? 
                    transaction.network.charAt(0).toUpperCase() + transaction.network.slice(1) : 
                    'Ethereum'
                  }
                </Text>
              </View>
            </View>

            {transaction.to && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Achievement badge (dynamic) */}
          {transaction.achievement ? (
            <Animated.View
              style={[
                styles.achievementContainer,
                {
                  transform: [
                    {
                      scale: badgeScale.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BlurView intensity={30} tint="dark" style={styles.achievementBadge}>
                <Text style={styles.achievementText}>
                  {transaction.achievement.icon ? `${transaction.achievement.icon} ` : ''}
                  {transaction.achievement.title}
                </Text>
                <Text style={[styles.achievementText, { fontSize: 13, color: '#fff', fontWeight: '400' }]}> 
                  {transaction.achievement.description}
                </Text>
              </BlurView>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.achievementContainer,
                {
                  transform: [
                    {
                      scale: badgeScale.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BlurView intensity={30} tint="dark" style={styles.achievementBadge}>
                <Text style={styles.achievementText}>🏆 Top 5%</Text>
              </BlurView>
            </Animated.View>
          )}

          {/* User Stats (dynamic, safe for objects) */}
          {transaction.userStats && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              {Object.entries(transaction.userStats).map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                  // Render each subkey for objects (like networkStats)
                  return Object.entries(value).map(([subKey, subValue]) => (
                    <Text key={key + '-' + subKey} style={{ color: '#FFD700', fontSize: 13, fontWeight: '600', marginVertical: 1 }}>
                      {key.replace(/([A-Z])/g, ' $1')}: {subKey} = {String(subValue)}
                    </Text>
                  ));
                }
                // Render primitive values directly
                return (
                  <Text key={key} style={{ color: '#FFD700', fontSize: 13, fontWeight: '600', marginVertical: 1 }}>
                    {key.replace(/([A-Z])/g, ' $1')}: {value}
                  </Text>
                );
              })}
            </View>
          )}

          {/* Social Proof (dynamic, as pills) */}
          {transaction.socialProof && (
            <View style={{ alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' }}>
              <BlurView intensity={30} tint="dark" style={{ borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 4 }}>
                <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '600' }}>{transaction.socialProof.networkRank}</Text>
              </BlurView>
              {transaction.socialProof.globalRank && (
                <BlurView intensity={30} tint="dark" style={{ borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 4 }}>
                  <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '600' }}>{transaction.socialProof.globalRank}</Text>
                </BlurView>
              )}
            </View>
          )}
        </BlurView>
      </Animated.View>

      {/* Particle effects */}
      <Animated.View
        style={[
          styles.particleContainer,
          {
            opacity: particleScale,
            transform: [
              {
                scale: particleScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      >
        {[...Array(8)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressBarWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Swipe up call to action */}
      <Animated.View
        style={[
          styles.swipeUpContainer,
          {
            opacity: swipeUpOpacity,
            transform: [
              {
                translateY: swipeUpTranslateY,
              },
            ],
          },
        ]}
      >
        <BlurView intensity={20} tint="dark" style={styles.swipeUpPill}>
          <Text style={styles.swipeUpText}>⬆️ Swipe up to try Bloqz</Text>
        </BlurView>
      </Animated.View>

      {/* Story elements */}
      <View style={styles.storyElements}>
        <View style={styles.storyHeader}>
          <Text style={styles.storyUsername}>@bloqz</Text>
          <Text style={styles.storyTime}>now</Text>
        </View>
        
        <View style={styles.storyStickers}>
          <View style={styles.sticker}>
            <Text style={styles.stickerText}>#crypto</Text>
          </View>
          <View style={styles.sticker}>
            <Text style={styles.stickerText}>#trading</Text>
          </View>
          <View style={styles.sticker}>
            <Text style={styles.stickerText}>#bloqz</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowEffect: {
    position: 'absolute',
    width: CARD_WIDTH * 1.5,
    height: CARD_HEIGHT * 1.5,
    borderRadius: 30,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 30,
    opacity: 0.3,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIcon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    opacity: 0.8,
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  amountPill: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  amountText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  detailsContainer: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  achievementContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  achievementBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  achievementText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    opacity: 0.6,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8A2BE2',
    borderRadius: 2,
  },
  swipeUpContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  swipeUpPill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  swipeUpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storyElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  storyHeader: {
    position: 'absolute',
    top: 80,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  storyTime: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  storyStickers: {
    position: 'absolute',
    top: 120,
    right: 20,
    alignItems: 'flex-end',
  },
  sticker: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  stickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AnimatedStoryCard; 