import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

export interface SessionKeyData {
  validUntil: number;
  maxAmount: string;
  permissions: string;
  signature: string;
  address: string;
}

export interface SessionKeyTypedData {
  types: {
    SessionKey: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  domain: {
    name: string;
    version: string;
  };
  message: {
    validUntil: number;
    maxAmount: string;
    permissions: string;
  };
}

export class SessionKeyManager {
  private static instance: SessionKeyManager;
  private sessionKey: string | null = null;
  private sessionData: SessionKeyData | null = null;

  static getInstance(): SessionKeyManager {
    if (!SessionKeyManager.instance) {
      SessionKeyManager.instance = new SessionKeyManager();
    }
    return SessionKeyManager.instance;
  }

  /**
   * Create a session key that's valid for 24 hours
   */
  async createSession(walletProvider: any, address: string): Promise<SessionKeyData> {
    try {
      console.log('Creating session key for address:', address);
      
      const sessionData: SessionKeyData = {
        validUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        maxAmount: ethers.utils.parseEther("1.0").toString(), // 1 ETH limit
        permissions: "0x", // Basic permissions
        signature: "",
        address: address
      };

      const typedData: SessionKeyTypedData = {
        types: {
          SessionKey: [
            { name: 'validUntil', type: 'uint256' },
            { name: 'maxAmount', type: 'uint256' },
            { name: 'permissions', type: 'bytes' }
          ]
        },
        primaryType: 'SessionKey',
        domain: {
          name: 'Bloqz',
          version: '1'
        },
        message: {
          validUntil: sessionData.validUntil,
          maxAmount: sessionData.maxAmount,
          permissions: sessionData.permissions
        }
      };

      console.log('Requesting session key signature...');
      
      const signature = await walletProvider?.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      });

      if (!signature) {
        throw new Error('Failed to get session key signature');
      }

      sessionData.signature = signature;
      
      // Store session data
      this.sessionKey = signature;
      this.sessionData = sessionData;
      
      await AsyncStorage.setItem('sessionKey', signature);
      await AsyncStorage.setItem('sessionData', JSON.stringify(sessionData));
      
      console.log('Session key created successfully');
      return sessionData;
      
    } catch (error) {
      console.error('Error creating session key:', error);
      throw error;
    }
  }

  /**
   * Load existing session from storage
   */
  async loadSession(): Promise<SessionKeyData | null> {
    try {
      const signature = await AsyncStorage.getItem('sessionKey');
      const sessionDataStr = await AsyncStorage.getItem('sessionData');
      
      if (!signature || !sessionDataStr) {
        return null;
      }

      const sessionData: SessionKeyData = JSON.parse(sessionDataStr);
      sessionData.signature = signature;

      // Check if session is still valid
      if (this.isSessionValid(sessionData)) {
        this.sessionKey = signature;
        this.sessionData = sessionData;
        console.log('Loaded valid session key');
        return sessionData;
      } else {
        console.log('Session key expired, clearing...');
        await this.clearSession();
        return null;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Check if current session is valid
   */
  isSessionValid(sessionData?: SessionKeyData): boolean {
    const data = sessionData || this.sessionData;
    
    if (!data || !data.signature) {
      return false;
    }

    // Check if session has expired
    if (Date.now() > data.validUntil) {
      console.log('Session key expired');
      return false;
    }

    return true;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): SessionKeyData | null {
    return this.sessionData;
  }

  /**
   * Execute transaction using session key (no user signing required)
   */
  async executeWithSessionKey(transaction: any, apiService: any): Promise<any> {
    if (!this.sessionData || !this.isSessionValid()) {
      throw new Error('No valid session key available');
    }

    try {
      console.log('Executing transaction with session key');
      
      // Send transaction to backend with session key
      const result = await apiService.executeTransactionWithSessionKey(
        transaction,
        this.sessionData.signature,
        this.sessionData
      );

      return result;
    } catch (error) {
      console.error('Error executing with session key:', error);
      throw error;
    }
  }

  /**
   * Clear session data
   */
  async clearSession(): Promise<void> {
    try {
      this.sessionKey = null;
      this.sessionData = null;
      
      await AsyncStorage.removeItem('sessionKey');
      await AsyncStorage.removeItem('sessionData');
      
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Get session status for UI
   */
  getSessionStatus(): {
    hasValidSession: boolean;
    expiresIn: string | null;
    maxAmount: string | null;
  } {
    if (!this.isSessionValid()) {
      return {
        hasValidSession: false,
        expiresIn: null,
        maxAmount: null
      };
    }

    const expiresIn = this.sessionData!.validUntil - Date.now();
    const hoursLeft = Math.floor(expiresIn / (1000 * 60 * 60));
    const minutesLeft = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));

    return {
      hasValidSession: true,
      expiresIn: `${hoursLeft}h ${minutesLeft}m`,
      maxAmount: ethers.utils.formatEther(this.sessionData!.maxAmount)
    };
  }
}

export const sessionKeyManager = SessionKeyManager.getInstance(); 