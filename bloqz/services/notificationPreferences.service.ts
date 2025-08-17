import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { NotificationPreferences } from './notification.service';

const STORAGE_KEYS = {
  PREFERENCES: 'notification_preferences',
  PUSH_TOKEN: 'push_token',
  LAST_SYNC: 'notification_last_sync',
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    price_alert: true,
    staking_reward: true,
    security_alert: true,
    daily_summary: true,
    gas_alert: false,
    defi_opportunity: true,
    portfolio_insight: true,
    market_update: true,
    request: true,
  },
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

class NotificationPreferencesService {
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private isInitialized = false;

  /**
   * Initialize preferences from storage and backend
   */
  async initialize(): Promise<void> {
    try {
      // Load from local storage first
      await this.loadFromStorage();
      
      // Sync with backend
      await this.syncWithBackend();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
      // Use default preferences if sync fails
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  /**
   * Load preferences from local storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading preferences from storage:', error);
    }
  }

  /**
   * Save preferences to local storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Error saving preferences to storage:', error);
    }
  }

  /**
   * Sync preferences with backend
   */
  private async syncWithBackend(): Promise<void> {
    try {
      const response = await apiService.getNotificationPreferences();
      if (response.data) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...response.data };
        await this.saveToStorage();
      }
    } catch (error) {
      console.error('Error syncing preferences with backend:', error);
      // If backend sync fails, try to upload local preferences
      await this.uploadToBackend();
    }
  }

  /**
   * Upload preferences to backend
   */
  private async uploadToBackend(): Promise<void> {
    try {
      await apiService.updateNotificationPreferences(this.preferences);
    } catch (error) {
      console.error('Error uploading preferences to backend:', error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    
    // Save to storage immediately
    await this.saveToStorage();
    
    // Sync with backend
    await this.uploadToBackend();
  }

  /**
   * Update a specific category
   */
  async updateCategory(category: keyof NotificationPreferences['categories'], enabled: boolean): Promise<void> {
    await this.updatePreferences({
      categories: {
        ...this.preferences.categories,
        [category]: enabled,
      },
    });
  }

  /**
   * Toggle overall notifications
   */
  async toggleNotifications(enabled: boolean): Promise<void> {
    await this.updatePreferences({ enabled });
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(start: string, end: string): Promise<void> {
    await this.updatePreferences({
      quietHoursStart: start,
      quietHoursEnd: end,
    });
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.preferences.enabled;
  }

  /**
   * Check if a specific category is enabled
   */
  isCategoryEnabled(category: keyof NotificationPreferences['categories']): boolean {
    return this.preferences.enabled && this.preferences.categories[category];
  }

  /**
   * Check if we're in quiet hours
   */
  isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startMinutes = this.timeToMinutes(this.preferences.quietHoursStart);
    const endMinutes = this.timeToMinutes(this.preferences.quietHoursEnd);
    
    if (startMinutes <= endMinutes) {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }

  /**
   * Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Reset to default preferences
   */
  async resetToDefaults(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.saveToStorage();
    await this.uploadToBackend();
  }

  /**
   * Get notification categories with labels
   */
  getCategoriesWithLabels() {
    return {
      price_alert: { label: 'Price Alerts', icon: 'trending-up-outline' },
      staking_reward: { label: 'Staking Rewards', icon: 'gift-outline' },
      security_alert: { label: 'Security Alerts', icon: 'shield-outline' },
      daily_summary: { label: 'Daily Check-ins', icon: 'sunny-outline' },
      gas_alert: { label: 'Gas Price Alerts', icon: 'speedometer-outline' },
      defi_opportunity: { label: 'DeFi Opportunities', icon: 'rocket-outline' },
      portfolio_insight: { label: 'Portfolio Updates', icon: 'analytics-outline' },
      market_update: { label: 'Market Updates', icon: 'bar-chart-outline' },
      request: { label: 'Payment Requests', icon: 'cash-outline' },
    };
  }

  /**
   * Check if preferences are initialized
   */
  isPreferencesInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService(); 