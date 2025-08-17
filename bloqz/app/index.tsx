//import "@walletconnect/react-native-compat";  
import { Platform, StyleSheet, Button, View, TouchableOpacity, Animated, Easing, Alert, Appearance } from 'react-native';
import {
  WalletConnectModal,
  useWalletConnectModal,
} from '@walletconnect/modal-react-native';
import '@walletconnect/ethereum-provider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/ThemeProvider';
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  createAppKit,
  defaultConfig,
  AppKit,
} from "@reown/appkit-ethers5-react-native";
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from "@reown/appkit-ethers5-react-native";
import { apiService } from '@/services/api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrivy } from '@privy-io/expo';
import { useLogin } from "@privy-io/expo/ui";

// Your WalletConnect project ID from WalletConnect Cloud Platform
const projectId = 'b173b150d6ee8ebac84f453641da39ce';

// Provider metadata for your app
const providerMetadata = {
  name: 'Bloqz Wallet App',
  description: 'Connect your wallet to Bloqz',
  url: 'https://bloqz.io', // Updated for local development
  icons: ['https://bloqz.io/logo.png'],
  redirect: {
    native: 'bloqz://',
    universal: 'https://bloqz.io', // Updated for local development
  },
};

const config = defaultConfig({ metadata: providerMetadata });

// 3. Define your chains
const mainnet = {
  chainId: 1,
  name: "Ethereum",
  currency: "ETH",
  explorerUrl: "https://etherscan.io",
  rpcUrl: "https://mainnet.infura.io/v3/591c10e615c04ad5a783c9d6b44f0853",
};

const polygon = {
  chainId: 137,
  name: "Polygon",
  currency: "MATIC",
  explorerUrl: "https://polygonscan.com",
  rpcUrl: "https://polygon-mainnet.infura.io/v3/591c10e615c04ad5a783c9d6b44f0853",
};

const base = {
  chainId: 8453,
  name: "Base",
  currency: "ETH",
  explorerUrl: "https://basescan.org",
  rpcUrl: "https://base-mainnet.infura.io/v3/591c10e615c04ad5a783c9d6b44f0853",
};

const arbitrum = {
  chainId: 42161,
  name: "Arbitrum",
  currency: "ETH",
  explorerUrl: "https://arbiscan.io",
  rpcUrl: "https://arb-mainnet.infura.io/v3/591c10e615c04ad5a783c9d6b44f0853",
};

const optimism = {
  chainId: 10,
  name: "Optimism",
  currency: "ETH",
  explorerUrl: "https://optimistic.etherscan.io",
  rpcUrl: "https://optimism-mainnet.infura.io/v3/591c10e615c04ad5a783c9d6b44f0853",
};

const solana = {
  chainId: 101,
  name: "Solana",
  currency: "SOL",
  explorerUrl: "https://solscan.io",
  rpcUrl: "https://purple-flashy-tent.solana-mainnet.quiknode.pro/e792ad1c2a839ee7468f87d1592bec5921e8d915/",
};

const chains = [mainnet, polygon, base, arbitrum, optimism, solana];

// 4. Create modal
createAppKit({
  projectId,
  chains,
  config,
  themeMode: 'dark',
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
});

