import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { notificationService } from '../services/notification.service';

interface NotificationBadgeProps {
  size?: number;
  onPress?: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  size = 20, 
  onPress 
}) => {
  const { currentTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    
    // Set up interval to refresh badge count
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (unreadCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[
        styles.badge, 
        { 
          backgroundColor: currentTheme.primary,
          width: size,
          height: size,
          borderRadius: size / 2,
        }
      ]} 
      onPress={onPress}
      disabled={loading}
    >
      <Text style={[
        styles.badgeText, 
        { 
          color: '#ffffff',
          fontSize: Math.max(10, size * 0.4),
        }
      ]}>
        {unreadCount > 99 ? '99+' : unreadCount.toString()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 