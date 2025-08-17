import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  TextInput, 
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  FlatList,
  Modal,
  LayoutAnimation,
  Keyboard,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '../theme/ThemeProvider';
import { useAppKitAccount } from "@reown/appkit-ethers5-react-native";
import { WalletContact } from '../services/wallet.service';
import { apiService, ChatSession, ChatMessage as ApiChatMessage, TransactionType as APITransactionType } from '../services/api.service';
import { useTransak } from '../contexts/TransakContext';
import { TransactionShareCard, TransactionShareData } from '../components/TransactionShareCard';
import ReceiveShareCard from '../components/ReceiveShareCard';
import TransactionShareModal from '../components/TransactionShareModal';
import TransactionPreviewModal from '../components/TransactionPreviewModal';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useState as useLocalState, useRef as useLocalRef } from 'react';
import debounce from 'lodash.debounce';
import { usePrivy, getUserEmbeddedEthereumWallet, getUserEmbeddedSolanaWallet } from '@privy-io/expo';
import MarketMoversCard from '../components/MarketMoversCard';
import { NotificationBadge } from '../components/NotificationBadge';
import RecipientRequestCard from '../components/RecipientRequestCard';

// Define message types
type MessageType = 'user' | 'ai' | 'system' | 'loading' | 'transaction';
type TransactionType = 'swap' | 'stake' | 'unstake' | 'balance' | 'send' | 'approve' | 'price' | 'trending' | 'gainers' | 'losers';

// Extend TransactionShareData to include requestId
interface ExtendedTransactionShareData extends TransactionShareData {
  requestId?: string;
}

interface Message {
  id: string;
  text: string;
  sender?: 'user' | 'ai' | 'system';
  type?: MessageType;
  timestamp: string | number;
  transactionData?: {
    type: string;
    amount?: string;
    tokenSymbol?: string;
    network?: string;
    to?: string;
    hash?: string;
    status: 'success' | 'pending' | 'failed';
    achievement?: any;
    userStats?: any;
    socialProof?: any;
    personalizedMessage?: any;
    requestId?: string;
    _hasTriedRefresh?: boolean;
  };
  receiveData?: {
    network: string;
    networkInfo: any;
    walletAddress: string;
    token: {
      symbol: string;
      name: string;
      logoUrl?: string;
    };
    amount?: string;
    fiatAmount?: string;
    currency: string;
    paymentUri: string;
    qrCodeData: string;
  };
  highlightWords?: string[];
  recipient?: {
    type: string;
    name: string;
    address: string;
    network: string;
  };
  marketMovers?: any[];
  metadata?: any;
}

// Add this component above ChatScreen
const AIBubble = React.memo(({ children, style, id }: { children: React.ReactNode; style?: any; id: string }) => {
  const opacity = useLocalRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [id]);
  return (
    <Animated.View style={[style, { opacity }]}> 
      <View>{children}</View>
    </Animated.View>
  );
});

const HIGHLIGHT_KEYWORDS = [
  'wallet', 'price', 'swap', 'stake', 'transfer', 'trending', 'buy', 'sell', 'gaining', 'losing', 'unstake', 'receive'
];

// Example prompts for animated message
const EXAMPLE_PROMPTS = [
  "Buy 3 ETH on Base",
  "Stake 5 MATIC",
  "Send 100 USDT to @jack",
  "Swap USDC to ETH",
  "Unstake my AVAX",
  "Show me trending tokens",
  "Get price of SOL",
  "Send 0.5 BTC to 0x123...abcd",
  "Receive 50 USDC on Ethereum",
  "Generate receive link for 100 MATIC",
];

// Animated example prompt message component
const AnimatedExamplePrompt = ({ style }: { style?: any }) => {
  const [index, setIndex] = React.useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}> 
      <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600', textAlign: 'left' }}>
        <Text style={{ color: '#8A2BE2', fontWeight: 'bold' }}> 💡 Try: </Text>
        <Text style={{ fontSize: 14, fontStyle: 'italic', color: '#fff' }}>{EXAMPLE_PROMPTS[index]}</Text>
      </Text>
    </Animated.View>
  );
};

