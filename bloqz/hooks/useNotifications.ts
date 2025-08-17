import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notification.service';
import { notificationPreferencesService } from '../services/notificationPreferences.service';
import { NotificationPreferences } from '../services/notification.service';

export interface UseNotificationsReturn {
  // State
  isInitialized: boolean;
  isRegistered: boolean;
  permissionsGranted: boolean;
  preferences: NotificationPreferences;
  
  // Actions
  registerForNotifications: () => Promise<boolean>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  updateCategory: (category: keyof NotificationPreferences['categories'], enabled: boolean) => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  updateQuietHours: (start: string, end: string) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  resetPreferences: () => Promise<void>;
  
  // Utilities
  isEnabled: () => boolean;
  isCategoryEnabled: (category: keyof NotificationPreferences['categories']) => boolean;
  isInQuietHours: () => boolean;
  getCategoriesWithLabels: () => Record<string, { label: string; icon: string }>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationPreferencesService.getPreferences()
  );

  // Initialize on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Initialize preferences service
      await notificationPreferencesService.initialize();
      
      // Check permissions
      const permissions = await notificationService.getPermissionsStatus();
      setPermissionsGranted(permissions.status === 'granted');
      
      // Check if already registered
      const token = notificationService.getPushToken();
      setIsRegistered(!!token);
      
      // Update preferences state
      setPreferences(notificationPreferencesService.getPreferences());
      setIsInitialized(true);
      
      console.log('Notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setIsInitialized(true); // Mark as initialized even if failed
    }
  };

  const registerForNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const token = await notificationService.registerForPushNotifications();
      const success = !!token;
      setIsRegistered(success);
      
      if (success) {
        setPermissionsGranted(true);
      }
      
      return success;
    } catch (error) {
      console.error('Error registering for notifications:', error);
      return false;
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      await notificationPreferencesService.updatePreferences(updates);
      setPreferences(notificationPreferencesService.getPreferences());
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, []);

  const updateCategory = useCallback(async (
    category: keyof NotificationPreferences['categories'], 
    enabled: boolean
  ) => {
    try {
      await notificationPreferencesService.updateCategory(category, enabled);
      setPreferences(notificationPreferencesService.getPreferences());
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }, []);

  const toggleNotifications = useCallback(async (enabled: boolean) => {
    try {
      await notificationPreferencesService.toggleNotifications(enabled);
      setPreferences(notificationPreferencesService.getPreferences());
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  }, []);

  const updateQuietHours = useCallback(async (start: string, end: string) => {
    try {
      await notificationPreferencesService.updateQuietHours(start, end);
      setPreferences(notificationPreferencesService.getPreferences());
    } catch (error) {
      console.error('Error updating quiet hours:', error);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      await notificationService.sendTestNotification(
        'Test Notification',
        'This is a test notification from Bloqz! 🚀'
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, []);

  const resetPreferences = useCallback(async () => {
    try {
      await notificationPreferencesService.resetToDefaults();
      setPreferences(notificationPreferencesService.getPreferences());
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  }, []);

  const isEnabled = useCallback(() => {
    return notificationPreferencesService.isEnabled();
  }, []);

  const isCategoryEnabled = useCallback((category: keyof NotificationPreferences['categories']) => {
    return notificationPreferencesService.isCategoryEnabled(category);
  }, []);

  const isInQuietHours = useCallback(() => {
    return notificationPreferencesService.isInQuietHours();
  }, []);

  const getCategoriesWithLabels = useCallback(() => {
    return notificationPreferencesService.getCategoriesWithLabels();
  }, []);

  return {
    // State
    isInitialized,
    isRegistered,
    permissionsGranted,
    preferences,
    
    // Actions
    registerForNotifications,
    updatePreferences,
    updateCategory,
    toggleNotifications,
    updateQuietHours,
    sendTestNotification,
    resetPreferences,
    
    // Utilities
    isEnabled,
    isCategoryEnabled,
    isInQuietHours,
    getCategoriesWithLabels,
  };
}; 