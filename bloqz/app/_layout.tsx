//import "@walletconnect/react-native-compat";
import '../utils/backHandlerPolyfill'; // Fix BackHandler.removeEventListener deprecation
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { TransakProvider } from '../contexts/TransakContext';
import { PrivyProvider } from "@privy-io/expo";
import { PrivyElements, PrivyUIError } from "@privy-io/expo/ui";
import Constants from "expo-constants";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { base, mainnet, optimism, arbitrum, polygon } from "viem/chains";

// Import notification services
import { notificationService } from '../services/notification.service';
import { notificationPreferencesService } from '../services/notificationPreferences.service';

function NotificationInitializer() {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Initialize notification preferences
        await notificationPreferencesService.initialize();
        
        // Register for push notifications
        await notificationService.registerForPushNotifications();
        
        console.log('✅ Notifications initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    
    <PrivyProvider
      appId={Constants.expoConfig?.extra?.privyAppId}
      clientId={Constants.expoConfig?.extra?.privyClientId}
      supportedChains={[mainnet, base, optimism, arbitrum, polygon]}
      config={{
        embedded: {
            ethereum: {
                createOnLogin: 'users-without-wallets',
            },
            solana: {
              createOnLogin: 'users-without-wallets',
            },
        },
    }}
    >
      <ThemeProvider>
      <TransakProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NotificationInitializer />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="user-profile" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="wallet-contacts" />
            <Stack.Screen name="transaction-preview" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </TransakProvider>
      </ThemeProvider>
      <PrivyElements config={{appearance: {colorScheme: 'dark'}}} />
    </PrivyProvider>
  );
}