export default function ChatScreen() {
  const { address, isConnected } = useAppKitAccount();
  const { user: privyUser, isReady, logout: privyLogout } = usePrivy();
  const account = getUserEmbeddedEthereumWallet(privyUser);
  const solanaAccount = getUserEmbeddedSolanaWallet(privyUser);
  // Define a currentWalletAddress that checks WalletConnect, Privy EVM, and Privy Solana
  const currentWalletAddress = address || account?.address || solanaAccount?.address;
  const { handleBackendResponse, registerOrderCompleteCallback, unregisterOrderCompleteCallback } = useTransak();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const { currentTheme, theme } = useTheme();
  const isDark = theme === 'dark';
  const inputAccessoryViewHeight = Platform.OS === 'ios' ? 45 : 0; // iOS keyboard accessory view height
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey! What's up? 👋 I am Bloqz!",
      sender: 'ai',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      text: "I can help you buy, sell, transfer, swap, stake, unstake, check what's trending, gaining, losing, or get price updates. What are you feeling today?",
      sender: 'ai',
      timestamp: new Date().toISOString(),
      highlightWords: ['buy', 'sell', 'transfer', 'swap', 'stake', 'unstake', 'trending', 'gaining', 'losing', 'price'],
    },
  ]);
  
  // Request notification state
  const [showRequestCard, setShowRequestCard] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  
  // Wallet contacts state
  const [contacts, setContacts] = useState<WalletContact[]>([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<WalletContact | null>(null);

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Transaction sharing state
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionShareData | null>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  
  // Transaction preview modal state
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  
  // Confetti animation state
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = Dimensions.get('window');
  
  // Generate witty and incentivizing share messages
  const generateShareIncentiveMessage = (transactionData: TransactionShareData): string => {
    const { type, amount, tokenSymbol, network } = transactionData;
    const amountNum = parseFloat(amount || '0');
    
    // Different message categories based on transaction type and amount
    const messages = {
      swap: [
        `🔥 That ${amount} ${tokenSymbol} swap was smooth! Share it and flex your trading skills! 💪`,
        `⚡ Quick ${amount} ${tokenSymbol} swap completed! Your followers need to see this magic! ✨`,
        `🎯 Perfect swap of ${amount} ${tokenSymbol}! Time to show off your crypto game! 🚀`,
        `💎 ${amount} ${tokenSymbol} swapped like a pro! Share the wealth (and the flex)! 💰`
      ],
      stake: [
        `🌱 Just staked ${amount} ${tokenSymbol}! Passive income incoming! Share your smart moves! 📈`,
        `🔒 ${amount} ${tokenSymbol} locked and earning! Your future self will thank you! 💎`,
        `⚡ Staking ${amount} ${tokenSymbol} like a boss! Show them how to build wealth! 🏆`,
        `🎯 ${amount} ${tokenSymbol} staked for gains! Time to inspire others! 🌟`
      ],
      send: [
        `💸 Sent ${amount} ${tokenSymbol} like a crypto boss! Share the love! ❤️`,
        `🚀 ${amount} ${tokenSymbol} transfer completed! Your generosity deserves recognition! 🙏`,
        `⚡ Lightning-fast ${amount} ${tokenSymbol} transfer! Show off your crypto skills! ⚡`,
        `💎 ${amount} ${tokenSymbol} sent successfully! Time to flex your transaction game! 💪`
      ],
      buy: [
        `🛒 Just bought ${amount} ${tokenSymbol}! Diamond hands incoming! 💎`,
        `📈 ${amount} ${tokenSymbol} purchase completed! Your portfolio is growing! 🌱`,
        `🚀 ${amount} ${tokenSymbol} acquired! Show them your investment strategy! 📊`,
        `💎 ${amount} ${tokenSymbol} bought like a pro! Time to share your gains! 💰`
      ],
      sell: [
        `💰 Sold ${amount} ${tokenSymbol} for profits! Smart money moves! 🧠`,
        `📊 ${amount} ${tokenSymbol} sold at the right time! Share your trading wisdom! 🎯`,
        `💸 ${amount} ${tokenSymbol} sold successfully! Your timing is impeccable! ⏰`,
        `🎉 ${amount} ${tokenSymbol} sold for gains! Show them how it's done! 🏆`
      ]
    };
    
    // Get messages for the transaction type
    const typeMessages = messages[type as keyof typeof messages] || messages.send;
    
    // Add special messages for high amounts
    if (amountNum > 1000) {
      return `🔥 WHALE ALERT! ${amount} ${tokenSymbol} transaction! This needs to be shared! 🐋💎`;
    } else if (amountNum > 100) {
      return `💎 Big moves! ${amount} ${tokenSymbol} transaction completed! Flex time! 💪✨`;
    } else if (amountNum > 10) {
      return `⚡ Solid ${amount} ${tokenSymbol} transaction! Your crypto game is strong! 🚀`;
    }
    
    // Return a random message from the appropriate category
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };
  
  // Animation values - memoize to prevent recreation on every render
  const typingAnimation = useMemo(() => new Animated.Value(0), []);
  const sparkleOpacity = useMemo(() => new Animated.Value(0), []);
  const sparkleScale = useMemo(() => new Animated.Value(0.8), []);
  // Use separate animated values for native and JS animations
  // This is for non-native driver animations only
  const gradientPosition = useMemo(() => new Animated.Value(0), []);
  // This is for native driver animations only
  const wordScale = useMemo(() => new Animated.Value(0.98), []);

  // Add state for pending username recipient and wallet
  const [pendingUsernameRecipient, setPendingUsernameRecipient] = useState<any>(null); // { user, wallets, selectedWallet }
  const [lastMentionedUsername, setLastMentionedUsername] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<any[]>([]); // [{type: 'contact'|'user', name, address, ...}]
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced lookup function for autocomplete
  const lookupUsernameSuggestions = debounce(async (username: string) => {
    if (!username || username.length < 2) {
      setUsernameSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      // First try to resolve as ENS domain
      if (username.includes('.') && (username.endsWith('.eth') || username.endsWith('.crypto') || username.endsWith('.xyz'))) {
        console.log(`🔍 Potential ENS domain detected: ${username}`);
        try {
          const ensResponse = await apiService.resolveENS(username);
          if (ensResponse.success && ensResponse.data?.address) {
            const ensSuggestion = {
              type: 'ens',
              name: username,
              address: ensResponse.data.address,
              domain: username,
              source: 'ens'
            };
            setUsernameSuggestions([ensSuggestion]);
            setShowSuggestions(true);
            return;
          }
        } catch (ensError) {
          console.log('ENS resolution failed, falling back to username lookup');
        }
      }

      // Fallback to regular username lookup
      const response = await apiService.getUserByUsername(username);
      if (response.success && response.data) {
        const suggestions: any[] = [];
        if (response.data.contacts && response.data.contacts.length > 0) {
          response.data.contacts.forEach((c: any) => suggestions.push({ ...c, type: 'contact' }));
        }
        if (response.data.users && response.data.users.length > 0) {
          response.data.users.forEach((u: any) => suggestions.push({ ...u, type: 'user' }));
        }
        if (response.data.ensResults && response.data.ensResults.length > 0) {
          response.data.ensResults.forEach((ens: any) => suggestions.push({ ...ens, type: 'ens' }));
        }
        setUsernameSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        setUsernameSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (e) {
      setUsernameSuggestions([]);
      setShowSuggestions(false);
    }
  }, 350);

  // Watch input for @username pattern for autocomplete
  useEffect(() => {
    const mentionMatch = input.match(/@([a-zA-Z0-9_]{2,})$/);
    const ensMatch = input.match(/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.(eth|crypto|xyz|app|dao|art|club|game|io|org|com|net))$/);
    
    if (mentionMatch) {
      lookupUsernameSuggestions(mentionMatch[1]);
    } else if (ensMatch) {
      lookupUsernameSuggestions(ensMatch[1]);
    } else {
      setUsernameSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input]);

  // When a suggestion is tapped
  const handleSelectUsernameSuggestion = (suggestion: any) => {
    setShowSuggestions(false);
    
    // Remove the last @username or ENS domain from the input
    if (suggestion.type === 'ens') {
      // For ENS domains, remove the full domain
      setInput(prevInput => prevInput.replace(new RegExp(`${suggestion.domain}$`), ''));
    } else {
      // For usernames, remove the @username pattern
      setInput(prevInput => prevInput.replace(/@([a-zA-Z0-9_]{2,})$/, ''));
    }
    
    if (suggestion.type === 'contact') {
      setPendingUsernameRecipient({
        type: 'contact',
        name: suggestion.name,
        address: suggestion.address,
        network: suggestion.network,
        notes: suggestion.notes,
      });
    } else if (suggestion.type === 'user') {
      setPendingUsernameRecipient({
        type: 'user',
        username: suggestion.username,
        userId: suggestion.id,
        profileImageUrl: suggestion.profileImageUrl,
        wallets: suggestion.wallets,
        selectedWallet: suggestion.wallets && suggestion.wallets[0],
      });
    } else if (suggestion.type === 'ens') {
      setPendingUsernameRecipient({
        type: 'ens',
        name: suggestion.domain,
        address: suggestion.address,
        network: '1', // Default to Ethereum mainnet
        domain: suggestion.domain,
        source: 'ens'
      });
    }
  };

  // Load contacts from backend API (with fallback to storage)
  const loadContacts = async () => {
    try {
      // Try to get contacts from the backend API
      const response = await apiService.getContacts();
      if ((response as any).contacts) {
        // Map backend contacts to WalletContact format
        const mappedContacts = (response as any).contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          address: contact.address,
          network: contact.network,
          notes: contact.notes,
          isFavorite: contact.notes?.includes('#favorite') || false
        }));
        setContacts(mappedContacts);
        // Save to local storage as backup
        await AsyncStorage.setItem('walletContacts', JSON.stringify(mappedContacts));
      } else {
        // Fallback to local storage if API fails
        const contactsData = await AsyncStorage.getItem('walletContacts');
        if (contactsData) {
          setContacts(JSON.parse(contactsData));
        }
        if (response.error) {
          console.warn('API Error:', response.error);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Fallback to local storage if API fails
      try {
        const contactsData = await AsyncStorage.getItem('walletContacts');
        if (contactsData) {
          setContacts(JSON.parse(contactsData));
        }
      } catch (storageError) {
        console.error('Error loading contacts from storage:', storageError);
      }
    }
  };

  // Sparkle animation function
  const startSparkleAnimation = () => {
    let isMounted = true;
    
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(sparkleScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease)
          })
        ]),
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(sparkleScale, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ])
    );
    
    sparkleLoop.start();
    
    return () => {
      isMounted = false;
      sparkleLoop.stop();
    };
  };
  
  // Load chat sessions from API
  const loadChatSessions = async () => {
    if (!currentWalletAddress) return;
    console.log('Loading chat sessions...');
    
    setIsLoadingSessions(true);
    try {
      const response = await apiService.getChatSessions();
      console.log('Load sessions response:', JSON.stringify(response));
      
      // Handle different response structures
      if ((response as any).sessions && Array.isArray((response as any).sessions)) {
        // Direct response structure from backend
        setChatSessions((response as any).sessions);
      } else if (response.success && response.data?.sessions) {
        // Standard response structure
        setChatSessions(response.data.sessions);
      } else if (Array.isArray(response.data)) {
        // Alternative structure where data is the sessions array
        setChatSessions(response.data);
      } else {
        console.error('Unexpected sessions response structure:', response);
        setChatSessions([]);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setChatSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Create a new chat session
  const createNewSession = async () => {
    try {
      const response = await apiService.createChatSession('New Chat');
      console.log('Create session response:', JSON.stringify(response));
      
      // Extract session data from response, handling different response structures
      let newSession = null;
      let newSessionId = null;
      
      if (response.success) {
        if (response.session) {
          newSession = response.session;
          newSessionId = response.session.id;
        } else if (response.data) {
          newSessionId = response.data.id;
          newSession = response.data;
        }
      }
      
      if (newSession && newSessionId) {
        setCurrentSessionId(newSessionId);
        // Add to sessions list
        setChatSessions(prev => [newSession, ...prev]);
      } else {
        console.log(' ERROR ', {context: 'session'}, 'Failed to get session ID from response:', JSON.stringify(response));
        throw new Error('Failed to create chat session');
      }
    } catch (error) {
      console.error('Error creating new chat session:', error);
    }
  };

  // Select a chat session
  const selectChatSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSessionsModal(false);
    
    // Load messages for this session
    try {
      const response = await apiService.getChatMessages(sessionId);
      // Check for top-level messages property
      let formattedMessages: Message[] = [];
      const backendMessages = (response as any).messages && Array.isArray((response as any).messages)
        ? (response as any).messages
        : (response.success && response.data?.messages ? response.data.messages : []);
      
      formattedMessages = backendMessages.map((msg: any) => {
        // Transaction share card logic
        console.log('⭐⭐⭐ Message metadata from backend:', msg.metadata);
        
        // Check for receive request first (has receiveData in transactionData)
        if (msg.metadata && msg.metadata.transactionData && msg.metadata.transactionData.receiveData) {
          console.log('👍 Receive request detected:', msg.metadata.transactionData.receiveData);
          return {
            id: msg.id,
            text: msg.content,
            sender: 'ai',
            timestamp: msg.createdAt,
            receiveData: msg.metadata.transactionData.receiveData
          };
        }
        
        // Check for completed transactions (has transactionHash)
        if (msg.metadata && (msg.metadata.transactionHash || msg.metadata.transactionData)) {
          console.log('👍 using option with transactionHash:', msg.metadata.transactionHash);
          console.log('👍 this is what is returned:', {
            id: msg.id,
            text: msg.content,
            type: 'transaction',
            timestamp: msg.createdAt,
            transactionData: { ...msg.metadata.transactionData }
          });
          // If transactionHash exists, treat as completed transaction
          return {
            id: msg.id,
            text: msg.content,
            type: 'transaction',
            timestamp: msg.createdAt,
            transactionData: { ...msg.metadata.transactionData }
          };
        }
        
        // Check for other transaction data (previews or pending)
        if (msg.metadata && msg.metadata.transactionData) {
          return {
            id: msg.id,
            text: msg.content,
            type: 'transaction',
            timestamp: msg.createdAt,
            transactionData: msg.metadata.transactionData
          };
        }
        
        // User message with recipient ("to" bubble) from either recipient or contactData.contacts[0]
        if (msg.role === 'user' && msg.metadata) {
          //console.log('⭐ User message with recipient/contactData:', msg.metadata);
          let recipient = undefined;
          if (msg.metadata.recipient) {
            recipient = msg.metadata.recipient;
          } else if (
            msg.metadata.contactData &&
            Array.isArray(msg.metadata.contactData.contacts) &&
            msg.metadata.contactData.contacts.length > 0
          ) {
            recipient = msg.metadata.contactData.contacts[0];
          }
          if (recipient) {
            return {
              id: msg.id,
              text: msg.content,
              sender: 'user',
              timestamp: msg.createdAt,
              recipient
            };
          }
        }
        
        // Regular AI or user message, with support for marketMovers JSON
        let text = msg.content;
        let marketMovers;
        try {
          // Try to parse as JSON if it looks like an object
          if (typeof msg.content === 'string' && msg.content.trim().startsWith('{')) {
            const parsed = JSON.parse(msg.content);
            if (parsed && typeof parsed === 'object') {
              text = parsed.content || msg.content;
              marketMovers = parsed.marketMovers;
            }
          }
        } catch (e) {
          // Not JSON, ignore
        }
        return {
          id: msg.id,
          text,
          sender: msg.role === 'user' ? 'user' : 'ai',
          timestamp: msg.createdAt,
          highlightWords: msg.role === 'assistant' ? ['transfer', 'swap', 'crypto', 'stake', 'unstake', 'trending', 'gaining', 'losing', 'price'] : undefined,
          ...(marketMovers ? { marketMovers } : {})
        };
      });
      //console.log('👍 formattedMessages:', formattedMessages);
      
      // Sort messages by timestamp to ensure proper chronological order
      const sortedMessages = formattedMessages.sort((a, b) => {
        const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timestampA - timestampB;
      });
      
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setMessages([]);
    }
  };

  // Delete a chat session
  const deleteChatSession = async (sessionId: string) => {
    try {
      const response = await apiService.deleteChatSession(sessionId);
      console.log('🔍 [Chat] deleteChatSession response:', response);
      if ((response as any)) {
        // Remove from list
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        
        // If current session was deleted, clear it
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      } else {
        console.error('Failed to delete chat session:', response.error);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  // Add keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Start the sparkle animation
    startSparkleAnimation();
    
    // Load wallet contacts
    loadContacts();
    
    // Load chat sessions
    loadChatSessions();

    // Register Transak order completion callback
    registerOrderCompleteCallback(handleTransakOrderComplete);

    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      // Unregister Transak order completion callback
      unregisterOrderCompleteCallback();
    };
  }, [currentWalletAddress]);

  // Update stored wallet address when current wallet changes
  useEffect(() => {
    if (currentWalletAddress) {
      apiService.setCurrentWalletAddress(currentWalletAddress);
    }
  }, [currentWalletAddress]);

  // Simulate typing animation
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false, // Changed to false to avoid native driver conflicts
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false, // Changed to false to match the first animation
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isTyping]);

  // Start gradient animation for highlighted words
  useEffect(() => {
    // Animation for gradient (non-native)
    Animated.loop(
      Animated.timing(gradientPosition, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false
      })
    ).start();
    
    // Animation for word scaling (native)
    Animated.loop(
      Animated.sequence([
        Animated.timing(wordScale, {
          toValue: 1.02,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(wordScale, {
          toValue: 0.98,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    ).start();
  }, []);

  // Memoized scroll handler to prevent re-renders
  const handleScrollToEnd = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Custom component to render message with highlighted keywords
  const HighlightedMessage = React.memo(({ text, highlightWords }: { text: string; highlightWords?: string[] }) => {
    // Check if this is the capabilities message
    if (highlightWords) {
      // Split text by keywords and render with highlights
      let parts: React.ReactNode[] = [];

      // Function to check if a word should be highlighted
      const shouldHighlight = (word: string) => {
        return highlightWords.some(keyword => word.toLowerCase().includes(keyword.toLowerCase()));
      };

      // Split the text by spaces to check each word
      const words = text.split(' ');

      // Process each word
      words.forEach((word, index) => {
        if (shouldHighlight(word)) {
          // Create interpolated colors for the gradient
          const interpolatedColors = gradientPosition.interpolate({
            inputRange: [0, 0.33, 0.66, 1],
            outputRange: ['rgba(174, 28, 255, 0.2)', 'rgba(255, 28, 142, 0.2)', 'rgba(28, 255, 178, 0.2)', 'rgba(174, 28, 255, 0.2)']
          });

          parts.push(
            <Text key={`text-${index}`} style={{ fontSize: 16, color: currentTheme.textPrimary }}>
              {index > 0 ? ' ' : ''}
            </Text>
          );

          parts.push(
            <Animated.View key={`gradient-${index}`} style={{ 
              backgroundColor: interpolatedColors, 
              borderRadius: 6, 
              marginHorizontal: 3,
              transform: [
                { scale: wordScale }
              ]
            }}>
              <Text style={{ fontSize: 16, color: currentTheme.textPrimary, paddingHorizontal: 6, paddingVertical: 2, fontWeight: '600' }}>{word}</Text>
            </Animated.View>
          );
        } else {
          parts.push(
            <Text key={`text-${index}`} style={{ fontSize: 16, color: currentTheme.textPrimary }}>
              {index > 0 ? ' ' : ''}{word}
            </Text>
          );
        }
      });

      return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>{parts}</View>;
    }

    // For regular messages, just return the text
    return <Text style={{ fontSize: 16, color: currentTheme.textPrimary }}>{text}</Text>;
  });

  const handleSend = async () => {
    if (input.trim() === '' || isTyping) return;

    // Prepare recipient/contactData for API and message
    let recipientData = null;
    let contactData = undefined;
    if (pendingUsernameRecipient) {
      if (pendingUsernameRecipient.type === 'contact') {
        recipientData = {
          type: 'contact',
          name: pendingUsernameRecipient.name,
          address: pendingUsernameRecipient.address,
          network: pendingUsernameRecipient.network,
        };
        contactData = {
          contacts: [recipientData],
        };
      } else if (pendingUsernameRecipient.type === 'user') {
        recipientData = {
          type: 'user',
          name: pendingUsernameRecipient.username,
          address: pendingUsernameRecipient.selectedWallet?.address,
          network: pendingUsernameRecipient.selectedWallet?.network,
        };
      }
    }

    // Add user message to UI, showing recipient if present
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
      ...(recipientData && { recipient: recipientData }),
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setPendingUsernameRecipient(null);
    setIsTyping(true);

    try {
      // If we don't have a current session, create one
      if (!currentSessionId) {
        const sessionResponse = await apiService.createChatSession('New Chat');
        console.log('New session response:', JSON.stringify(sessionResponse));
        
        // Check if we have a session in the response
        let newSessionId = null;
        let newSession = null;
        
        if (sessionResponse.success) {
          if (sessionResponse.session) {
            newSessionId = sessionResponse.session.id;
            newSession = sessionResponse.session;
          } else if (sessionResponse.data) {
            // Handle case where session is in data property
            newSessionId = sessionResponse.data.id;
            newSession = sessionResponse.data;
          }
        }
        
        if (newSession && newSessionId) {
          console.log('Setting new session ID:', newSessionId);
          setCurrentSessionId(newSessionId);
          // Add to sessions list
          setChatSessions(prev => [newSession, ...prev]);
        } else {
          console.log(' ERROR ', {context: 'session'}, 'Failed to get session ID from response:', JSON.stringify(sessionResponse));
          throw new Error('Failed to create chat session');
        }
      }
      
      // Send to backend, include contactData for contacts, recipient for users
      const apiPayload: any = {
        sessionId: currentSessionId || undefined,
        message: input,
        walletAddress: currentWalletAddress, // Add wallet address to fix 0x API taker parameter issue
      };
      if (contactData) {
        apiPayload.contactData = contactData;
      } else if (recipientData && recipientData.type === 'user') {
        apiPayload.recipient = recipientData;
      } else if (recipientData && recipientData.type === 'ens') {
        // Handle ENS domain recipients
        apiPayload.recipient = {
          type: 'ens',
          address: recipientData.address,
          domain: (recipientData as any).domain,
          network: recipientData.network || '1'
        };
      }
      console.log('👍 apiPayload to sendChatMessage:', apiPayload);
      const response = await apiService.sendChatMessage(apiPayload);
      console.log('👍 response from sendChatMessage:', response);

      // --- NEW LOGIC: Name the chat after the first user message ---
      if (currentSessionId) {
        const currentSession = chatSessions.find(session => session.id === currentSessionId);
        if (currentSession && currentSession.title === 'New Chat') {
          // Generate a unique, abbreviated title
          const baseTitle = (input ?? '').length > 30 ? (input ?? '').substring(0, 27) + '...' : (input ?? '');
          await apiService.updateChatSession(currentSessionId, baseTitle);
          // Update local state
          setChatSessions(prev =>
            prev.map(session =>
              session.id === currentSessionId
                ? { ...session, title: baseTitle }
                : session
            )
          );
        }
      }
      // --- END NEW LOGIC ---
      
      console.log(' INFO ', {context: 'api'}, 'Chat API response:', JSON.stringify(response));
      
      // Process the response
      if (response.success) {
        console.log(' INFO ', {context: 'api-success'}, 'Chat API success response:', JSON.stringify(response));
        
        // Use type assertion to access properties that might not be in the type definition
        const responseAny = response as any;
        const reply = responseAny.reply || (response.data && response.data.reply);

        // Handle Transak BUY/SELL transactions directly
        if (reply && reply.responseType === 'TRANSAK') {
          // Show the explanation in the chat
          const aiMessage: Message = {
            id: responseAny.chatMessage?.id || response.data?.chatMessage?.id || Date.now().toString(),
            text: reply.explanation || 'I can help you buy or sell crypto.',
            sender: 'ai',
            timestamp: new Date().toISOString(),
            highlightWords: ['buy', 'sell', 'wallet', 'crypto'],
          };
          setMessages(prevMessages => [...prevMessages, aiMessage]);

          // Open the Transak widget with message ID for tracking
          if (reply.transakParams) {
            if (currentWalletAddress) {
              reply.transakParams.walletAddress = currentWalletAddress;
            }
            // Pass the message ID for transaction tracking
            handleBackendResponse(reply, aiMessage.id);
          }
          return;
        }
        
        // Handle RECEIVE transactions directly
        if (reply && reply.responseType === 'RECEIVE') {
          // Show the explanation in the chat with receive data
          const aiMessage: Message = {
            id: responseAny.chatMessage?.id || response.data?.chatMessage?.id || Date.now().toString(),
            text: reply.explanation || 'I can help you receive crypto.',
            sender: 'ai',
            timestamp: new Date().toISOString(),
            receiveData: reply.receiveData,
            highlightWords: ['receive', 'wallet', 'crypto', 'payment'],
          };
          setMessages(prevMessages => [...prevMessages, aiMessage]);
          return;
        }

        // ADD THIS BLOCK HERE
        if (reply && reply.transaction && reply.transaction.responseType === 'TRANSACTION') {
          const transactionDetails = {
            id: reply.transaction.id, // <-- use 'id', not 'transactionId'
            type: reply.transaction.type || 'transfer', // <-- use backend type if available
            amount: reply.transaction.params?.amount || '',
            tokenSymbol: reply.transaction.params?.tokenSymbol || '',
            network: reply.transaction.params?.network || '',
            to: reply.transaction.params?.to || '',
            from: reply.transaction.params?.from || '',
            estimatedFee: reply.transaction.estimatedFee || '',
            explanation: reply.transaction.explanation || '',
            unsignedTransaction: reply.transaction.unsignedTransaction,
            // Optionally include responseType if you want to handle special cases
            responseType: reply.transaction.responseType,
            params: reply.transaction.params,
          };
          handleOpenPreviewModal(transactionDetails);
          return;
        }
        
        // Extract AI reply from response
        let aiReplyText = '';
        let marketMovers = undefined;
        const replyContent = responseAny.reply?.content || response.data?.reply?.content;

        if (typeof replyContent === 'string') {
          aiReplyText = replyContent;
        } else if (replyContent && typeof replyContent === 'object') {
          aiReplyText = replyContent.content || '';
          marketMovers = replyContent.marketMovers;
          } else if (typeof responseAny.message === 'string') {
            aiReplyText = responseAny.message;
          } else if (responseAny.chatMessage && typeof responseAny.chatMessage === 'string') {
            aiReplyText = responseAny.chatMessage;
          } else {
            aiReplyText = 'I received your message, but I\'m having trouble formulating a response.';
          }
        // Create AI message
        const aiMessage: Message = {
          id: responseAny.chatMessage?.id || response.data?.chatMessage?.id || Date.now().toString(),
          text: aiReplyText,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          highlightWords: ['swap', 'stake', 'transfer', 'price', 'trending', 'wallet', 'buy', 'sell'],
          ...(marketMovers ? { marketMovers } : {}),
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        // Handle error
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: 'Sorry, I encountered an error processing your request.',
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
        console.log(' ERROR ', {context: 'api-error'}, 'Error from API:', JSON.stringify(response.error));
      }
    } catch (error) {
      // Handle exception
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error processing your request.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      console.log(' ERROR ', {context: 'api-exception'}, 'Exception sending message:', error instanceof Error ? error.message : String(error));
    } finally {
      setIsTyping(false);
    }
  };
  
  // Simple AI response generator
  const getAIResponse = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello there! How can I help you with your crypto today?";
    } else if (input.includes('swap')) {
      return "I can help you swap tokens. Which tokens would you like to exchange?";
    } else if (input.includes('stake')) {
      return "Staking is a great way to earn passive income. Which token would you like to stake?";
    } else if (input.includes('transfer') || input.includes('send')) {
      return "I can help you transfer tokens. Who would you like to send to?";
    } else if (input.includes('price')) {
      return "Bitcoin is currently at $63,245 and Ethereum is at $3,421. Any specific token you're interested in?";
    } else if (input.includes('trending')) {
      return "Currently trending tokens are: Bitcoin, Ethereum, Solana, and Cardano.";
    } else if (input.includes('wallet')) {
      return `Your wallet address is ${address ? address.substring(0, 6) + '...' + address.substring(address.length - 4) : 'not connected yet'}.`;
    } else {
      return "I'm not sure how to help with that. Would you like to know about swapping, staking, or transferring tokens?";
    }
  };
  
  // Handle navigation to profile
  const goToProfile = () => {
    router.push('/user-profile');
  };
  
  // Handle navigation to home
  const goToHome = () => {
    router.push('/');
  };
  
  // Handle navigation to settings
  const goToSettings = () => {
    router.push('/settings');
  };
  
  // Handle navigation to transaction history
  const goToTransactionHistory = () => {
    router.push('/transaction-history');
  };
  
  // Handle navigation to wallet contacts
  const goToWalletContacts = () => {
    router.push('/wallet-contacts');
  };

  // Handle navigation to wallet balance
  const goToWalletBalance = () => {
    router.push('/wallet-balance');
  };
  
  // Handle opening the transaction share modal
  const handleOpenShareModal = useCallback((transaction: TransactionShareData) => {
    setSelectedTransaction(transaction);
    setIsShareModalVisible(true);
  }, []);
  
  // Handle closing the transaction share modal
  const handleCloseShareModal = () => {
    setIsShareModalVisible(false);
  };
  
  // Handle opening the transaction preview modal
  const handleOpenPreviewModal = (details: any) => {
    console.log('[TransactionPreview] Opening modal with details:', details);
    setTransactionDetails(details);
    setIsPreviewModalVisible(true);
  };
  
  // Handle closing the transaction preview modal
  const handleClosePreviewModal = () => {
    setIsPreviewModalVisible(false);
  };
  
  // Handle transaction confirmation from the preview modal
  const handleTransactionConfirm = async (transactionData: ExtendedTransactionShareData) => {
    console.log('✅ Transaction confirmed in chat:', transactionData);
    
    // Check if this is a request transaction
    const isRequestTransaction = transactionData.requestId;
    
    if (isRequestTransaction && transactionData.requestId) {
      console.log('🔍 This is a request transaction, updating request status');
      
      try {
        // Mark the request as accepted in the backend
        const acceptResponse = await apiService.markRequestAsAccepted(transactionData.requestId);
        
        if (acceptResponse.success) {
          console.log('✅ Request marked as accepted successfully');
          
          // Update the request data with accepted status
          setRequestData((prevData: any) => {
            if (prevData && prevData.id === transactionData.requestId) {
              return { ...prevData, status: 'accepted' };
            }
            return prevData;
          });
          
          // Add the accepted request to chat history
          const acceptedMessage: Message = {
            id: `request-${transactionData.requestId}-accepted`,
            text: `Request accepted and payment sent: ${transactionData.amount} ${transactionData.tokenSymbol} to ${transactionData.to}`,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            transactionData: {
              type: 'request',
              amount: transactionData.amount || '',
              tokenSymbol: transactionData.tokenSymbol || '',
              network: transactionData.network || '',
              to: transactionData.to || '',
              hash: transactionData.hash || '',
              status: 'success',
              requestId: transactionData.requestId
            }
          };
          setMessages(prevMessages => [...prevMessages, acceptedMessage]);
        } else {
          console.error('Failed to mark request as accepted:', acceptResponse.error);
          Alert.alert('Error', 'Transaction completed but failed to update request status. Please contact support.');
        }
      } catch (error) {
        console.error('Error marking request as accepted:', error);
        Alert.alert('Error', 'Transaction completed but failed to update request status. Please contact support.');
      }
    }
    
    // If this was from a request, hide the request card
    if (showRequestCard && requestData) {
      console.log('✅ Hiding request card after transaction confirmation');
      setShowRequestCard(false);
      setRequestData(null);
    }
    
    // Add the transaction card to the chat
    const newMessage: Message = {
      id: Date.now().toString(),
      text: `Transaction completed: ${transactionData.amount} ${transactionData.tokenSymbol}`,
      type: 'transaction',
      timestamp: Date.now(),
      transactionData: {
        type: transactionData.type,
        amount: transactionData.amount,
        tokenSymbol: transactionData.tokenSymbol,
        network: transactionData.network,
        to: transactionData.to,
        hash: transactionData.hash,
        status: 'success',
        // ✅ Preserve achievement data from backend
        achievement: transactionData.achievement,
        userStats: transactionData.userStats,
        socialProof: transactionData.socialProof,
        personalizedMessage: transactionData.personalizedMessage
      }
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // ✅ NEW: Get enhanced transaction data from backend for rich share card
    let enhancedTxData: any = null;
    try {
      console.log('🔄 Fetching enhanced transaction data from backend...');
      const enhancedResponse = await apiService.getTransactionShareData(newMessage.id);
      if (enhancedResponse.success && enhancedResponse.data) {
        console.log('✅ Enhanced transaction data received:', {
          hasAchievement: !!enhancedResponse.data.achievement,
          hasUserStats: !!enhancedResponse.data.userStats,
          hasSocialProof: !!enhancedResponse.data.socialProof,
          personalizedMessage: enhancedResponse.data.personalizedMessage
        });
        
        // Store enhanced data for use in share incentive message
        enhancedTxData = enhancedResponse.data;
      } else {
        console.log('⚠️ No enhanced data available, using basic transaction data');
        enhancedTxData = transactionData;
      }
    } catch (error) {
      console.error('❌ Error fetching enhanced transaction data:', error);
      enhancedTxData = transactionData; // Fallback to basic data
    }
    
    // Add incentivizing share message after a short delay
    setTimeout(async () => {
      const txData: TransactionShareData = {
        type: transactionData.type,
        amount: transactionData.amount || '0',
        tokenSymbol: transactionData.tokenSymbol || 'ETH',
        network: transactionData.network || 'ethereum',
        to: transactionData.to,
        hash: transactionData.hash,
        status: 'success',
        timestamp: Date.now(),
        // ✅ Use enhanced data if available, fallback to basic data
        achievement: enhancedTxData?.achievement || transactionData.achievement,
        userStats: enhancedTxData?.userStats || transactionData.userStats,
        socialProof: enhancedTxData?.socialProof || transactionData.socialProof,
        personalizedMessage: enhancedTxData?.personalizedMessage || transactionData.personalizedMessage,
      };
      
      const shareIncentiveMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateShareIncentiveMessage(txData),
        sender: 'ai',
        timestamp: Date.now(),
        highlightWords: ['share', 'flex', 'show', 'followers', 'gains', 'wealth'],
      };
      
      // Add to local state
      setMessages(prevMessages => [...prevMessages, shareIncentiveMessage]);
      
      // Save to backend so it persists on reload
      if (currentSessionId) {
        try {
          await apiService.addChatMessage(
            currentSessionId,
            'assistant',
            shareIncentiveMessage.text,
            {
              highlightWords: shareIncentiveMessage.highlightWords,
              isShareIncentive: true
            }
          );
        } catch (error) {
          console.error('Error saving share incentive message to backend:', error);
        }
      }
    }, 1500); // 1.5 second delay for dramatic effect
    
    // Trigger confetti animation for new transaction
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };
  
  // Handle Transak order completion
  const handleTransakOrderComplete = (transactionData: any) => {
    console.log('✅ Transak order completed in chat:', transactionData);
    
    // Add the transaction card to the chat
    const newMessage: Message = {
      id: Date.now().toString(),
      text: `Transak ${transactionData.type} completed: ${transactionData.amount} ${transactionData.tokenSymbol}`,
      type: 'transaction',
      timestamp: Date.now(),
      transactionData: {
        type: transactionData.type,
        amount: transactionData.amount || '0',
        tokenSymbol: transactionData.tokenSymbol || 'ETH',
        network: transactionData.network || 'ethereum',
        to: transactionData.to,
        hash: transactionData.hash,
        status: 'success'
      }
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // ✅ NEW: Get enhanced transaction data from backend for rich share card
    let enhancedTxData: any = null;
    const fetchEnhancedData = async () => {
      try {
        console.log('🔄 Fetching enhanced transaction data for Transak order...');
        const enhancedResponse = await apiService.getTransactionShareData(newMessage.id);
        if (enhancedResponse.success && enhancedResponse.data) {
          enhancedTxData = enhancedResponse.data;
          console.log('✅ Enhanced Transak transaction data received:', {
            hasAchievement: !!enhancedTxData?.achievement,
            hasUserStats: !!enhancedTxData?.userStats,
            hasSocialProof: !!enhancedTxData?.socialProof,
            personalizedMessage: enhancedTxData?.personalizedMessage
          });
          
          // Update the message with enhanced data, ensuring type compatibility
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === newMessage.id 
                ? { 
                    ...msg, 
                    transactionData: { 
                      ...msg.transactionData!,
                      type: msg.transactionData?.type || 'transfer', // Ensure type is always present
                      status: msg.transactionData?.status || 'success', // Ensure status is always present
                      // ✅ Update token symbol and other fields from enhanced data if available
                      tokenSymbol: enhancedTxData?.tokenSymbol || msg.transactionData?.tokenSymbol || 'ETH',
                      network: enhancedTxData?.network || msg.transactionData?.network || 'ethereum',
                      amount: enhancedTxData?.amount || msg.transactionData?.amount || '0',
                      achievement: enhancedTxData?.achievement,
                      userStats: enhancedTxData?.userStats,
                      socialProof: enhancedTxData?.socialProof,
                      personalizedMessage: enhancedTxData?.personalizedMessage
                    } as Message['transactionData'] // Type assertion to ensure compatibility
                  }
                : msg
            )
          );
        } else {
          console.log('⚠️ No enhanced data available for Transak, using basic transaction data');
          enhancedTxData = transactionData;
        }
      } catch (error) {
        console.error('❌ Error fetching enhanced Transak transaction data:', error);
        enhancedTxData = transactionData; // Fallback to basic data
      }
    };
    
    // Fetch enhanced data immediately
    fetchEnhancedData();
    
    // Add incentivizing share message after a short delay
    setTimeout(() => {
      const txData: TransactionShareData = {
        type: transactionData.type,
        amount: transactionData.amount || '0',
        tokenSymbol: transactionData.tokenSymbol || 'ETH',
        network: transactionData.network || 'ethereum',
        to: transactionData.to,
        hash: transactionData.hash,
        status: 'success',
        timestamp: Date.now(),
        // ✅ Use enhanced data if available, fallback to basic data
        achievement: enhancedTxData?.achievement || transactionData.achievement,
        userStats: enhancedTxData?.userStats || transactionData.userStats,
        socialProof: enhancedTxData?.socialProof || transactionData.socialProof,
        personalizedMessage: enhancedTxData?.personalizedMessage || transactionData.personalizedMessage,
      };
      
      const shareIncentiveMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateShareIncentiveMessage(txData),
        sender: 'ai',
        timestamp: Date.now(),
        highlightWords: ['share', 'flex', 'show', 'followers', 'gains', 'wealth'],
      };
      
      // Add to local state
      setMessages(prevMessages => [...prevMessages, shareIncentiveMessage]);
      
      // Save to backend so it persists on reload
      if (currentSessionId) {
        apiService.addChatMessage(
          currentSessionId,
          'assistant',
          shareIncentiveMessage.text,
          {
            highlightWords: shareIncentiveMessage.highlightWords,
            isShareIncentive: true
          }
        ).catch(error => {
          console.error('Error saving Transak share incentive message to backend:', error);
        });
      }
    }, 1500); // 1.5 second delay for dramatic effect
    
    // Trigger confetti animation for new transaction
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };
  
  // Handle selecting a contact
  const handleSelectContact = (contact: WalletContact) => {
    setSelectedContact(contact);
    setShowContactsModal(false);
    
    // Set pendingUsernameRecipient to show confirmation chip (same as @username selection)
    setPendingUsernameRecipient({
      type: 'contact',
      name: contact.name,
      address: contact.address,
      network: contact.network,
      notes: contact.notes,
    });
    
    // Focus the input after selecting a contact
    setTimeout(() => {
      setInput('');
    }, 100);
  };

  // When opening the contacts modal
  const handleOpenContactsModal = () => {
    loadContacts();
    setShowContactsModal(true);
  };
  
  const [menuVisible, setMenuVisible] = useState(false);

  // Custom component to render AI message with markdown-like formatting
  const MarkdownMessage = React.memo(({ text, highlightWords = HIGHLIGHT_KEYWORDS }: { text: string, highlightWords?: string[] }) => {
    // Helper to highlight keywords in a string
    const highlightText = (input: string) => {
      const words = input.split(/(\W+)/);
      return words.map((word, idx) => {
        if (
          highlightWords.some(
            (kw) => word.toLowerCase() === kw.toLowerCase()
          )
        ) {
          return (
            <Text
              key={`hl-${idx}`}
              style={{
                backgroundColor: 'rgba(138, 43, 226, 0.92)', // more vibrant
                color: '#fff',
                fontWeight: 'bold',
                fontStyle: 'italic', // add italics
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginHorizontal: 3,
                shadowColor: '#8A2BE2',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
                overflow: 'hidden',
              }}
            >
              {word}
            </Text>
          );
        }
        return <Text key={`plain-${idx}`}>{word}</Text>;
      });
    };

    // Simple markdown parser for bold, italics, code, and lists, with keyword highlighting
    const parseMarkdown = (input: string) => {
      const elements: React.ReactNode[] = [];
      const lines = input.split('\n');
      lines.forEach((line, idx) => {
        // List
        if (/^\s*[-*] /.test(line)) {
          elements.push(
            <View key={`list-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
              <Text style={{ color: '#8A2BE2', fontWeight: 'bold', fontSize: 18, marginRight: 6 }}>•</Text>
              <Text style={{ color: '#fff', fontSize: 16 }}>{highlightText(line.replace(/^\s*[-*] /, ''))}</Text>
            </View>
          );
          return;
        }
        // Code
        if (/`[^`]+`/.test(line)) {
          const parts = line.split(/(`[^`]+`)/g);
          elements.push(
            <Text key={`code-${idx}`} style={{ color: '#fff', fontSize: 16 }}>
              {parts.map((part, i) =>
                part.startsWith('`') && part.endsWith('`') ? (
                  <Text key={i} style={{ backgroundColor: '#23272f', color: '#8A2BE2', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderRadius: 4, paddingHorizontal: 4 }}>{part.slice(1, -1)}</Text>
                ) : highlightText(part)
              )}
            </Text>
          );
          return;
        }
        // Bold/Italics
        let children: React.ReactNode[] = [];
        let lastIdx = 0;
        const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;
        let match;
        let key = 0;
        while ((match = regex.exec(line)) !== null) {
          if (match.index > lastIdx) {
            children.push(<Text key={key++} style={{ color: '#fff', fontSize: 16 }}>{highlightText(line.slice(lastIdx, match.index))}</Text>);
          }
          if (match[1]) {
            children.push(<Text key={key++} style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>{highlightText(match[1])}</Text>);
          } else if (match[2]) {
            children.push(<Text key={key++} style={{ fontStyle: 'italic', color: '#fff', fontSize: 16 }}>{highlightText(match[2])}</Text>);
          } else if (match[3]) {
            children.push(<Text key={key++} style={{ fontStyle: 'italic', color: '#fff', fontSize: 16 }}>{highlightText(match[3])}</Text>);
          }
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < line.length) {
          children.push(<Text key={key++} style={{ color: '#fff', fontSize: 16 }}>{highlightText(line.slice(lastIdx))}</Text>);
        }
        if (children.length > 0) {
          elements.push(<Text key={`md-${idx}`} style={{ color: '#fff', fontSize: 16 }}>{children}</Text>);
        } else {
          elements.push(<Text key={`plain-${idx}`} style={{ color: '#fff', fontSize: 16 }}>{highlightText(line)}</Text>);
        }
      });
      return elements;
    };
    return <View>{parseMarkdown(text)}</View>;
  });

  // Memoized message item component to prevent unnecessary re-renders
  const MessageItem = React.memo(({ 
    message, 
    currentTheme, 
    handleOpenShareModal, 
    gradientPosition, 
    wordScale 
  }: { 
    message: Message; 
    currentTheme: any; 
    handleOpenShareModal: (transaction: TransactionShareData) => void;
    gradientPosition: Animated.Value;
    wordScale: Animated.Value;
  }) => {
    // Show MarketMoversCard above the AI bubble if present
    const marketMovers = message.marketMovers || (message.metadata && message.metadata.marketMovers);
    if ((message.type === 'ai' || message.sender === 'ai') && marketMovers && marketMovers.length > 0) {
      return (
        <View>
          <MarketMoversCard movers={marketMovers} />
        </View>
      );
    }
    // Check if this is a receive message
    if ((message.type === 'ai' || message.sender === 'ai') && message.receiveData) {
      return (
        <View style={styles.transactionCardContainer}>
          <ReceiveShareCard 
            network={message.receiveData.network}
            token={message.receiveData.token}
            amount={message.receiveData.amount || ''}
            fiatAmount={message.receiveData.fiatAmount || ''}
            currency={message.receiveData.currency}
            address={message.receiveData.walletAddress}
            paymentUri={message.receiveData.paymentUri}
          />
        </View>
      );
    }
    
    // Check if this is a transaction message
    if ((message.type === 'ai' || message.sender === 'ai' || message.type === 'transaction') && message.transactionData) {
      // ✅ Only refresh if we don't have enhanced data AND haven't tried before
      // Add a flag to prevent infinite refresh loops
      if (!message.transactionData.achievement && 
          !message.transactionData.userStats && 
          !message.transactionData._hasTriedRefresh) {
        
        // Mark this message as having tried refresh to prevent infinite loops
        setTimeout(() => {
          // Only refresh if the message still exists and hasn't been refreshed
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === message.id 
                ? { 
                    ...msg, 
                    transactionData: { 
                      ...msg.transactionData!,
                      type: msg.transactionData?.type || 'transfer', // Ensure type is always present
                      status: msg.transactionData?.status || 'success', // Ensure status is always present
                      _hasTriedRefresh: true // Flag to prevent repeated refreshes
                    } as Message['transactionData'] // Type assertion to ensure compatibility
                  }
                : msg
            )
          );
          
          // Now try to refresh the data
          refreshEnhancedTransactionData(message.id);
        }, 100);
      }
      
      const txData: TransactionShareData = {
        type: message.transactionData.type,
        amount: message.transactionData.amount || '0',
        tokenSymbol: message.transactionData.tokenSymbol || 'ETH',
        network: message.transactionData.network || 'ethereum',
        to: message.transactionData.to,
        hash: message.transactionData.hash,
        status: message.transactionData.status,
        timestamp: typeof message.timestamp === 'string' ? Date.parse(message.timestamp) : message.timestamp,
        achievement: message.transactionData.achievement,
        userStats: message.transactionData.userStats,
        socialProof: message.transactionData.socialProof,
        personalizedMessage: message.transactionData.personalizedMessage,
      };
      
      return (
        <View style={styles.transactionCardContainer}>
          <TransactionShareCard 
            transaction={txData} 
            onPress={() => handleOpenShareModal(txData)} 
          />
        </View>
      );
    }
    
    // AI message bubble (upgraded)
    if (message.type === 'ai' || message.sender === 'ai') {
      return (
        <AIBubble
          id={message.id}
          style={[
            styles.messageBubble,
            styles.aiBubbleUpgraded,
            { backgroundColor: currentTheme.cardBackground }
          ]}
        >
          <MarkdownMessage text={message.text} />
        </AIBubble>
      );
    }
    
    // User message bubble (unchanged)
    return (
      <View style={{ marginBottom: 12 }}>
        {message.recipient && (
          <View style={{
            alignSelf: 'flex-end',
            backgroundColor: 'rgba(80,80,176,0.18)',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginBottom: 2,
            marginRight: 2,
          }}>
            <Text style={{ color: '#5050B0', fontWeight: '600', fontSize: 13 }}>
              To: {message.recipient.type === 'user' ? `@${message.recipient.name}` : message.recipient.name} ({message.recipient.address.slice(0, 6)}...{message.recipient.address.slice(-4)})
            </Text>
          </View>
        )}
        <View 
          style={[
            styles.messageBubble,
            styles.userBubble,
            { backgroundColor: currentTheme.primary }
          ]}
        >
          <Text style={{ fontSize: 16, color: '#fff' }}>{message.text}</Text>
        </View>
      </View>
    );
  });

  // Memoized messages list to prevent re-renders when input changes
  const MessagesList = useMemo(() => {
    if (messages.length <= 2) {
      return (
        <>
          {/* First AI message */}
          <AIBubble
            id="ai-msg-1"
            style={[
              styles.messageBubble,
              styles.aiBubbleUpgraded,
              { backgroundColor: currentTheme.cardBackground }
            ]}
          >
            <Text style={{ fontSize: 16, color: currentTheme.textPrimary }}>
              Hey! What's up? 👋 Good to see you!
            </Text>
          </AIBubble>

          {/* Second AI message */}
          <AIBubble
            id="ai-msg-2"
            style={[
              styles.messageBubble,
              styles.aiBubbleUpgraded,
              { backgroundColor: currentTheme.cardBackground }
            ]}
          >
            <MarkdownMessage text={"I can help you buy, sell, transfer, swap, stake, unstake, check what's trending, gaining, losing, or get price updates. What are you feeling today?"} />
          </AIBubble>

          {/* Third animated example prompt message */}
          <AIBubble
            id="example-prompt"
            style={[
              styles.messageBubble,
              styles.aiBubbleUpgraded,
              { backgroundColor: currentTheme.cardBackground, marginTop: 0, marginBottom: 12 }
            ]}
          >
            <AnimatedExamplePrompt />
          </AIBubble>
        </>
      );
    }
    
    return (
      <>
        {messages.map((message, index) => (
          <MessageItem
            key={`${message.id}-${index}`}
            message={message}
            currentTheme={currentTheme}
            handleOpenShareModal={handleOpenShareModal}
            gradientPosition={gradientPosition}
            wordScale={wordScale}
          />
        ))}
      </>
    );
  }, [messages, currentTheme, handleOpenShareModal, gradientPosition, wordScale]);

  // Handle request notifications from notification center
  useEffect(() => {
    console.log('🔍 Checking for request params:', params.showRequest, params.requestData);
    console.log('🔍 All params:', params);
    console.log('🔍 Params type:', typeof params);
    console.log('🔍 Params keys:', Object.keys(params));
    
    if (params.showRequest && params.requestData) {
      try {
        const request = JSON.parse(params.requestData as string);
        console.log('📋 Parsed request data:', request);
        
        // Transform the backend request structure to match the component expectations
        const transformedRequest = {
          id: request.id,
          amount: request.amount,
          token: request.token,
          network: request.network,
          message: request.message,
          status: request.status,
          createdAt: request.createdAt,
          sender: {
            id: request.sender?.id || request.senderId,
            username: request.sender?.username || 'Unknown User',
            profileImageUrl: request.sender?.profileImageUrl
          }
        };
        
        console.log('🔄 Transformed request:', transformedRequest);
        setRequestData(transformedRequest);
        setShowRequestCard(true);
        console.log('✅ Request card should now be visible');
        console.log('✅ showRequestCard state:', true);
        console.log('✅ requestData state:', transformedRequest);
        
        // Fetch the latest request status from backend
        fetchLatestRequestStatus(request.id);
        
        // Clear the params to prevent showing again on navigation
        router.setParams({});
      } catch (error) {
        console.error('Error parsing request data:', error);
      }
    } else {
      console.log('❌ No request params found or invalid data');
      console.log('❌ showRequest:', params.showRequest);
      console.log('❌ requestData:', params.requestData);
    }
  }, [params.showRequest, params.requestData]);

  // Function to fetch the latest request status from backend
  const fetchLatestRequestStatus = async (requestId: string) => {
    try {
      console.log('🔍 Fetching latest request status for:', requestId);
      const response = await apiService.getRequest(requestId);
      
      if (response.success && response.data) {
        const latestRequest = response.data;
        console.log('✅ Latest request status:', latestRequest.status);
        
        // Update the request data with the latest status
        setRequestData((prevData: any) => {
          if (prevData && prevData.id === requestId) {
            return {
              ...prevData,
              status: latestRequest.status
            };
          }
          return prevData;
        });
        
        // If request is no longer pending, hide the card after a delay
        if (latestRequest.status !== 'pending') {
          console.log('🔄 Request is no longer pending, hiding card in 3 seconds...');
          setTimeout(() => {
            setShowRequestCard(false);
            setRequestData(null);
          }, 3000);
        }
      } else {
        console.log('❌ Failed to fetch latest request status:', response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching latest request status:', error);
    }
  };

  // Handle request actions
  const handleRequestAccept = async (requestId?: string) => {
    const targetRequestId = requestId || requestData?.id;
    if (!targetRequestId) return;
    
    try {
      console.log('🔍 Building transaction preview for request:', targetRequestId);
      
      // First, build the transaction preview without changing the status
      const previewResponse = await apiService.buildRequestTransactionPreview(targetRequestId);
      
      if (previewResponse.success && previewResponse.data?.transaction) {
        console.log('✅ Transaction preview built successfully:', previewResponse.data.transaction);
        
        // Show transaction preview modal for user confirmation
        const transactionDetails = {
          type: 'transfer',
          amount: requestData?.amount || '',
          tokenSymbol: requestData?.token || '',
          network: requestData?.network || '',
          to: previewResponse.data.transaction.params?.to || '',
          from: previewResponse.data.transaction.params?.from || '',
          estimatedFee: previewResponse.data.transaction.estimatedFee || '',
          explanation: previewResponse.data.transaction.explanation || '',
          transactionId: previewResponse.data.transaction.id,
          unsignedTransaction: previewResponse.data.transaction.unsignedTransaction,
          requestId: targetRequestId
        };
        
        // Open the transaction preview modal
        handleOpenPreviewModal(transactionDetails);
        
        // Don't update the request status yet - wait for transaction confirmation
        return;
      } else {
        console.error('Failed to build transaction preview:', previewResponse.error);
        
        // Handle specific error cases
        if (previewResponse.error?.includes("doesn't have a wallet")) {
          Alert.alert(
            'Sender Wallet Required', 
            'The person who sent this request needs to add a wallet on this network before you can accept it. Please ask them to add a wallet and try again.',
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Decline Request', 
                style: 'destructive',
                onPress: () => handleRequestDecline(targetRequestId)
              }
            ]
          );
        } else {
          Alert.alert('Error', previewResponse.error || 'Failed to build transaction preview. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error building transaction preview:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleRequestDecline = async (requestId?: string) => {
    const targetRequestId = requestId || requestData?.id;
    if (!targetRequestId) return;
    
    try {
      console.log('🔍 Declining request:', targetRequestId);
      const response = await apiService.respondToRequest(targetRequestId, 'decline');
      
      if (response.success) {
        console.log('✅ Request declined successfully');
        
        // Update the request data with declined status
        setRequestData((prevData: any) => {
          if (prevData && prevData.id === targetRequestId) {
            return { ...prevData, status: 'declined' };
          }
          return prevData;
        });
        
        // Add the declined request to chat history
        const declinedMessage: Message = {
          id: `request-${targetRequestId}-declined`,
          text: `Request declined: ${requestData?.amount} ${requestData?.token} from ${requestData?.sender?.username}`,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          transactionData: {
            type: 'request',
            amount: requestData?.amount || '',
            tokenSymbol: requestData?.token || '',
            network: requestData?.network || '',
            status: 'failed',
            requestId: targetRequestId
          }
        };
        setMessages(prevMessages => [...prevMessages, declinedMessage]);
        
        Alert.alert('Success', 'Request declined successfully!');
      } else {
        console.error('Failed to decline request:', response.error);
        if (response.error?.includes('already processed')) {
          Alert.alert('Request Already Processed', 'This request has already been accepted or declined.');
          setShowRequestCard(false);
          setRequestData(null);
        } else {
          Alert.alert('Error', response.error || 'Failed to decline request. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  // ✅ NEW: Function to refresh enhanced transaction data for share cards
  const refreshEnhancedTransactionData = async (messageId: string) => {
    try {
      console.log('🔄 Refreshing enhanced transaction data for message:', messageId);
      const enhancedResponse = await apiService.getTransactionShareData(messageId);
      if (enhancedResponse.success && enhancedResponse.data) {
        const enhancedData = enhancedResponse.data;
        console.log('✅ Enhanced transaction data refreshed:', {
          hasAchievement: !!enhancedData.achievement,
          hasUserStats: !!enhancedData.userStats,
          hasSocialProof: !!enhancedData.socialProof,
          personalizedMessage: enhancedData.personalizedMessage
        });
        
        // Only update if we actually got new data
        if (enhancedData.achievement || enhancedData.userStats || enhancedData.socialProof) {
          // Update the message with enhanced data, ensuring type compatibility
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === messageId 
                ? { 
                    ...msg, 
                    transactionData: { 
                      ...msg.transactionData!,
                      type: msg.transactionData?.type || 'transfer', // Ensure type is always present
                      status: msg.transactionData?.status || 'success', // Ensure status is always present
                      // ✅ Update token symbol and other fields from enhanced data if available
                      tokenSymbol: enhancedData.tokenSymbol || msg.transactionData?.tokenSymbol || 'ETH',
                      network: enhancedData.network || msg.transactionData?.network || 'ethereum',
                      amount: enhancedData.amount || msg.transactionData?.amount || '0',
                      achievement: enhancedData.achievement,
                      userStats: enhancedData.userStats,
                      socialProof: enhancedData.socialProof,
                      personalizedMessage: enhancedData.personalizedMessage,
                      _hasTriedRefresh: true // Keep the refresh flag
                    } as Message['transactionData'] // Type assertion to ensure compatibility
                  }
                : msg
            )
          );
        } else {
          console.log('⚠️ No enhanced data available, skipping update to prevent infinite loop');
        }
        
        return enhancedData;
      }
    } catch (error) {
      console.error('❌ Error refreshing enhanced transaction data:', error);
    }
    return null;
  };

  // ✅ NEW: Enhanced render function that ensures share cards have rich data
  const renderMessage = useCallback((message: Message) => {
    // Check if this is a transaction message
    if ((message.type === 'ai' || message.sender === 'ai' || message.type === 'transaction') && message.transactionData) {
      // ✅ Only refresh if we don't have enhanced data AND haven't tried before
      // Add a flag to prevent infinite refresh loops
      if (!message.transactionData.achievement && 
          !message.transactionData.userStats && 
          !message.transactionData._hasTriedRefresh) {
        
        // Mark this message as having tried refresh to prevent infinite loops
        setTimeout(() => {
          // Only refresh if the message still exists and hasn't been refreshed
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === message.id 
                ? { 
                    ...msg, 
                    transactionData: { 
                      ...msg.transactionData!,
                      type: msg.transactionData?.type || 'transfer', // Ensure type is always present
                      status: msg.transactionData?.status || 'success', // Ensure status is always present
                      _hasTriedRefresh: true // Flag to prevent repeated refreshes
                    } as Message['transactionData'] // Type assertion to ensure compatibility
                  }
                : msg
            )
          );
          
          // Now try to refresh the data
          refreshEnhancedTransactionData(message.id);
        }, 100);
      }
      
      const txData: TransactionShareData = {
        type: message.transactionData.type,
        amount: message.transactionData.amount || '0',
        tokenSymbol: message.transactionData.tokenSymbol || 'ETH',
        network: message.transactionData.network || 'ethereum',
        to: message.transactionData.to,
        hash: message.transactionData.hash,
        status: message.transactionData.status,
        timestamp: typeof message.timestamp === 'string' ? Date.parse(message.timestamp) : message.timestamp,
        achievement: message.transactionData.achievement,
        userStats: message.transactionData.userStats,
        socialProof: message.transactionData.socialProof,
        personalizedMessage: message.transactionData.personalizedMessage,
      };
      
      return (
        <View style={styles.transactionCardContainer}>
          <TransactionShareCard 
            transaction={txData} 
            onPress={() => handleOpenShareModal(txData)} 
          />
        </View>
      );
    }
  }, [handleOpenShareModal, refreshEnhancedTransactionData]);

  return (
    <ThemedView style={styles.container}>
      {/* Confetti animation for new transactions */}
      {showConfetti && (
        <ConfettiCannon
          count={60}
          origin={{ x: width / 2, y: height * 0.3 }}
          fadeOut={true}
          fallSpeed={3000}
          explosionSpeed={400}
          colors={['#8A2BE2', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']}
        />
      )}
      
      {/* Add extra space at the top */}
      <View style={styles.topSpacer} />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            style={{flexDirection: 'row', alignItems: 'center'}} 
            onPress={() => setShowSessionsModal(true)}
          >
            <Text style={[styles.title, { maxWidth: 180, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
              {(() => {
                if (!currentSessionId) return 'Chat';
                const session = chatSessions.find(s => s.id === currentSessionId);
                if (!session || !session.title) return 'Chat';
                return session.title.length > 30
                  ? session.title.substring(0, 27) + '...'
                  : session.title;
              })()}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#FFFFFF" style={{marginLeft: 4, marginTop: 2}} />
          </TouchableOpacity>
          <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] }]}>
            <Text style={styles.sparkleText}>✨</Text>
          </Animated.View>
        </View>
        <View style={styles.headerButtons}>
          {/* Notification Bell Icon with Badge */}
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/NotificationCenter')}>
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            <NotificationBadge />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={goToWalletBalance}>
            <Text style={{color: '#FFFFFF'}}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
            <Text style={{color: '#FFFFFF'}}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity 
                style={styles.closeButtonContainer}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={{ fontSize: 18, color: '#FFFFFF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              goToWalletContacts();
            }}>
              <Text style={styles.menuItemText}>Contacts</Text>
            </TouchableOpacity>
            
            {/* <View style={[styles.menuSeparator, { backgroundColor: currentTheme.border }]} />
            
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              goToTransactionHistory();
            }}>
              <Text style={styles.menuItemText}>Transaction History</Text>
            </TouchableOpacity> */}
            
            <View style={[styles.menuSeparator, { backgroundColor: currentTheme.border }]} />
            
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setMenuVisible(false);
              goToSettings();
            }}>
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={handleScrollToEnd}
        >
          {MessagesList}
          
          {/* Request Card from Notification */}
          {(() => {
            console.log('🎯 Rendering check - showRequestCard:', showRequestCard, 'requestData:', !!requestData);
            console.log('🎯 requestData details:', requestData);
            
            if (showRequestCard && requestData) {
              console.log('🎯 About to render RecipientRequestCard with data:', requestData);
              return (
                <View style={styles.requestCardContainer}>
                  <RecipientRequestCard
                    request={requestData}
                    onPress={() => {}}
                    onAccept={handleRequestAccept}
                    onDecline={handleRequestDecline}
                  />
                </View>
              );
            } else {
              console.log('🎯 Not rendering request card - conditions not met');
              return null;
            }
          })()}
          
          {isTyping && (
            <View 
              style={[
                styles.messageBubble,
                styles.aiBubble,
                { backgroundColor: currentTheme.cardBackground }
              ]}
            >
              <View style={styles.typingContainer}>
                <Animated.View 
                  style={[
                    styles.typingDot, 
                    { 
                      backgroundColor: currentTheme.textSecondary,
                      opacity: typingAnimation 
                    }
                  ]}
                />
                <Animated.View 
                  style={[
                    styles.typingDot, 
                    { 
                      backgroundColor: currentTheme.textSecondary,
                      opacity: typingAnimation 
                    }
                  ]}
                />
                <Animated.View 
                  style={[
                    styles.typingDot, 
                    { 
                      backgroundColor: currentTheme.textSecondary,
                      opacity: typingAnimation 
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.inputContainerWrapper}>
          {pendingUsernameRecipient && (
            <View style={styles.confirmationChip}>
              {pendingUsernameRecipient.type === 'contact' ? (
                <Text style={styles.confirmationChipText}>
                  Send to {pendingUsernameRecipient.name} ({pendingUsernameRecipient.address.slice(0, 6)}...{pendingUsernameRecipient.address.slice(-4)})
                </Text>
              ) : (
                <Text style={styles.confirmationChipText}>
                  Send to @{pendingUsernameRecipient.username} ({pendingUsernameRecipient.selectedWallet?.address.slice(0, 6)}...{pendingUsernameRecipient.selectedWallet?.address.slice(-4)})
                </Text>
              )}
              <TouchableOpacity onPress={() => setPendingUsernameRecipient(null)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleOpenContactsModal}
            >
              <Text style={{ fontSize: 20 }}>💳</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSend}
              disabled={isTyping || input.trim() === ''}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      {/* Transaction Share Modal */}
      {selectedTransaction && (
        <TransactionShareModal
          visible={isShareModalVisible}
          onClose={handleCloseShareModal}
          transaction={selectedTransaction}
        />
      )}
      
      {/* Transaction Preview Modal */}
      {transactionDetails && (
        <TransactionPreviewModal
          isVisible={isPreviewModalVisible}
          onClose={handleClosePreviewModal}
          onConfirm={handleTransactionConfirm}
          transactionDetails={transactionDetails}
        />
      )}
      
      {/* Contacts Modal */}
      <Modal
        visible={showContactsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>Select Contact</Text>
              <TouchableOpacity onPress={() => setShowContactsModal(false)} style={{ padding: 4 }}>
                <Text style={[styles.closeButton, { color: currentTheme.textPrimary }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            {contacts.length === 0 ? (
              <View style={styles.emptyContactsContainer}>
                <Text style={[styles.emptyContactsText, { color: currentTheme.textSecondary }]}>
                  No contacts found. Add contacts in the Wallet Contacts screen.
                </Text>
                <TouchableOpacity 
                  style={[styles.addContactButton, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    setShowContactsModal(false);
                    goToWalletContacts();
                  }}
                >
                  <Text style={styles.addContactButtonText}>Add Contacts</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.contactItem, { borderBottomColor: currentTheme.border }]}
                    onPress={() => handleSelectContact(item)}
                  >
                    <View>
                      <Text style={[styles.contactName, { color: currentTheme.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.contactAddress, { color: currentTheme.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
                        {item.address}
                      </Text>
                      <Text style={[styles.contactNetwork, { color: currentTheme.primary }]}>{item.network}</Text>
                    </View>
                    {item.isFavorite && (
                      <Text style={[styles.favoriteIcon, { color: '#FFD700' }]}>★</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Chat Sessions Modal */}
      <Modal
        visible={showSessionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSessionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>Chat Sessions</Text>
              <TouchableOpacity 
                style={styles.closeButtonContainer}
                onPress={() => setShowSessionsModal(false)}
              >
                <Text style={{ fontSize: 18, color: '#FFFFFF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {isLoadingSessions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={currentTheme.primary} />
                <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>Loading sessions...</Text>
              </View>
            ) : chatSessions.length > 0 ? (
              <FlatList
                data={chatSessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.sessionItem, { 
                      borderBottomColor: currentTheme.border,
                      backgroundColor: currentSessionId === item.id ? 'rgba(138, 43, 226, 0.15)' : 'transparent'
                    }]}
                    onPress={() => selectChatSession(item.id)}
                  >
                    <View style={styles.sessionItemContent}>
                      <View style={{flex: 1}}>
                        <Text 
                          style={[styles.sessionTitle, { 
                            color: currentTheme.textPrimary,
                            fontWeight: currentSessionId === item.id ? 'bold' : 'normal'
                          }]}
                        >
                          {item.title || 'Untitled Chat'}
                        </Text>
                        <Text style={[styles.sessionDate, { color: currentTheme.textSecondary }]}>
                          {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {currentSessionId === item.id && (
                          <View style={[styles.activeSessionIndicator, { backgroundColor: currentTheme.primary }]} />
                        )}
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              'Delete Session',
                              'Are you sure you want to delete this chat session?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteChatSession(item.id) }
                              ]
                            );
                          }}
                        >
                          <Text style={{ color: '#FF6B6B' }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptySessionsContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={50} color="#666" style={{marginBottom: 16}} />
                <Text style={[styles.emptySessionsText, { color: currentTheme.textSecondary }]}>
                  No chat sessions yet
                </Text>
                <Text style={[styles.emptySessionsSubtext, { color: currentTheme.textSecondary }]}>
                  Start a new conversation below
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.newSessionButton, { backgroundColor: '#8A2BE2' }]}
              onPress={createNewSession}
            >
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{marginRight: 8}} />
                <Text style={styles.newSessionButtonText}>New Chat</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Username autocomplete suggestions dropdown */}
      {showSuggestions && usernameSuggestions.length > 0 && (
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: isKeyboardVisible ? keyboardHeight + 80 : 80, // Dynamic positioning based on keyboard
          zIndex: 10,
          backgroundColor: isDark ? '#23272f' : '#fff',
          borderRadius: 12,
          marginHorizontal: 16,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
          maxHeight: 180,
        }}>
          {usernameSuggestions.map((s, idx) => (
            <TouchableOpacity
              key={s.type + s.name + (s.address || idx)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderBottomWidth: idx !== usernameSuggestions.length - 1 ? 1 : 0,
                borderBottomColor: isDark ? '#2c2f36' : '#eee',
              }}
              onPress={() => handleSelectUsernameSuggestion(s)}
            >
              <Ionicons
                name={s.type === 'contact' ? 'person-circle' : 'at'}
                size={22}
                color={isDark ? '#6cf' : '#3a6cf6'}
                style={{ marginRight: 10 }}
              />
              <Text style={{ fontWeight: '600', color: isDark ? '#fff' : '#222' }}>
                {s.type === 'contact' ? s.name : `@${s.username}`}
              </Text>
              {s.address && (
                <Text style={{ marginLeft: 8, color: isDark ? '#aaa' : '#666', fontSize: 13 }}>
                  {s.address.slice(0, 6)}...{s.address.slice(-4)}
                </Text>
              )}
              {s.type === 'user' && s.wallets && s.wallets.length > 0 && (
                <Text style={{ marginLeft: 8, color: isDark ? '#aaa' : '#666', fontSize: 13 }}>
                  {s.wallets[0].address.slice(0, 6)}...{s.wallets[0].address.slice(-4)}
                </Text>
              )}
              <Text style={{ marginLeft: 8, color: isDark ? '#aaa' : '#666', fontSize: 12 }}>
                {s.type === 'contact' ? 'Contact' : 'User'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Add extra space at the bottom */}
      <View style={styles.bottomSpacer} />
    </KeyboardAvoidingView>
  </ThemedView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark background to match screenshot
  },
  // Chat sessions modal styles
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sessionItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitle: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '500',
  },
  sessionDate: {
    fontSize: 12,
  },
  activeSessionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#8A2BE2',
  },
  deleteButton: {
    padding: 8,
  },
  emptySessionsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySessionsText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySessionsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  newSessionButton: {
    margin: 16,
    padding: 14,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newSessionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Menu styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for better readability in dark mode
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuSeparator: {
    height: 1,
    marginHorizontal: 24,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF', // White text for better readability in dark mode
  },
  topSpacer: {
    height: 40, // Add space at the top
  },
  bottomSpacer: {
    height: 30, // Add space at the bottom
  },
  selectedContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128, 128, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  selectedContactText: {
    color: '#5050B0',
    marginRight: 8,
  },
  removeContactText: {
    color: '#5050B0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactNetwork: {
    fontSize: 12,
    color: '#8A2BE2',
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#FFD700',
  },
  emptyContactsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContactsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  addContactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addContactButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  transactionCardContainer: {
    paddingHorizontal: 8,
    marginVertical: 12,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    right: -15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  sparkleText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    padding: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  inputContainerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#2A2A2A', // Darker input background to match screenshot
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#FFFFFF', // White text color for better visibility on dark background
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#8A2BE2', // Purple send button to match screenshot
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiBubbleUpgraded: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    backgroundColor: '#23272f',
    padding: 18,
    marginBottom: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderRadius: 18,
    maxWidth: '85%',
  },
  confirmationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128, 128, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  confirmationChipText: {
    color: '#5050B0',
    marginRight: 8,
  },
  requestCardContainer: {
    padding: 16,
    marginVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 16,
  },
});
