import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeProvider';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

// Social media image ratios
const SOCIAL_MEDIA_RATIOS = {
  '1:1': { width: 300, height: 300, name: 'Square (1:1)' },
  '1.91:1': { width: 300, height: 157, name: 'Landscape (1.91:1)' },
  '4:5': { width: 300, height: 375, name: 'Portrait (4:5)' },
  '16:9': { width: 300, height: 169, name: 'Wide (16:9)' },
  'twitter': { width: 300, height: 169, name: 'Twitter (1200x675)' },
} as const;

type RatioKey = keyof typeof SOCIAL_MEDIA_RATIOS;

interface MarketingAssetsGeneratorProps {
  visible: boolean;
  onClose: () => void;
}

interface AdTemplate {
  id: string;
  title: string;
  description: string;
  type: 'carousel' | 'static';
  cards: AdCard[];
}

interface AdCard {
  id: string;
  title: string;
  subtitle?: string;
  message: string;
  gradient: string[];
  icon: string;
  cta?: string;
  backgroundImage?: string; // Added for background image
}

const adTemplates: AdTemplate[] = [
  {
    id: 'carousel-1',
    title: 'Simplicity Focus',
    description: 'Emphasizes ease of use and AI power',
    type: 'carousel',
    cards: [
      {
        id: 'hook',
        title: '🚀 The future of crypto trading',
        subtitle: 'No more complex charts. No more guesswork.',
        message: 'Just chat with AI and trade like a pro.',
        gradient: ['#FF6B6B', '#4ECDC4'],
        icon: '💬',
        cta: 'Join the waitlist → bloqz.io',
        backgroundImage: 'transfer'
      },
      {
        id: 'benefit-1',
        title: '💬 "Send 2 ETH to 0x1234..."',
        subtitle: 'That\'s it. Bloqz AI handles the rest.',
        message: '✅ Multi-chain support\n✅ Gas optimization\n✅ Smart routing',
        gradient: ['#A8E6CF', '#45B7D1'],
        icon: '⚡',
        cta: 'Join 10,000+ early adopters',
        backgroundImage: 'swap'
      },
      {
        id: 'benefit-2',
        title: '🏆 Unlock achievements as you trade',
        subtitle: '"First Steps" → "Crypto Boss" → "Legendary Trader"',
        message: 'Gamified trading that actually pays off.\nYour trading journey, visualized.',
        gradient: ['#FFD93D', '#FF6B6B'],
        icon: '🏆',
        cta: 'Start your journey',
        backgroundImage: 'stake'
      },
      {
        id: 'cta',
        title: '⏰ Limited early access',
        subtitle: 'Join the waitlist for exclusive:',
        message: '• Beta testing privileges\n• Early adopter rewards\n• Direct team feedback',
        gradient: ['#8A2BE2', '#FF6B6B'],
        icon: '🎯',
        cta: 'Sign up now → bloqz.io',
        backgroundImage: 'buySell'
      }
    ]
  },
  {
    id: 'static-1',
    title: 'Achievement Focus',
    description: 'Highlights the gamification aspect',
    type: 'static',
    cards: [
      {
        id: 'achievement',
        title: '🏆 "Just unlocked \'Crypto Boss\' badge!"',
        subtitle: 'Trade smarter with Bloqz AI',
        message: '• Chat-to-trade on 6+ chains\n• AI-powered gas optimization\n• Gamified achievements',
        gradient: ['#FFD700', '#FF6B6B'],
        icon: '🏆',
        cta: 'Join the revolution → bloqz.io',
        backgroundImage: 'stake'
      }
    ]
  },
  {
    id: 'static-2',
    title: 'Simplicity Focus',
    description: 'Emphasizes ease of use',
    type: 'static',
    cards: [
      {
        id: 'simplicity',
        title: '💬 "Send 2 ETH to 0x1234..."',
        subtitle: 'That\'s literally it. No charts. No confusion.',
        message: 'Bloqz AI handles the rest.\nJoin 10,000+ traders who\'ve already switched.',
        gradient: ['#6BCF7F', '#4ECDC4'],
        icon: '💬',
        cta: '→ bloqz.io',
        backgroundImage: 'transfer'
      }
    ]
  },
  {
    id: 'static-3',
    title: 'Social Proof',
    description: 'Highlights user adoption',
    type: 'static',
    cards: [
      {
        id: 'social',
        title: '💸 "Sent 2 ETH like a crypto boss!"',
        subtitle: '10,000+ traders are already using Bloqz',
        message: '• Multi-chain support\n• AI-powered trading\n• Achievement system',
        gradient: ['#FF8E53', '#FF6B6B'],
        icon: '💸',
        cta: 'Ready to join them? → bloqz.io',
        backgroundImage: 'buySell'
      }
    ]
  }
];

