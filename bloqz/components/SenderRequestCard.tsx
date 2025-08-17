import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface SenderRequestCardProps {
  request: {
    id: string;
    amount: string;
    token: string;
    network: string;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    createdAt: string;
    recipients: Array<{
      id: string;
      username: string;
      profileImageUrl?: string;
    }>;
  };
  onPress: () => void;
  onCancel?: () => void;
}

export default function SenderRequestCard({ request, onPress, onCancel }: SenderRequestCardProps) {
  const { currentTheme } = useTheme();

  const getStatusColor = () => {
    switch (request.status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#2ecc40';
      case 'declined':
        return '#ff4136';
      case 'expired':
        return '#666';
      case 'cancelled':
        return '#666';
      default:
        return '#FFA500';
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'declined':
        return 'close-circle-outline';
      case 'expired':
        return 'timer-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'time-outline';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const recipientList = request.recipients.map(r => r.username).join(', ');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="cash-outline"
            size={24}
            color={getStatusColor()}
          />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>
            Request {request.amount} {request.token}
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            To: {recipientList}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="globe-outline" size={14} color="#8A2BE2" />
            <Text style={[styles.detailText, { color: currentTheme.textSecondary }]}>
              {request.network}
            </Text>
          </View>
        </View>

        {request.message && (
          <View style={styles.messageContainer}>
            <Text style={[styles.messageText, { color: currentTheme.textSecondary }]} numberOfLines={2}>
              "{request.message}"
            </Text>
          </View>
        )}

        <Text style={styles.timestamp}>{formatTime(request.createdAt)}</Text>
      </View>

      {request.status === 'pending' && onCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Ionicons name="close" size={18} color="#ff4136" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    marginLeft: 52,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(138, 43, 226, 0.3)',
  },
  messageText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  cancelButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 65, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 