import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useAppKitAccount, useDisconnect } from "@reown/appkit-ethers5-react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { usePrivy, getUserEmbeddedEthereumWallet, getUserEmbeddedSolanaWallet } from '@privy-io/expo';
import { notificationPreferencesService } from '../services/notificationPreferences.service';
import * as Clipboard from 'expo-clipboard';

const NOTIFICATION_CATEGORIES = [
  { key: 'price_alert', label: 'Price Alerts', icon: 'trending-up-outline' },
  { key: 'staking_reward', label: 'Staking Rewards', icon: 'leaf-outline' },
  { key: 'security_alert', label: 'Security Alerts', icon: 'shield-outline' },
  { key: 'daily_summary', label: 'Daily Summary', icon: 'calendar-outline' },
  { key: 'gas_alert', label: 'Gas Price Alerts', icon: 'flash-outline' },
  { key: 'defi_opportunity', label: 'DeFi Opportunities', icon: 'rocket-outline' },
  { key: 'portfolio_insight', label: 'Portfolio Insights', icon: 'pie-chart-outline' },
  { key: 'market_update', label: 'Market Updates', icon: 'stats-chart-outline' },
];

const SettingsScreen: React.FC = () => {
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const isDark = theme === 'dark';
  
  const [pushNotifications, setPushNotifications] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Privy wallet support
  const { user: privyUser } = usePrivy();
  const privyEvmAccount = getUserEmbeddedEthereumWallet(privyUser);
  const privySolanaAccount = getUserEmbeddedSolanaWallet(privyUser);
  const { logout: privyLogout } = usePrivy();
  
  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        // Load settings
        const pushSetting = await AsyncStorage.getItem('pushNotifications');
        const txSetting = await AsyncStorage.getItem('transactionAlerts');
        const priceSetting = await AsyncStorage.getItem('priceAlerts');
        const bioSetting = await AsyncStorage.getItem('biometricEnabled');
        
        if (pushSetting !== null) setPushNotifications(pushSetting === 'true');
        if (txSetting !== null) setTransactionAlerts(txSetting === 'true');
        if (priceSetting !== null) setPriceAlerts(priceSetting === 'true');
        if (bioSetting !== null) setBiometricEnabled(bioSetting === 'true');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    // Load notification preferences
    const loadNotificationPrefs = async () => {
      try {
        const prefs = await notificationPreferencesService.getPreferences();
        setNotificationPrefs(prefs.categories || {});
        setPrefsLoaded(true);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };
    
    loadSettings();
    loadNotificationPrefs();
  }, []);
  
  const handleTogglePushNotifications = async (value: boolean) => {
    setPushNotifications(value);
    await AsyncStorage.setItem('pushNotifications', value.toString());
  };
  
  const handleToggleTransactionAlerts = async (value: boolean) => {
    setTransactionAlerts(value);
    await AsyncStorage.setItem('transactionAlerts', value.toString());
  };
  
  const handleTogglePriceAlerts = async (value: boolean) => {
    setPriceAlerts(value);
    await AsyncStorage.setItem('priceAlerts', value.toString());
  };
  
  const handleToggleBiometric = async (value: boolean) => {
    setBiometricEnabled(value);
    await AsyncStorage.setItem('biometricEnabled', value.toString());
  };

  const handleToggleNotificationCategory = async (category: string, value: boolean) => {
    const updatedPrefs = { ...notificationPrefs, [category]: value };
    setNotificationPrefs(updatedPrefs);
    await notificationPreferencesService.updateCategory(
      category as 'price_alert' | 'staking_reward' | 'security_alert' | 'daily_summary' | 'gas_alert' | 'defi_opportunity' | 'portfolio_insight' | 'market_update',
      value
    );
  };
  
  const handleDisconnectWallet = async () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to disconnect wallet...');
              if (privyUser) {
                await privyLogout();
              } else {
                await disconnect();
              }
              // Navigate back to home screen
              router.push('/');
              // Show success message
              Alert.alert('Success', 'Wallet disconnected successfully');
            } catch (error) {
              console.error('Error disconnecting wallet:', error);
              Alert.alert('Error', 'An unexpected error occurred while disconnecting');
            }
          },
        },
      ]
    );
  };
  
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will log you out.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all app storage except theme preference
              const themePreference = await AsyncStorage.getItem('theme');
              await AsyncStorage.clear();
              if (themePreference) {
                await AsyncStorage.setItem('theme', themePreference);
              }
              
              // Disconnect wallet and navigate to home screen
              await disconnect();
              router.push('/');
              
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };
  
  const openPrivacyPolicy = () => {
    Linking.openURL('https://bloqz.io/privacy-policy');
  };
  
  const openTermsOfService = () => {
    Linking.openURL('https://bloqz.io/terms-of-service');
  };
  
  const openSupportPage = () => {
    Linking.openURL('https://bloqz.io/support');
  };
  
  const renderSettingItem = (
    title: string,
    icon: string,
    value?: boolean,
    onToggle?: (value: boolean) => void,
    onPress?: () => void
  ) => {
    return (
      <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: isDark ? '#333333' : '#f0f0f0' }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.settingItemLeft}>
          <Ionicons name={icon as any} size={24} color={currentTheme.textSecondary} style={styles.settingIcon} />
          <Text style={[styles.settingTitle, { color: currentTheme.textPrimary }]}>{title}</Text>
        </View>
        
        {onToggle !== undefined && value !== undefined ? (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: '#d1d1d1', true: currentTheme.primary }}
            thumbColor={value ? '#ffffff' : '#f4f3f4'}
            ios_backgroundColor={isDark ? '#333' : '#d1d1d1'}
          />
        ) : onPress && (
          <Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  // Helper to handle copy and feedback
  const handleCopyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1200);
  };
  
  return (
    <ThemedView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.background }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={currentTheme.textPrimary}
          />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>Settings</ThemedText>
      </View>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.section, { backgroundColor: currentTheme.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: '#fff' }]}>Account</ThemedText>
          
          {/* WalletConnect Wallet */}
          {isConnected && address && (
            <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.walletLabel, { color: currentTheme.textSecondary }]}>WalletConnect Wallet</Text>
              <TouchableOpacity onPress={() => handleCopyAddress(address)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
                <Text style={[styles.walletAddress, { color: currentTheme.textPrimary, textDecorationLine: 'underline', marginRight: 6 }]}> 
                {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'No address available'}
              </Text>
                <Ionicons name="copy-outline" size={16} color={copiedAddress === address ? currentTheme.primary : currentTheme.textSecondary} />
              </TouchableOpacity>
              {copiedAddress === address && (
                <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 2 }}>Copied!</Text>
              )}
            </View>
          )}
          {/* Privy EVM Wallet */}
          {privyEvmAccount?.address && (
            <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.walletLabel, { color: currentTheme.textSecondary }]}>Bloqz EVM Wallet</Text>
              <TouchableOpacity onPress={() => handleCopyAddress(privyEvmAccount.address)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
                <Text style={[styles.walletAddress, { color: currentTheme.textPrimary, textDecorationLine: 'underline', marginRight: 6 }]}> 
                {privyEvmAccount.address.substring(0, 6)}...{privyEvmAccount.address.substring(privyEvmAccount.address.length - 4)}
              </Text>
                <Ionicons name="copy-outline" size={16} color={copiedAddress === privyEvmAccount.address ? currentTheme.primary : currentTheme.textSecondary} />
              </TouchableOpacity>
              {copiedAddress === privyEvmAccount.address && (
                <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 2 }}>Copied!</Text>
              )}
            </View>
          )}
          {/* Privy Solana Wallet */}
          {privySolanaAccount?.address && (
            <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
              <Text style={[styles.walletLabel, { color: currentTheme.textSecondary }]}>Bloqz Solana Wallet</Text>
              <TouchableOpacity onPress={() => handleCopyAddress(privySolanaAccount.address)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
                <Text style={[styles.walletAddress, { color: currentTheme.textPrimary, textDecorationLine: 'underline', marginRight: 6 }]}> 
                {privySolanaAccount.address.substring(0, 6)}...{privySolanaAccount.address.substring(privySolanaAccount.address.length - 4)}
              </Text>
                <Ionicons name="copy-outline" size={16} color={copiedAddress === privySolanaAccount.address ? currentTheme.primary : currentTheme.textSecondary} />
              </TouchableOpacity>
              {copiedAddress === privySolanaAccount.address && (
                <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 2 }}>Copied!</Text>
              )}
            </View>
          )}
          
          {/* Edit Profile, Disconnect/Connect Wallet - sensitive to WalletConnect or Privy */}
          {(isConnected || privyUser) && renderSettingItem('Edit Profile', 'person-outline', undefined, undefined, () => router.push('/user-profile'))}
          {(isConnected || privyUser) ? (
            renderSettingItem('Disconnect Wallet', 'wallet-outline', undefined, undefined, handleDisconnectWallet)
          ) : (
            renderSettingItem('Connect Wallet', 'wallet-outline', undefined, undefined, () => router.push('/'))
          )}
        </View>
        
        {/* <View style={[styles.section, { backgroundColor: currentTheme.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: '#fff' }]}>Appearance</ThemedText>
          {renderSettingItem('Dark Mode', 'moon-outline', isDark, toggleTheme)}
        </View> */}
        
        <View style={[styles.section, { backgroundColor: currentTheme.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: '#fff' }]}>Notifications</ThemedText>
          {/* Dynamic notification preferences toggles */}
          {NOTIFICATION_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.settingItem, { borderBottomColor: isDark ? '#333333' : '#f0f0f0' }]}
              activeOpacity={1}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name={cat.icon as any} size={24} color={currentTheme.textSecondary} style={styles.settingIcon} />
                <Text style={[styles.settingTitle, { color: currentTheme.textPrimary }]}>{cat.label}</Text>
              </View>
              <Switch
                value={!!notificationPrefs[cat.key]}
                onValueChange={val => handleToggleNotificationCategory(cat.key, val)}
                trackColor={{ false: '#d1d1d1', true: currentTheme.primary }}
                thumbColor={notificationPrefs[cat.key] ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor={isDark ? '#333' : '#d1d1d1'}
                disabled={!prefsLoaded}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={[styles.section, { backgroundColor: currentTheme.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: '#fff' }]}>Security</ThemedText>
          {renderSettingItem('Biometric Authentication', 'finger-print-outline', biometricEnabled, handleToggleBiometric)}
          {renderSettingItem('Clear Cache', 'trash-outline', undefined, undefined, handleClearCache)}
        </View>
        
        <View style={[styles.section, { backgroundColor: currentTheme.cardBackground }]}>
          <ThemedText style={[styles.sectionTitle, { color: '#fff' }]}>Support</ThemedText>
          {renderSettingItem('Privacy Policy', 'shield-outline', undefined, undefined, openPrivacyPolicy)}
          {renderSettingItem('Terms of Service', 'document-text-outline', undefined, undefined, openTermsOfService)}
          {renderSettingItem('Help & Support', 'help-circle-outline', undefined, undefined, openSupportPage)}
        </View>
        
        <View style={styles.footer}>
          <Text style={[styles.version, { color: currentTheme.textSecondary }]}>Bloqz v1.0.0</Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
  },
  walletInfo: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  walletLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  version: {
    fontSize: 14,
  },
});

export default SettingsScreen;
