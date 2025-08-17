import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Alert,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../theme/ThemeProvider';
import { TransactionShareData } from './TransactionShareCard';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import ConfettiCannon from 'react-native-confetti-cannon';
import StoryVideoCreator from './StoryVideoCreator';
import MarketingAssetsGenerator from './MarketingAssetsGenerator';

interface TransactionShareModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionShareData;
}

const { width } = Dimensions.get('window');

// Configuration - Set to false to disable marketing assets generator
const ENABLE_MARKETING_ASSETS_GENERATOR = false;

const wittyOneLiners = [
  "Just told my wallet to do this. No buttons. Magic 🔥 #ChatwithYourWallet",
  "My wallet is smarter than me 🤖",
  "Just made a whale trade 🐋",
  "My wallet listens to me better than my ex 💔",
  "DeFi Degen Mode Unlocked 🦍",
  "I just flexed on-chain. Can you?",
  "Crypto moves, no hands. Just vibes ✨",
  "I talk, my wallet listens. Welcome to the future.",
  "This is not financial advice, but my wallet is on fire 🔥",
  "I just earned a badge for being a degen. Mom would be proud.",
  "Who needs buttons when you have Bloqz AI?",
  "I just did this with a chat. Try it, it's wild.",
  "My wallet's got more badges than my scout sash.",
  "I just made a move. Your turn.",
  "Wallet: 1, Ex: 0",
  "I just unlocked a new level in DeFi. Can you keep up?",
  "I just did a swap while eating pizza. Multitasking king 🍕",
  "My wallet's got more drip than my closet 💧",
  "I just aped in. Are you even DeFi, bro?",
  "I just made a move. Your turn. #BloqzChallenge",
];

