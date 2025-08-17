import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './colors';

export type ThemeType = 'dark' | 'light' | 'system';
// Define the theme colors structure explicitly to include all properties
export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
  border: string;
  gradientStart: string;
  gradientEnd: string;
};

type ThemeContextType = {
  theme: ThemeType;
  currentTheme: ThemeColors;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  
  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };
  
  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'dark' || 
                    (theme === 'system' && systemColorScheme === 'dark') 
                    ? 'light' : 'dark';
    setTheme(newTheme);
  };
  
  // Determine the actual theme colors to use
  const currentTheme = 
    theme === 'system' 
      ? systemColorScheme === 'dark' ? colors.dark : colors.light
      : theme === 'dark' ? colors.dark : colors.light;
  
  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};