export default function HomeScreen() {
  // const { address, open, isConnected, provider } = useWalletConnectModal();
  //const { theme, toggleTheme, currentTheme } = useTheme();
  let theme, toggleTheme, currentTheme;
  try {
    ({ theme, toggleTheme, currentTheme } = useTheme());
  } catch (e) {
    console.log(e);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>ThemeProvider is missing! Please wrap your app in ThemeProvider.</ThemedText>
      </View>
    );
  }
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider();
  const { disconnect } = useDisconnect();

  const { user: privyUser, isReady, logout: privyLogout } = usePrivy();
  const [error, setError] = useState("");
  const { login,  } = useLogin();
  
  // Animation values
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Animation timeout refs - moved to component scope
  const sparkleTimeoutRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  
  // Effect to navigate to UserProfile when wallet is connected
  useEffect(() => {
    const connectWalletAndGetProfile = async () => {
      if (isConnected && address && !isConnecting) {
        setIsConnecting(true);
        // Add delay to let wallet connection stabilize and prevent crash
        setTimeout(async () => {
          try {
            setCheckingProfile(true);
            // Optionally, get network and walletType from your wallet provider/context
            const network = undefined; // Set this if you have chainId info
            const walletType = walletProvider?.name || undefined;
            // Clear old token before connecting new wallet
            await apiService.clearToken();
            const response = await apiService.walletConnect(address, network, walletType);
            console.log('response from walletConnect endpoint;', response);
            if (response) {
              await AsyncStorage.setItem('auth_token', (response as any).token);
              
              // Add additional delay to ensure app is fully mounted and router is ready
              setTimeout(() => {
                try {
                  // Check if router is ready before navigating
                  if (router && typeof router.push === 'function') {
                    if ((response as any).user && (response as any).user.username) {
                      router.push('/chat');
                    } else {
                      router.push('/user-profile');
                    }
                  } else {
                    console.log('Router not ready, waiting...');
                    // Wait longer and try again
                    setTimeout(() => {
                      try {
                        if (router && typeof router.push === 'function') {
                          if ((response as any).user && (response as any).user.username) {
                            router.push('/chat');
                          } else {
                            router.push('/user-profile');
                          }
                        }
                      } catch (finalNavError) {
                        console.error('Final navigation attempt failed:', finalNavError);
                      }
                    }, 2000);
                  }
                } catch (navError) {
                  console.error('Navigation error:', navError);
                  // Fallback: try to navigate after a longer delay
                  setTimeout(() => {
                    try {
                      if (router && typeof router.push === 'function') {
                        if ((response as any).user && (response as any).user.username) {
                          router.push('/chat');
                        } else {
                          router.push('/user-profile');
                        }
                      }
                    } catch (finalNavError) {
                      console.error('Final navigation attempt failed:', finalNavError);
                    }
                  }, 2000);
                }
              }, 1000); // Increased delay to 1 second to ensure app is mounted
            } else {
              setTimeout(() => {
                try {
                  if (router && typeof router.push === 'function') {
                    router.push('/user-profile');
                  }
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }, 1000);
            }
          } catch (e) {
            console.error('Wallet connection error:', e);
            setTimeout(() => {
              try {
                if (router && typeof router.push === 'function') {
                  router.push('/user-profile');
                }
              } catch (navError) {
                console.error('Navigation error:', navError);
              }
            }, 1000);
          } finally {
            setCheckingProfile(false);
            setIsConnecting(false);
          }
        }, 2000); // 2 second delay to prevent crash
      }
    };
    connectWalletAndGetProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);
  
  // Start animations when component mounts
  useEffect(() => {
    let isMounted = true;

    // Single sparkle animation
    const animateSparkle = () => {
      if (!isMounted) return;
      
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          sparkleTimeoutRef.current = setTimeout(animateSparkle, 2000);
        }
      });
    };

    // Start button pulse animation randomly
    const startPulseAnimation = () => {
      if (!isMounted) return;
      
      const randomDelay = Math.floor(Math.random() * 5000) + 5000;
      pulseTimeoutRef.current = setTimeout(() => {
        if (!isMounted) return;
        
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 1.05,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
          }),
        ]).start(() => {
          if (isMounted) {
            startPulseAnimation();
          }
        });
      }, randomDelay);
    };

    // Start both animations only when not connected
    if (!isConnected) {
      animateSparkle();
      startPulseAnimation();
    }

    return () => {
      isMounted = false;
      sparkleOpacity.stopAnimation();
      buttonScale.stopAnimation();
      if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [isConnected]);
  
  // Stop animations immediately when wallet connects to prevent conflicts
  useEffect(() => {
    if (isConnected) {
      // Stop all animations immediately to prevent state conflicts
      sparkleOpacity.stopAnimation();
      buttonScale.stopAnimation();
      // Clear any pending animation timeouts
      if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    }
  }, [isConnected]);
  
  const handleConnection = async () => {
    try {
      if (isConnected) {
        return disconnect();
      }
      return open();
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };
  
  const signMessage = async () => {
    if (!isConnected || !address) return;
    
    try {
      await walletProvider?.request({
        method: 'personal_sign',
        params: ['Hello from Bloqz!', address],
      });
    } catch (error) {
      console.error('Error signing message:', error);
    }
  };
  // Create styles with current theme
  const styles = createThemedStyles(currentTheme);

  if (checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Loading your profile...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Theme Toggle Button */}
      {/* <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.themeButton}
          onPress={toggleTheme}
        >
          <ThemedText style={styles.themeButtonText}>
            {theme === 'dark' || 
             (theme === 'system' && Appearance.getColorScheme() === 'dark') 
              ? '☀️' : '🌙'}
          </ThemedText>
        </TouchableOpacity>
      </View> */}
      <AppKit/>
      <ThemedView style={styles.walletContainer}>
        <ThemedView style={styles.buttonContainer} noBackground>
          {!isConnected ? (
            <Animated.View style={{
              transform: [{ scale: buttonScale }],
              position: 'relative',
              alignItems: 'center',
              width: '100%',
              backgroundColor: 'transparent',
              padding: 16,
            }}>
              {/* Sparkle animation (single) */}
              <Animated.Text style={[
                styles.sparkle,
                { opacity: sparkleOpacity, top: -15, right: 40 }
              ]}>✨</Animated.Text>

              {privyUser && isReady && (
                <TouchableOpacity
                  style={[styles.disconnectButton, { marginTop: 0, marginBottom: 10 }]}
                  onPress={() => privyLogout()}
                >
                  <ThemedText style={styles.buttonText}>
                    Logout
                  </ThemedText>
                </TouchableOpacity>
              )}

              {!privyUser && isReady && (
                <>
              {/* Privy login button */}
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: '#007AFF', marginTop: 0, marginBottom: 16 }]}
                onPress={async () => {
                  try {
                    console.log("Logging in with Privy. isReady:", isReady);
                    const session = await login({ loginMethods: ["email", "google", "github", "discord", "twitter", "tiktok"] });
                    console.log("session:", session);
                    console.log("User logged in:", session.user);

                    // Call your backend API with the Privy user object
                    const response = await apiService.privyAuth((session as any).user);
                    console.log("saved the privy user to the backend");

                    // Store the token for authenticated requests
                    if (response && response.token) {
                      await AsyncStorage.setItem('auth_token', response.token);
                    }

                    // Optionally, store user info or navigate
                    if (response && (response as any).user && (response as any).user.username) {
                      //router.push('/chat');
                    } else {
                      router.push('/user-profile');
                    }
                  } catch (err) {
                    setError(JSON.stringify((err as any).error || (err as any).message));
                  }
                }}
              >
                {/* Slanted Recommended Badge */}
                <View style={styles.recommendedBadge}>
                  <ThemedText style={styles.recommendedText}>Recommended</ThemedText>
                </View>
                <ThemedText style={styles.buttonText}>
                  Login
                </ThemedText>
              </TouchableOpacity>
                {/* Add spacing between the two buttons */}
                <View style={{ height: 24 }} />
                {/* Connect wallet button */}
                <TouchableOpacity
                  style={[styles.connectButton, { width: 170, paddingVertical: 8 }]}
                  onPress={handleConnection}
                >
                  <ThemedText style={[styles.buttonText, { fontSize: 14 }]}>Connect Wallet</ThemedText>
              </TouchableOpacity>
              </>
              )}
              
              {/* Connect wallet button */}
              {/* <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnection}
              >
                <ThemedText style={styles.buttonText}>
                  Connect Wallet
                </ThemedText>
              </TouchableOpacity> */}
              
              {/* Skip buttons */}
              <ThemedView style={styles.skipButtonsContainer} noBackground>
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={() => router.push('/user-profile')}
                >
                  <ThemedText style={styles.skipText}>
                    Go to Profile
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={() => router.push('/chat')}
                >
                  <ThemedText style={styles.skipText}>
                    Go to Chat
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleConnection}
            >
              <ThemedText style={styles.buttonText}>
                Disconnect
              </ThemedText>
            </TouchableOpacity>
          )}
          
          {isConnected && (
            <ThemedView style={styles.connectedInfo}>
              <ThemedText type="subtitle">Connected Address:</ThemedText>
              <ThemedText style={styles.addressText}>{address}</ThemedText>
              {/* <TouchableOpacity
                style={styles.signButton}
                onPress={signMessage}
              >
                <ThemedText style={styles.buttonText}>
                  Sign Message
                </ThemedText>
              </TouchableOpacity> */}
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
      {/* <AppKit/> */}
      
      {/* WalletConnect Modal
      <WalletConnectModal
        projectId={projectId}
        providerMetadata={providerMetadata}
        sessionParams={{
          namespaces: {
            eip155: {
              methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
              chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10', 'eip155:8453', 'eip155:11155111', 'eip155:56', 'eip155:43114', 'eip155:1101', 'eip155:250'],
              events: ['chainChanged', 'accountsChanged']
            },
            solana: {
              methods: ['signTransaction', 'signMessage'],
              chains: ['solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ', 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K', 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z'],
              events: ['accountChanged']
            }
          }
        }}
        themeMode="dark"
      /> */}
    </View>
  );
}



// Create styles with theme colors
const createThemedStyles = (theme: ThemeColors) => StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 18,
    color: theme.textPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  walletContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.background,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    shadowColor: theme.textPrimary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disconnectButton: {
    backgroundColor: theme.error,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    shadowColor: theme.textPrimary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  signButton: {
    backgroundColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: theme.textPrimary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  connectedInfo: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: theme.cardBackground,
    width: '100%',
    gap: 8,
    alignItems: 'center',
    shadowColor: theme.textPrimary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 5,
    color: theme.textPrimary,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    zIndex: 1,
    right: 0,
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
  skipButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    backgroundColor: theme.background,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -14,
    left: -18,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 0,
    transform: [{ rotate: '-18deg' }],
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendedText: {
    color: '#333',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