const TransactionShareModal: React.FC<TransactionShareModalProps> = ({
  visible,
  onClose,
  transaction,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && require('react-native').useColorScheme() === 'dark');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const cardRef = React.useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showMarketingGenerator, setShowMarketingGenerator] = useState(false);
  
  // App download link
  const appDownloadLink = 'https://bloqz.io';
  
  // Placeholder for referral/UTM tracking
  const referralLink = `https://bloqz.io`;
  
  // Helper function to get network icon
  const getNetworkIcon = (network: string = 'ethereum') => {
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
  
  // Helper function to get transaction type icon
  const getTransactionTypeIcon = () => {
    switch (transaction.type.toUpperCase()) {
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
        return transaction.type.includes('BUY') ? 'trending-up' : 'trending-down';
      default:
        return 'checkmark-circle';
    }
  };
  
  // Helper function to format transaction type for display
  const getTransactionTypeDisplay = () => {
    if (transaction.type.toUpperCase() === 'TRANSAK') {
      return transaction.type.includes('BUY') ? 'Buy' : 'Sell';
    }
    
    return transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1).toLowerCase();
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Helper function to get transaction type image
  const getTransactionTypeImage = () => {
    switch (transaction.type.toUpperCase()) {
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
        <Ionicons name="trophy" size={18} color="#fff" />
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
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rankingText}>{transaction.socialProof.networkRank}</Text>
        </BlurView>
        {transaction.socialProof.globalRank && (
          <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.rankingPill}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
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
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={styles.statsText}>{transaction.userStats.totalTransactions} tx</Text>
        </BlurView>
        {transaction.userStats.streakDays > 0 && (
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.statsPill}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.statsText}>{transaction.userStats.streakDays}d streak</Text>
          </BlurView>
        )}
        {transaction.userStats.rank && (
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.statsPill}>
            <Ionicons name="diamond" size={14} color="#00D4FF" />
            <Text style={styles.statsText}>{transaction.userStats.rank}</Text>
          </BlurView>
        )}
      </View>
    );
  };
  
  // Helper to build the enhanced share message
  const buildShareMessage = () => {
    // Random witty one-liner
    const witty = wittyOneLiners[Math.floor(Math.random() * wittyOneLiners.length)];
    // Achievement/rank
    let achievementLine = '';
    if (transaction.achievement) {
      achievementLine += `\n🏆 Unlocked: ${transaction.achievement.title} badge`;
    }
    if (transaction.userStats && transaction.userStats.rank) {
      achievementLine += `\nRank: ${transaction.userStats.rank}`;
    }
    // Transaction summary (optional, can be omitted for brevity)
    // const txSummary = `\n${getTransactionTypeDisplay()}${transaction.amount ? ' ' + transaction.amount + ' ' + transaction.tokenSymbol : ''} on ${transaction.network || 'blockchain'}`;
    // CTA
    const cta = `\n\nTry Bloqz and flex your wallet: ${referralLink}`;
    return `${witty}${achievementLine}${cta}`;
  };
  
  // Share transaction as text
  const shareAsText = async () => {
    if (!cardRef.current) return;
    setIsGeneratingText(true);
    try {
      // Wait a bit to ensure the card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      
      const imageUri = Platform.OS === 'ios' ? uri : `file://${uri}`;
      const message = buildShareMessage();
      
      await Share.share({
        url: imageUri,
        message,
        title: 'Share your Bloqz transaction',
      });
    } catch (error) {
      console.error('Error sharing transaction:', error);
      Alert.alert('Error', 'Failed to share transaction. Please try again.');
    } finally {
      setIsGeneratingText(false);
    }
  };
  
  // Share transaction as image (with caption if possible)
  const shareAsImage = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      // Wait a bit to ensure the card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile', // Use tmpfile for better platform compatibility
      });
      
      // Platform-specific URI handling
      const imageUri = Platform.OS === 'ios' ? uri : `file://${uri}`;
      
      const message = buildShareMessage();
      await Share.share({
        url: imageUri,
        title: 'Share your Bloqz transaction',
        message, // Some platforms support caption/message with image
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  // Copy download link to clipboard
  const copyDownloadLink = async () => {
    try {
      await Clipboard.setStringAsync(appDownloadLink);
      Alert.alert('Success', 'Download link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Platform-specific share message builders
  const buildTwitterMessage = () => {
    const witty = wittyOneLiners[Math.floor(Math.random() * wittyOneLiners.length)];
    let achievementLine = '';
    if (transaction.achievement) {
      achievementLine += `\n🏆 ${transaction.achievement.title}`;
    }
    if (transaction.userStats && transaction.userStats.rank) {
      achievementLine += `\nRank: ${transaction.userStats.rank}`;
    }
    const cta = `\n\nTry @BloqzAI: ${referralLink}`;
    // Twitter max 280 chars
    let msg = `${witty}${achievementLine}${cta}`;
    if (msg.length > 270) msg = msg.slice(0, 270) + '…';
    return msg;
  };

  const buildDiscordMessage = () => {
    const witty = wittyOneLiners[Math.floor(Math.random() * wittyOneLiners.length)];
    let achievementLine = '';
    if (transaction.achievement) {
      achievementLine += `\n🏆 Badge: ${transaction.achievement.title}`;
    }
    if (transaction.userStats && transaction.userStats.rank) {
      achievementLine += `\nRank: ${transaction.userStats.rank}`;
    }
    const cta = `\n\nTry Bloqz: ${referralLink}`;
    return `${witty}${achievementLine}${cta}`;
  };

  const buildTelegramMessage = () => {
    const witty = wittyOneLiners[Math.floor(Math.random() * wittyOneLiners.length)];
    let achievementLine = '';
    if (transaction.achievement) {
      achievementLine += `\n🏆 Badge: ${transaction.achievement.title}`;
    }
    if (transaction.userStats && transaction.userStats.rank) {
      achievementLine += `\nRank: ${transaction.userStats.rank}`;
    }
    const cta = `\n\nTry Bloqz: ${referralLink}`;
    return `${witty}${achievementLine}${cta}`;
  };

  // Twitter share
  const shareToTwitter = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      // Wait a bit to ensure the card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      
      const imageUri = Platform.OS === 'ios' ? uri : `file://${uri}`;
      
      // For Twitter, we'll share the image with the message
      await Share.share({
        url: imageUri,
        title: 'Share your Bloqz transaction',
        message: buildTwitterMessage(),
      });
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      Alert.alert('Error', 'Failed to share to Twitter. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Discord copy
  const shareToDiscord = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      // Wait a bit to ensure the card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      
      const imageUri = Platform.OS === 'ios' ? uri : `file://${uri}`;
      
      // For Discord, we'll share the image with the message
      await Share.share({
        url: imageUri,
        title: 'Share your Bloqz transaction',
        message: buildDiscordMessage(),
      });
    } catch (error) {
      console.error('Error sharing to Discord:', error);
      Alert.alert('Error', 'Failed to share to Discord. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Telegram share
  const shareToTelegram = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      // Wait a bit to ensure the card is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      
      const imageUri = Platform.OS === 'ios' ? uri : `file://${uri}`;
      
      // For Telegram, we'll share the image with the message
      await Share.share({
        url: imageUri,
        title: 'Share your Bloqz transaction',
        message: buildTelegramMessage(),
      });
    } catch (error) {
      console.error('Error sharing to Telegram:', error);
      Alert.alert('Error', 'Failed to share to Telegram. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Trigger confetti when modal opens
  useEffect(() => {
    if (visible) {
      setShowConfetti(true);
      // Optionally, hide confetti after a short time
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [visible]);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
        {/* Confetti animation */}
        {showConfetti && (
          <ConfettiCannon
            count={80}
            origin={{ x: width / 2, y: 0 }}
            fadeOut={true}
            fallSpeed={3500}
            explosionSpeed={500}
          />
        )}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>Share Transaction</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.content}>
          {/* Transaction Card Preview */}
          <View 
            ref={cardRef}
            style={[styles.cardPreview, isDark ? styles.cardPreviewDark : styles.cardPreviewLight]}
          >
            {getTransactionTypeImage() ? (
              <ImageBackground source={getTransactionTypeImage()} style={styles.gradientContainer} resizeMode="cover">
                {/* Card content here */}
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={getTransactionTypeIcon()} size={28} color="#ffffff" />
                  </View>
                  <Text style={styles.cardTitle}>Transaction Successful!</Text>
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
                
                <View style={styles.cardContent}>
                  {/* Amount as a prominent, centered glass pill */}
                  <View style={styles.amountRow}>
                    {transaction.amount && transaction.tokenSymbol && (
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.amountPill}>
                        <Text style={styles.amount}>{transaction.amount} {transaction.tokenSymbol}</Text>
                      </BlurView>
                    )}
                  </View>
                  {/* Details as split glass pill rows */}
                  <View style={styles.detailsColumn}>
                    <View style={styles.splitRow}>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                        <Text style={styles.detailLabel}>Type</Text>
                      </BlurView>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                        <Text style={styles.detailValue}>{getTransactionTypeDisplay()}</Text>
                      </BlurView>
                    </View>
                    {transaction.network && (
                      <View style={styles.splitRow}>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                          <Text style={styles.detailLabel}>Network</Text>
                        </BlurView>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                          <View style={styles.networkRowNoWrap}>
                            <Image 
                              source={getNetworkIcon(transaction.network)} 
                              style={styles.networkIcon}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              priority="high"
                              placeholder={require('../assets/networks/ethereum.png')}
                            />
                            <Text style={styles.detailValue}>{transaction.network.charAt(0).toUpperCase() + transaction.network.slice(1)}</Text>
                          </View>
                        </BlurView>
                      </View>
                    )}
                    {transaction.to && (
                      <View style={styles.splitRow}>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                          <Text style={styles.detailLabel}>To</Text>
                        </BlurView>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                          <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">{transaction.to}</Text>
                        </BlurView>
                      </View>
                    )}
                    <View style={styles.splitRow}>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                        <Text style={styles.detailLabel}>Date</Text>
                      </BlurView>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                        <Text style={styles.detailValue}>{formatDate(transaction.timestamp)}</Text>
                      </BlurView>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooterRow}>
                  <View style={styles.cardFooterLeft}>
                    <Image 
                      source={require('../assets/images/bloqz_logo.png')} // replace with white logo
                      style={styles.logo}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      priority="high"
                      placeholder={require('../assets/images/bloqz_logo.png')}
                    />
                    <Text style={styles.poweredBy}>Powered by Bloqz AI</Text>
                  </View>
                </View>
                <View style={styles.qrContainerCard}>
                  <QRCode
                    value={appDownloadLink}
                    size={60}
                    color="#ffffff"
                    backgroundColor="transparent"
                  />
                </View>
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={['#ae1cff', '#6c13ce']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
              >
                {/* Card content here (same as above) */}
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={getTransactionTypeIcon()} size={28} color="#ffffff" />
                  </View>
                  <Text style={styles.cardTitle}>Transaction Successful!</Text>
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
                
                <View style={styles.cardContent}>
                  {/* Amount as a prominent, centered glass pill */}
                  <View style={styles.amountRow}>
                    {transaction.amount && transaction.tokenSymbol && (
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.amountPill}>
                        <Text style={styles.amount}>
                          {transaction.amount}{" "}
                          {(transaction.tokenSymbol && transaction.tokenSymbol.length > 0)
                            ? transaction.tokenSymbol.toUpperCase()
                            : (transaction.network === "solana" && transaction.type === "stake")
                              ? "SOL"
                              : "ETH"}
                        </Text>
                      </BlurView>
                    )}
                  </View>
                  {/* Details as split glass pill rows */}
                  <View style={styles.detailsColumn}>
                    <View style={styles.splitRow}>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                        <Text style={styles.detailLabel}>Type</Text>
                      </BlurView>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                        <Text style={styles.detailValue}>{getTransactionTypeDisplay()}</Text>
                      </BlurView>
                    </View>
                    {transaction.network && (
                      <View style={styles.splitRow}>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                          <Text style={styles.detailLabel}>Network</Text>
                        </BlurView>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                          <View style={styles.networkRowNoWrap}>
                            <Image 
                              source={getNetworkIcon(transaction.network)} 
                              style={styles.networkIcon}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              priority="high"
                              placeholder={require('../assets/networks/ethereum.png')}
                            />
                            <Text style={styles.detailValue}>{transaction.network.charAt(0).toUpperCase() + transaction.network.slice(1)}</Text>
                          </View>
                        </BlurView>
                      </View>
                    )}
                    {transaction.to && (
                      <View style={styles.splitRow}>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                          <Text style={styles.detailLabel}>To</Text>
                        </BlurView>
                        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                          <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">{transaction.to}</Text>
                        </BlurView>
                      </View>
                    )}
                    <View style={styles.splitRow}>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillLeft}>
                        <Text style={styles.detailLabel}>Date</Text>
                      </BlurView>
                      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.splitPillRight}>
                        <Text style={styles.detailValue}>{formatDate(transaction.timestamp)}</Text>
                      </BlurView>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooterRow}>
                  <View style={styles.cardFooterLeft}>
                    <Image 
                      source={require('../assets/images/bloqz_logo.png')} // replace with white logo
                      style={styles.logo}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      priority="high"
                      placeholder={require('../assets/images/bloqz_logo.png')}
                    />
                    <Text style={styles.poweredBy}>Powered by Bloqz AI</Text>
                  </View>
                </View>
                <View style={styles.qrContainerCard}>
                  <QRCode
                    value={appDownloadLink}
                    size={60}
                    color="#ffffff"
                    backgroundColor="transparent"
                  />
                </View>
              </LinearGradient>
            )}
          </View>
          
          {/* Share Options */}
          <View style={{ width: '100%', marginTop: 14 }}>
            <Text style={[styles.shareTitle, isDark && styles.textLight, { marginBottom: 8, fontSize: 16, textAlign: 'center' }]}>Share to win rewards</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: isDark ? '#232323' : '#f0f0f0',
                  width: 48,
                  height: 48,
                }}
                onPress={shareAsText}
                disabled={isGeneratingText}
              >
                {isGeneratingText ? (
                  <ActivityIndicator size="small" color="#ae1cff" />
                ) : (
                  <Ionicons name="share-social" size={24} color={isDark ? '#ffffff' : '#000000'} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: isDark ? '#232323' : '#f0f0f0',
                  width: 48,
                  height: 48,
                }}
                onPress={shareAsImage}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <ActivityIndicator size="small" color="#ae1cff" />
                ) : (
                  <Ionicons name="image" size={24} color={isDark ? '#ffffff' : '#000000'} />
                )}
              </TouchableOpacity>
              {/* {THIS WILL BE IMPLEMENTED WITH FULL VIDEO CREATION} */}
              {/* <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: isDark ? '#FF0000' : '#f0f0f0',
                  width: 48,
                  height: 48,
                }}
                onPress={() => setShowStoryCreator(true)}
              >
                <Ionicons name="videocam" size={24} color={isDark ? '#ffffff' : '#8A2BE2'} />
              </TouchableOpacity> */}
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: isDark ? '#232323' : '#f0f0f0',
                  width: 48,
                  height: 48,
                }}
                onPress={copyDownloadLink}
              >
                <Ionicons name="copy" size={24} color={isDark ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: '#1DA1F2', // Twitter blue
                  width: 48,
                  height: 48,
                }}
                onPress={shareToTwitter}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="logo-twitter" size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: '#5865F2', // Discord official blue
                  width: 48,
                  height: 48,
                }}
                onPress={shareToDiscord}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="logo-discord" size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: 10,
                  marginHorizontal: 4,
                  backgroundColor: '#0088CC', // Telegram official blue
                  width: 48,
                  height: 48,
                }}
                onPress={shareToTelegram}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="paper-plane" size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Marketing Assets Generator Button */}
          {ENABLE_MARKETING_ASSETS_GENERATOR && (
            <TouchableOpacity
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                borderRadius: 10,
                marginTop: 16,
                backgroundColor: '#FF6B6B',
                width: '100%',
              }}
              onPress={() => setShowMarketingGenerator(true)}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
                🎨 Generate Marketing Assets
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.dismissButton} 
            onPress={onClose}
          >
            <Text style={styles.dismissButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      {/* Story Video Creator */}
      <StoryVideoCreator
        visible={showStoryCreator}
        onClose={() => setShowStoryCreator(false)}
        transaction={transaction}
      />
      
      {/* Marketing Assets Generator */}
      {ENABLE_MARKETING_ASSETS_GENERATOR && (
        <MarketingAssetsGenerator
          visible={showMarketingGenerator}
          onClose={() => setShowMarketingGenerator(false)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPreview: {
    width: width * 0.9,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
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
  cardPreviewLight: {
    backgroundColor: '#ffffff',
  },
  cardPreviewDark: {
    backgroundColor: '#1a1a1a',
  },
  gradientContainer: {
    padding: 20,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardContent: {
    marginBottom: 20,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  networkRowNoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  networkIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  poweredBy: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  qrContainerCard: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 8,
    borderRadius: 8,
  },
  textLight: {
    color: '#ffffff',
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
  amountRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amountPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailsColumn: {
    alignItems: 'stretch',
    width: '100%',
  },
  detailPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 8,
    minWidth: 0,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'nowrap',
    overflow: 'hidden',
    width: '100%',
  },
  splitPillLeft: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginRight: 6,
    alignSelf: 'flex-start',
    flexShrink: 1,
    overflow: 'hidden',
    flex: 0,
    maxWidth: '45%',
  },
  splitPillRight: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-end',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flex: 0,
    maxWidth: '55%',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'left',
    borderRadius: 36,
  },
  detailValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'right',
  },
  achievementBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  achievementText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  rankingPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statsPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
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
  dismissButton: {
    width: '50%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    backgroundColor: '#ae1cff',
  },
  dismissButtonLight: {
    backgroundColor: '#ae1cff',
  },
  dismissButtonDark: {
    backgroundColor: '#6c13ce',
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareTitle: {
    fontWeight: '700',
    color: '#000000',
  },
});

export default TransactionShareModal;
