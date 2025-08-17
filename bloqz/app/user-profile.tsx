import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAppKitAccount, useWalletInfo} from '@reown/appkit-ethers5-react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/ThemeProvider';
import { apiService } from '@/services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// No need for navigation prop with Expo Router

// Use the User interface from API service
import type { User } from '@/services/api.service';

import { PrivyUser } from "@privy-io/public-api";
import {
  usePrivy,
  useEmbeddedEthereumWallet,
  getUserEmbeddedEthereumWallet,
  PrivyEmbeddedWalletProvider,
  useLinkWithOAuth,
  useEmbeddedSolanaWallet,
  getUserEmbeddedSolanaWallet
} from "@privy-io/expo";
import { useLogin } from "@privy-io/expo/ui";

export default function UserProfileScreen() {
  const { address, isConnected, chainId } = useAppKitAccount();
  const { walletInfo } = useWalletInfo();
  const { theme, currentTheme } = useTheme();
  const { user: privyUser, isReady, logout: privyLogout } = usePrivy();
  const { login } = useLogin();
  const account = getUserEmbeddedEthereumWallet(privyUser);
  console.log("privy evm account:", account);
  const solanaAccount = getUserEmbeddedSolanaWallet(privyUser);
  console.log("solanaAccount:", solanaAccount);
  
  // API service is already initialized as a singleton
  
  // Form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailValid, setIsEmailValid] = useState(true);
  
  // Detect if email is from Privy
  const isPrivyEmail = !!(privyUser && privyUser.linked_accounts?.find(acc => acc.type === 'email'));
  
  // Load user data from API
  useEffect(() => {
    const loadUserData = async () => {
      if (!isConnected && !privyUser) {
        console.log("not connected or privy user:", isConnected, privyUser);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const response = await apiService.getUserProfile();
        console.log('User profile response:', JSON.stringify(response));
        //console.log('Wallet info:', JSON.stringify(walletInfo));
        
        if ((response as any).user) {
          // Set user data from API response
          if ((response as any).user.email) setEmail((response as any).user.email);
          if ((response as any).user.username) setUsername((response as any).user.username);
        } else {
          
          console.error('Failed to load user profile:', response.error);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [isConnected]);  // Re-fetch when connection status changes
  
  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setIsEmailValid(text === '' || validateEmail(text));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate email if provided
      if (email && !validateEmail(email)) {
        setIsEmailValid(false);
        return;
      }
      
      // Check if user is connected via WalletConnect OR has a Privy account
      const isWalletConnected = isConnected && address;
      const hasPrivyAccount = privyUser && (account?.address || solanaAccount?.address);
      
      if (!isWalletConnected && !hasPrivyAccount) {
        setError('Please connect your wallet or sign in with Privy to update your profile');
        return;
      }
      
      setIsSubmitting(true);
      
      // Prepare user data for update
      const userData: Partial<User> = {};
      if (username) userData.username = username;
      if (email) userData.email = email;
      
      // Use the appropriate wallet address based on connection type
      if (isWalletConnected) {
        // WalletConnect connection
        userData.walletAddress = address;
        if (walletInfo?.name) userData.walletType = walletInfo.name;
        if (chainId) userData.network = chainId.toString();
      } else if (hasPrivyAccount) {
        // Privy account - use the first available wallet address
        const privyAddress = account?.address || solanaAccount?.address;
        userData.walletAddress = privyAddress;
        userData.walletType = 'Privy';
        userData.network = account?.address ? 'ethereum' : 'solana';
      }
      
      console.log('⭐ userData:', userData);
      
      // Save to API
      const response = await apiService.createOrUpdateProfile(userData);
      console.log('Update profile response:', JSON.stringify(response));
      
      setIsSubmitting(false);
      
      if (response.data?.id) {
        // Show success message
        Alert.alert(
          'Profile Updated',
          'Your profile information has been saved successfully.',
          [{ text: 'OK', onPress: () => router.push('/chat') }]
        );
      } else {
        setError(response.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      setIsSubmitting(false);
      setError('Failed to save profile information. Please try again.');
      console.error('Error saving profile:', error);
    }
  };
  
  // Create styles with current theme
  const styles = createThemedStyles(currentTheme);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                    borderColor: isEmailValid ? currentTheme.border : currentTheme.error
                  }
                ]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Enter your email"
                placeholderTextColor={currentTheme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isPrivyEmail}
              />
              {!isEmailValid && (
                <Text style={[styles.errorText, { color: currentTheme.error }]}>
                  Please enter a valid email address
                </Text>
              )}
            </View>
            
            {/* Username Input */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                    borderColor: currentTheme.border
                  }
                ]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={currentTheme.textSecondary}
                autoCapitalize="none"
              />
            </View>
            
            {/* Connected Wallet Info */}
            {(isConnected && (address || account?.address)) || account?.address || solanaAccount?.address ? (
              <>
                {/* EVM Wallet */}
                {account?.address && (
                  <View style={styles.walletInfoContainer}>
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
                      Bloqz Wallets
                    </Text>
                    <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
                      <Text style={[styles.walletType, { color: currentTheme.textPrimary }]}>
                        EVM Chains
                      </Text>
                      <Text
                        style={[styles.walletAddress, { color: currentTheme.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {account.address}
                      </Text>
                    </View>
                  </View>
                )}
                {/* Solana Wallet */}
                {solanaAccount?.address && (
                  <View style={styles.walletInfoContainer}>
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
                      Bloqz Solana Wallet
                    </Text>
                    <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
                      <Text style={[styles.walletType, { color: currentTheme.textPrimary }]}>
                        Solana 
                      </Text>
                      <Text
                        style={[styles.walletAddress, { color: currentTheme.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {solanaAccount.address}
                      </Text>
                    </View>
                  </View>
                )}
                {/* WalletConnect Wallet */}
                {isConnected && address && (
                  <View style={styles.walletInfoContainer}>
                    <Text style={[styles.label, { color: currentTheme.textPrimary }]}>
                      Connected Wallet
                    </Text>
                    <View style={[styles.walletInfo, { backgroundColor: currentTheme.cardBackground }]}>
                      <Text style={[styles.walletType, { color: currentTheme.textPrimary }]}>
                        WalletConnect
                      </Text>
                      <Text
                        style={[styles.walletAddress, { color: currentTheme.textSecondary }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {address}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : null}
            
            {/* Error Message */}
            {error && (
              <Text style={[styles.errorText, { color: currentTheme.error }]}>
                {error}
              </Text>
            )}
            
            {/* Submit Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: currentTheme.primary },
                  isSubmitting && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Profile</Text>
                )}
              </TouchableOpacity>
              
              {/* Skip for now option */}
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={() => router.push('/chat')}
              >
                <Text style={[styles.skipText, { color: currentTheme.textSecondary }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Create styles with theme colors
const createThemedStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: theme.textPrimary,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 24,
    width: '80%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.textPrimary,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardBackground,
    fontSize: 16,
    color: theme.textPrimary,
  },
  walletInfoContainer: {
    marginBottom: 24,
    width: '80%',
  },
  walletInfo: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.cardBackground,
    borderWidth: 1,
    borderColor: theme.border,
  },
  walletType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.textPrimary,
  },
  walletAddress: {
    fontSize: 14,
    marginBottom: 4,
    color: theme.textSecondary,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
    color: theme.error,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButton: {
    width: '60%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    shadowColor: theme.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.textSecondary,
  },
});