const MarketingAssetsGenerator: React.FC<MarketingAssetsGeneratorProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && require('react-native').useColorScheme() === 'dark');
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<RatioKey>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRefs = useRef<{ [key: string]: any }>({});

  // Helper function to get background image
  const getBackgroundImage = (imageName?: string) => {
    if (!imageName) return null;
    
    switch (imageName) {
      case 'transfer':
        return require('../assets/shareCard/transfer.png');
      case 'swap':
        return require('../assets/shareCard/swap.png');
      case 'stake':
        return require('../assets/shareCard/stake.png');
      case 'unstake':
        return require('../assets/shareCard/unstake.png');
      case 'buySell':
        return require('../assets/shareCard/buySell.png');
      default:
        return null;
    }
  };

  const generateImage = async (cardId: string) => {
    try {
      setIsGenerating(true);
      const cardRef = cardRefs.current[cardId];
      if (!cardRef) {
        Alert.alert('Error', 'Card reference not found');
        return;
      }

      // Wait for the card to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share the image
      const Share = require('react-native').Share;
      await Share.share({
        url: Platform.OS === 'ios' ? uri : `file://${uri}`,
        message: `Bloqz Marketing Asset - ${selectedTemplate?.title}`,
      });

    } catch (error) {
      console.error('Error generating image:', error);
      Alert.alert('Error', 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllImages = async () => {
    if (!selectedTemplate) return;

    try {
      setIsGenerating(true);
      
      for (const card of selectedTemplate.cards) {
        await generateImage(card.id);
        // Small delay between captures
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      Alert.alert('Success', 'All marketing assets generated!');
    } catch (error) {
      console.error('Error generating all images:', error);
      Alert.alert('Error', 'Failed to generate some images');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAdCard = (card: AdCard) => {
    const dimensions = SOCIAL_MEDIA_RATIOS[selectedRatio];
    const backgroundImage = getBackgroundImage(card.backgroundImage);
    const isPortrait = dimensions.height > dimensions.width;
    const isLandscape = dimensions.width > dimensions.height;
    const isTwitter = selectedRatio === 'twitter';
    
    return (
      <View
        key={card.id}
        ref={(ref) => {
          if (ref) cardRefs.current[card.id] = ref;
        }}
        style={[styles.cardContainer, { width: dimensions.width, height: dimensions.height }]}
      >
        {backgroundImage ? (
          <ImageBackground 
            source={backgroundImage} 
            style={styles.cardBackground}
            resizeMode="cover"
          >
            <View style={[
              styles.cardContent, 
              isPortrait && styles.cardContentPortrait, 
              isLandscape && styles.cardContentLandscape,
              isTwitter && styles.cardContentTwitter
            ]}>
              {/* Header */}
              <View style={[
                styles.cardHeader, 
                isLandscape && styles.cardHeaderLandscape,
                isTwitter && styles.cardHeaderTwitter
              ]}>
                <BlurView intensity={30} tint="dark" style={[
                  styles.iconContainer, 
                  isLandscape && styles.iconContainerLandscape,
                  isTwitter && styles.iconContainerTwitter
                ]}>
                  <Text style={[
                    styles.iconText, 
                    isLandscape && styles.iconTextLandscape,
                    isTwitter && styles.iconTextTwitter
                  ]}>{card.icon}</Text>
                </BlurView>
                <View style={[
                  styles.headerText, 
                  isLandscape && styles.headerTextLandscape,
                  isTwitter && styles.headerTextTwitter
                ]}>
                  <BlurView intensity={30} tint="dark" style={[
                    styles.titlePill, 
                    isLandscape && styles.titlePillLandscape,
                    isTwitter && styles.titlePillTwitter,
                    { overflow: 'hidden' }
                  ]}>
                    <Text style={[
                      styles.cardTitle, 
                      isLandscape && styles.cardTitleLandscape,
                      isTwitter && styles.cardTitleTwitter
                    ]}>{card.title}</Text>
                  </BlurView>
                  {card.subtitle && (
                    <BlurView intensity={50} tint="dark" style={[
                      styles.subtitlePill, 
                      isLandscape && styles.subtitlePillLandscape,
                      isTwitter && styles.subtitlePillTwitter,
                      { overflow: 'hidden' }
                    ]}>
                      <Text style={[
                        styles.cardSubtitle, 
                        isLandscape && styles.cardSubtitleLandscape,
                        isTwitter && styles.cardSubtitleTwitter
                      ]}>{card.subtitle}</Text>
                    </BlurView>
                  )}
                </View>
              </View>

              {/* Message */}
              <View style={[
                styles.messageContainer, 
                isLandscape && styles.messageContainerLandscape,
                isTwitter && styles.messageContainerTwitter
              ]}>
                <BlurView intensity={30} tint="dark" style={[
                  styles.messagePill, 
                  isLandscape && styles.messagePillLandscape,
                  isTwitter && styles.messagePillTwitter,
                  { overflow: 'hidden' }
                ]}>
                  <Text style={[
                    styles.messageText, 
                    isLandscape && styles.messageTextLandscape,
                    isTwitter && styles.messageTextTwitter
                  ]}>{card.message}</Text>
                </BlurView>
              </View>

              {/* CTA */}
              {card.cta && (
                <View style={[
                  styles.ctaContainer, 
                  isLandscape && styles.ctaContainerLandscape,
                  isTwitter && styles.ctaContainerTwitter
                ]}>
                  <BlurView intensity={40} tint="dark" style={[
                    styles.ctaPill, 
                    isLandscape && styles.ctaPillLandscape,
                    isTwitter && styles.ctaPillTwitter,
                    { overflow: 'hidden' }
                  ]}>
                    <Text style={[
                      styles.ctaText, 
                      isLandscape && styles.ctaTextLandscape,
                      isTwitter && styles.ctaTextTwitter
                    ]}>{card.cta}</Text>
                  </BlurView>
                </View>
              )}

              {/* Bloqz branding */}
              <View style={[
                styles.brandingContainer, 
                isLandscape && styles.brandingContainerLandscape,
                isTwitter && styles.brandingContainerTwitter
              ]}>
                <BlurView intensity={30} tint="dark" style={[
                  styles.brandingPill, 
                  isLandscape && styles.brandingPillLandscape,
                  isTwitter && styles.brandingPillTwitter,
                  { overflow: 'hidden' }
                ]}>
                  <Image 
                    source={require('../assets/images/bloqz_logo.png')}
                    style={[
                      styles.brandingLogo, 
                      isLandscape && styles.brandingLogoLandscape,
                      isTwitter && styles.brandingLogoTwitter
                    ]}
                    contentFit="contain"
                  />
                  <Text style={[
                    styles.brandingText, 
                    isLandscape && styles.brandingTextLandscape,
                    isTwitter && styles.brandingTextTwitter
                  ]}>Powered by Bloqz AI</Text>
                </BlurView>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={card.gradient as [string, string]}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[
              styles.cardContent, 
              isPortrait && styles.cardContentPortrait, 
              isLandscape && styles.cardContentLandscape,
              isTwitter && styles.cardContentTwitter
            ]}>
              {/* Header */}
              <View style={[
                styles.cardHeader, 
                isLandscape && styles.cardHeaderLandscape,
                isTwitter && styles.cardHeaderTwitter
              ]}>
                <View style={[
                  styles.iconContainer, 
                  isLandscape && styles.iconContainerLandscape,
                  isTwitter && styles.iconContainerTwitter
                ]}>
                  <Text style={[
                    styles.iconText, 
                    isLandscape && styles.iconTextLandscape,
                    isTwitter && styles.iconTextTwitter
                  ]}>{card.icon}</Text>
                </View>
                <View style={[
                  styles.headerText, 
                  isLandscape && styles.headerTextLandscape,
                  isTwitter && styles.headerTextTwitter
                ]}>
                  <Text style={[
                    styles.cardTitle, 
                    isLandscape && styles.cardTitleLandscape,
                    isTwitter && styles.cardTitleTwitter
                  ]}>{card.title}</Text>
                  {card.subtitle && (
                    <Text style={[
                      styles.cardSubtitle, 
                      isLandscape && styles.cardSubtitleLandscape,
                      isTwitter && styles.cardSubtitleTwitter
                    ]}>{card.subtitle}</Text>
                  )}
                </View>
              </View>

              {/* Message */}
              <View style={[
                styles.messageContainer, 
                isLandscape && styles.messageContainerLandscape,
                isTwitter && styles.messageContainerTwitter
              ]}>
                <Text style={[
                  styles.messageText, 
                  isLandscape && styles.messageTextLandscape,
                  isTwitter && styles.messageTextTwitter
                ]}>{card.message}</Text>
              </View>

              {/* CTA */}
              {card.cta && (
                <View style={[
                  styles.ctaContainer, 
                  isLandscape && styles.ctaContainerLandscape,
                  isTwitter && styles.ctaContainerTwitter
                ]}>
                  <BlurView intensity={30} tint="dark" style={[
                    styles.ctaPill, 
                    isLandscape && styles.ctaPillLandscape,
                    isTwitter && styles.ctaPillTwitter,
                    { overflow: 'hidden' }
                  ]}>
                    <Text style={[
                      styles.ctaText, 
                      isLandscape && styles.ctaTextLandscape,
                      isTwitter && styles.ctaTextTwitter
                    ]}>{card.cta}</Text>
                  </BlurView>
                </View>
              )}

              {/* Bloqz branding */}
              <View style={[
                styles.brandingContainer, 
                isLandscape && styles.brandingContainerLandscape,
                isTwitter && styles.brandingContainerTwitter
              ]}>
                <BlurView intensity={30} tint="dark" style={[
                  styles.brandingPill, 
                  isLandscape && styles.brandingPillLandscape,
                  isTwitter && styles.brandingPillTwitter,
                  { overflow: 'hidden' }
                ]}>
                  <Image 
                    source={require('../assets/images/bloqz_logo.png')}
                    style={[
                      styles.brandingLogo, 
                      isLandscape && styles.brandingLogoLandscape,
                      isTwitter && styles.brandingLogoTwitter
                    ]}
                    contentFit="contain"
                  />
                  <Text style={[
                    styles.brandingText, 
                    isLandscape && styles.brandingTextLandscape,
                    isTwitter && styles.brandingTextTwitter
                  ]}>Powered by Bloqz AI</Text>
                </BlurView>
              </View>
            </View>
          </LinearGradient>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>
            Marketing Assets Generator
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Template Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Choose Ad Template
            </Text>
            <View style={styles.templateGrid}>
              {adTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    selectedTemplate?.id === template.id && styles.selectedTemplate,
                    isDark && styles.templateCardDark
                  ]}
                  onPress={() => setSelectedTemplate(template)}
                >
                  <Text style={[styles.templateType, isDark && styles.textLight]}>
                    {template.type.toUpperCase()}
                  </Text>
                  <Text style={[styles.templateTitle, isDark && styles.textLight]}>
                    {template.title}
                  </Text>
                  <Text style={[styles.templateDescription, isDark && styles.textSecondary]}>
                    {template.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ratio Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Choose Image Ratio
            </Text>
            <View style={styles.ratioGrid}>
              {Object.entries(SOCIAL_MEDIA_RATIOS).map(([ratio, config]) => (
                <TouchableOpacity
                  key={ratio}
                  style={[
                    styles.ratioCard,
                    selectedRatio === ratio && styles.selectedRatio,
                    isDark && styles.ratioCardDark
                  ]}
                  onPress={() => setSelectedRatio(ratio as RatioKey)}
                >
                  <View style={[styles.ratioPreview, { aspectRatio: config.width / config.height }]} />
                  <Text style={[styles.ratioText, isDark && styles.textLight]}>
                    {config.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview */}
          {selectedTemplate && (
            <View style={styles.section}>
              <View style={styles.previewHeader}>
                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                  Preview
                </Text>
                <TouchableOpacity
                  style={styles.generateAllButton}
                  onPress={generateAllImages}
                  disabled={isGenerating}
                >
                  <Text style={styles.generateAllText}>
                    {isGenerating ? 'Generating...' : 'Generate All'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.previewContainer}
              >
                {selectedTemplate.cards.map((card, index) => (
                  <View key={card.id} style={styles.previewCard}>
                    {renderAdCard(card)}
                    <TouchableOpacity
                      style={styles.generateButton}
                      onPress={() => generateImage(card.id)}
                      disabled={isGenerating}
                    >
                      <Text style={styles.generateButtonText}>
                        {isGenerating ? 'Generating...' : `Generate Card ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
  textLight: {
    color: '#ffffff',
  },
  textSecondary: {
    color: '#888888',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000000',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  templateCardDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#404040',
  },
  selectedTemplate: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  templateType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#000000',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666666',
  },
  ratioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ratioCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  ratioCardDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#404040',
  },
  selectedRatio: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  ratioPreview: {
    width: '100%',
    height: 0, // Placeholder for aspect ratio
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  ratioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateAllButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  generateAllText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewCard: {
    marginRight: 16,
    alignItems: 'center',
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardBackground: {
    flex: 1,
    padding: 20,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  cardContentPortrait: {
    padding: 16,
  },
  cardContentLandscape: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContentTwitter: {
    padding: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLandscape: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  cardHeaderTwitter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerLandscape: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  iconContainerTwitter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 0,
    alignSelf: 'flex-start',
  },
  iconText: {
    fontSize: 24,
  },
  iconTextLandscape: {
    fontSize: 18,
  },
  iconTextTwitter: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  headerTextLandscape: {
    flex: 1,
  },
  headerTextTwitter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
  },
  cardTitleLandscape: {
    fontSize: 14,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  cardTitleTwitter: {
    fontSize: 16,
    marginBottom: 4,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
  },
  cardSubtitleLandscape: {
    fontSize: 12,
    flexWrap: 'wrap',
  },
  cardSubtitleTwitter: {
    fontSize: 14,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageContainerLandscape: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  messageContainerTwitter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
  },
  messageTextLandscape: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  messageTextTwitter: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaContainerLandscape: {
    alignItems: 'center',
    marginBottom: 0,
    marginLeft: 8,
  },
  ctaContainerTwitter: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  ctaPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ctaPillLandscape: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ctaPillTwitter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  ctaTextLandscape: {
    fontSize: 12,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  ctaTextTwitter: {
    fontSize: 16,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
  },
  brandingContainerLandscape: {
    alignItems: 'center',
    marginLeft: 8,
  },
  brandingContainerTwitter: {
    alignItems: 'center',
    marginTop: 4,
  },
  brandingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  brandingPillLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  brandingPillTwitter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  brandingLogo: {
    width: 20,
    height: 20,
  },
  brandingLogoLandscape: {
    width: 16,
    height: 16,
  },
  brandingLogoTwitter: {
    width: 24,
    height: 24,
  },
  brandingText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
  },
  brandingTextLandscape: {
    fontSize: 10,
    flexWrap: 'wrap',
  },
  brandingTextTwitter: {
    fontSize: 14,
    flexWrap: 'wrap',
  },
  generateButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  titlePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  titlePillLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  titlePillTwitter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  subtitlePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  subtitlePillLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  subtitlePillTwitter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  messagePill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  messagePillLandscape: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  messagePillTwitter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

// Marketing Assets Generator Component
export default MarketingAssetsGenerator; 