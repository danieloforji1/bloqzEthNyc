import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface RecipientRequestCardProps {
  request: {
    id: string;
    amount: string;
    token: string;
    network: string;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    createdAt: string;
    sender: {
      id: string;
      username: string;
      profileImageUrl?: string;
    };
  };
  onPress: () => void;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
}

export default function RecipientRequestCard({ 
  request, 
  onPress, 
  onAccept, 
  onDecline 
}: RecipientRequestCardProps) {
  const { currentTheme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handleAction = async (actionType: 'accept' | 'decline') => {
    if (request.status !== 'pending') {
      Alert.alert('Request Already Processed', 'This request has already been processed.');
      return;
    }

    setIsProcessing(true);
    setAction(actionType);

    try {
      if (actionType === 'accept') {
        await onAccept(request.id);
      } else {
        await onDecline(request.id);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to ${actionType} request. Please try again.`
      );
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isProcessing}
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
            Request from {request.sender.username}
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            {request.amount} {request.token} on {request.network}
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
        {request.message && (
          <View style={styles.messageContainer}>
            <Text style={[styles.messageText, { color: currentTheme.textSecondary }]} numberOfLines={2}>
              "{request.message}"
            </Text>
          </View>
        )}

        <Text style={styles.timestamp}>{formatTime(request.createdAt)}</Text>
      </View>

      {/* Action Buttons - Only show for pending requests */}
      {request.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleAction('decline')}
            disabled={isProcessing}
          >
            {isProcessing && action === 'decline' ? (
              <ActivityIndicator size="small" color="#ff4136" />
            ) : (
              <>
                <Ionicons name="close" size={16} color="#ff4136" />
                <Text style={styles.declineText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAction('accept')}
            disabled={isProcessing}
          >
            {isProcessing && action === 'accept' ? (
              <ActivityIndicator size="small" color="#2ecc40" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#2ecc40" />
                <Text style={styles.acceptText}>Accept & Pay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Completed Status */}
      {request.status === 'accepted' && (
        <View style={styles.completedStatus}>
          <Ionicons name="checkmark-circle" size={20} color="#2ecc40" />
          <Text style={[styles.completedText, { color: currentTheme.textSecondary }]}>
            Request accepted and paid
          </Text>
        </View>
      )}

      {request.status === 'declined' && (
        <View style={styles.completedStatus}>
          <Ionicons name="close-circle" size={20} color="#ff4136" />
          <Text style={[styles.completedText, { color: currentTheme.textSecondary }]}>
            Request declined
          </Text>
        </View>
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
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineButton: {
    borderColor: '#ff4136',
    backgroundColor: 'rgba(255, 65, 54, 0.05)',
  },
  acceptButton: {
    borderColor: '#2ecc40',
    backgroundColor: 'rgba(46, 204, 64, 0.1)',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4136',
    marginLeft: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ecc40',
    marginLeft: 6,
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 