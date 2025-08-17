import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { notificationService } from '../services/notification.service';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api.service';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  timestamp: string;
  read: boolean;
  data?: {
    requestId?: string;
    senderId?: string;
    senderUsername?: string;
    amount?: string;
    token?: string;
    network?: string;
    message?: string;
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  price_alert: 'trending-up-outline',
  staking_reward: 'leaf-outline',
  security_alert: 'shield-outline',
  daily_summary: 'calendar-outline',
  gas_alert: 'flash-outline',
  defi_opportunity: 'rocket-outline',
  portfolio_insight: 'pie-chart-outline',
  market_update: 'stats-chart-outline',
  request: 'cash-outline',
  token_request: 'cash-outline',
  request_response: 'cash-outline',
  request_cancelled: 'close-circle-outline',
  default: 'notifications-outline',
};

const NotificationCenter: React.FC = () => {
  const { currentTheme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        console.log('🔍 [NotificationCenter] Starting to fetch notifications...');
        // Use a higher limit to ensure we get all notifications, especially request notifications
        const notifs = await notificationService.listNotifications(1, 100);
        console.log('🔍 [NotificationCenter] Fetched notifications:', notifs);
        console.log('🔍 [NotificationCenter] Notification count:', notifs?.length || 0);
        console.log('🔍 [NotificationCenter] Notification types:', notifs.map(n => ({ id: n.id, category: n.category, data: n.data })));
        setNotifications(notifs || []);
      } catch (error) {
        console.error('🔍 [NotificationCenter] Error fetching notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleNotificationPress = async (item: NotificationItem) => {
    console.log('🔍 Notification pressed:', item);
    console.log('🔍 Category:', item.category);
    console.log('🔍 Data:', item.data);
    
    // Mark notification as read
    if (!item.read) {
      try {
        await notificationService.markNotificationAsRead(item.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === item.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle request notifications
    if ((item.category === 'request' || item.category === 'token_request' || item.category === 'request_response' || item.category === 'request_cancelled') && item.data?.requestId) {
      console.log('🔍 Detected request notification, handling...');
      await handleRequestNotification(item);
      return;
    }

    console.log('🔍 Not a request notification, handling as regular notification');
    // Handle other notification types
    switch (item.category) {
      case 'price_alert':
        router.push('/wallet-balance');
        break;
      case 'portfolio_insight':
        router.push('/wallet-balance');
        break;
      case 'market_update':
        router.push('/chat');
        break;
      default:
        router.push('/chat');
    }
  };

  const handleRequestNotification = async (notification: NotificationItem) => {
    try {
      console.log('🔍 Processing request notification:', notification);
      console.log('🔍 Request ID:', notification.data?.requestId);
      
      // Use notification data directly instead of making API call
      // The notification already contains all the necessary information
      const requestData = {
        id: notification.data?.requestId,
        amount: notification.data?.amount,
        token: notification.data?.token,
        network: notification.data?.network,
        message: notification.data?.message || '',
        status: 'pending', // Request notifications are always pending
        createdAt: notification.timestamp,
        sender: {
          id: notification.data?.senderId,
          username: notification.data?.senderUsername || 'Unknown User',
          profileImageUrl: undefined
        }
      };
      
      console.log('🔍 Constructed request data from notification:', requestData);
      
      // Check if there's an active chat session
      const sessionsResponse = await apiService.getChatSessions(1, 1);
      let sessionId = null;
      
      if (sessionsResponse.success && sessionsResponse.data?.sessions && sessionsResponse.data.sessions.length > 0) {
        // Use the most recent session
        sessionId = sessionsResponse.data.sessions[0].id;
      } else {
        // Create a new chat session
        const newSessionResponse = await apiService.createChatSession(
          `Request from ${notification.data?.senderUsername || 'User'}`
        );
        if (newSessionResponse.success && newSessionResponse.session) {
          sessionId = newSessionResponse.session.id;
        }
      }

      if (sessionId) {
        const params = { 
          sessionId,
          showRequest: notification.data?.requestId,
          requestData: JSON.stringify(requestData)
        };
        console.log('🔍 Navigating to chat with params:', params);
        
        // Navigate to chat with request context
        router.push({
          pathname: '/chat',
          params: params
        });
      }
    } catch (error) {
      console.error('Error handling request notification:', error);
      // Fallback to chat
      router.push('/chat');
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.read ? currentTheme.cardBackground : '#23272f' }]}
      activeOpacity={0.85}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={CATEGORY_ICONS[item.category] as any || CATEGORY_ICONS.default as any}
          size={28}
          color={item.read ? '#8A2BE2' : '#FFD700'}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: currentTheme.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.message, { color: currentTheme.textSecondary }]} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  function formatTime(ts: string) {
    const date = new Date(ts);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: currentTheme.background }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>Notifications</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={60} color="#666" style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#23272f',
    backgroundColor: 'transparent',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  iconContainer: { marginRight: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  message: { fontSize: 15, marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#aaa' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default NotificationCenter; 