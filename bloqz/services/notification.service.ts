import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiService } from './api.service';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  notificationId: string;
  type: string;
  action?: string;
  screen?: string;
  [key: string]: any;
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    price_alert: boolean;
    staking_reward: boolean;
    security_alert: boolean;
    daily_summary: boolean;
    gas_alert: boolean;
    defi_opportunity: boolean;
    portfolio_insight: boolean;
    market_update: boolean;
    request: boolean;
  };
  quietHoursStart: string;
  quietHoursEnd: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  constructor() {
    this.setupNotificationListeners();
  }

  /**
   * Request notification permissions and register for push tokens
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      // Check if we already have a token
      if (this.expoPushToken) {
        return this.expoPushToken;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.expoPushToken);

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await apiService.updatePushToken(token);
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: 'Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('daily-summary', {
      name: 'Daily Summary',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#FF231F7C',
    });
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for incoming notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle foreground notification display
      this.handleForegroundNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle foreground notifications
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    // You can show a custom in-app notification here
    // For now, we'll just log it
    console.log('Foreground notification:', notification.request.content);
  }

  /**
   * Handle notification response (user tap)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as NotificationData;
    
    // Handle deep linking based on notification data
    if (data.action === 'open_app' && data.screen) {
      this.handleDeepLink(data.screen, data);
    }

    // Mark notification as read
    if (data.notificationId) {
      this.markNotificationAsRead(data.notificationId);
    }
  }

  /**
   * Handle deep linking to specific screens
   */
  private handleDeepLink(screen: string, data: NotificationData): void {
    // Import router dynamically to avoid circular dependencies
    const { router } = require('expo-router');
    
    switch (screen) {
      case 'chat':
        router.push('/chat');
        break;
      case 'portfolio':
        router.push('/wallet-balance');
        break;
      case 'trading':
        // Navigate to trading screen (you might need to create this)
        router.push('/chat');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        router.push('/chat');
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await apiService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Send test notification
   */
  async sendTestNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            notificationId: 'test',
            type: 'test',
            action: 'open_app',
            screen: 'chat'
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * List notifications from backend
   */
  async listNotifications(page = 1, limit = 20): Promise<any[]> {
    console.log('🔍 [Notification Service] listNotifications called with page:', page, 'limit:', limit);
    try {
      const response = await apiService.getNotifications(page, limit);
      console.log('🛑 [Notification Service] API response:', response);
      if (response.success && response.data) {
        const notifications = response.data.notifications || [];
        
        // Map backend fields to frontend expected fields
        return notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.body || notification.message,
          category: notification.type, // Map 'type' to 'category'
          timestamp: notification.createdAt,
          read: notification.status === 'read' || notification.read,
          data: notification.data || {},
          isRequest: notification.isRequest || false
        }));
      }
      console.log('❌ [Notification Service] API response was not successful:', response);
      return [];
    } catch (error) {
      console.error('❌ [Notification Service] Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.listNotifications(1, 100);
      console.log('🔍 [Notification Service] getUnreadCount - Total notifications:', notifications.length);
      
      const regularUnread = notifications.filter(n => !n.read && !n.isRequest).length;
      const pendingRequests = notifications.filter(n => n.isRequest).length;
      
      console.log('🔍 [Notification Service] getUnreadCount - Regular unread:', regularUnread, 'Pending requests:', pendingRequests);
      
      const totalCount = regularUnread + pendingRequests;
      console.log('🔍 [Notification Service] getUnreadCount - Total unread count:', totalCount);
      
      return totalCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 