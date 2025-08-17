import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Config from 'react-native-config';
import Constants from 'expo-constants';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;  // Add optional token field
}

// User types
export interface User {
  id: string;
  username: string;
  walletAddress: string;
  walletType: string;
  network: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

// Transaction types
export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  tokenSymbol: string;
  network: string;
  status: 'pending' | 'completed' | 'failed';
  hash: string;
  timestamp: string;
  gasUsed?: string;
  gasPrice?: string;
}

// Contact types
export interface Contact {
  id: string;
  name: string;
  address: string;
  network: string;
  notes?: string;
  createdAt: string;
}

// Chat types
export interface ChatSession {
  id: string;
  title: string;
  lastMessageAt: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Token types
export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  network: string;
  logoUrl: string;
  balance?: string;
  price?: number;
}

// Transaction intent types
export enum TransactionType {
  SEND = 'SEND',
  SWAP = 'SWAP',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  APPROVE = 'APPROVE',
  BALANCE = 'BALANCE',
  PRICE = 'PRICE',
  TRENDING = 'TRENDING',
  GAINERS = 'GAINERS',
  LOSERS = 'LOSERS',
  RECEIVE = 'RECEIVE'
}

// AI response types
export interface AIResponse {
  explanation: string;
  responseType: string;
  params?: {
    intent: TransactionType;
    [key: string]: any;
  };
  prices?: {
    symbol: string;
    price: number;
    change24h: number;
  }[];
  unsignedTransaction?: string;
  estimatedGas?: string;
  estimatedFee?: string;
  id?: string;
}

// Privy user interfaces
export interface PrivyLinkedAccount {
  address: string;
  type: 'email' | 'wallet' | 'phone' | 'twitter_oauth' | 'tiktok_oauth' | 'custom_auth';
  verified_at?: number;
  first_verified_at?: number;
  latest_verified_at?: number;
  chain_id?: string;
  chain_type?: string;
  connector_type?: string;
  delegated?: boolean;
  id?: string;
  imported?: boolean;
  recovery_method?: string;
  wallet_client?: string;
  wallet_client_type?: string;
  wallet_index?: number;
  username?: string;
  custom_user_id?: string;
}

export interface PrivyUser {
  id: string;
  created_at: number;
  has_accepted_terms: boolean;
  is_guest: boolean;
  linked_accounts: PrivyLinkedAccount[];
  mfa_methods: any[];
}

// Cache interface
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// Request deduplication
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// Achievement and social proof types for transaction sharing
export interface Achievement {
  type: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  unlockedAt: number;
}

export interface UserStats {
  totalTransactions: number;
  totalValue: number;
  networksUsed: string[];
  streakDays: number;
  rank?: string;
  networkStats?: Record<string, number>;
}

export interface SocialProof {
  networkRank: string;
  globalRank?: string;
  networkStats: {
    totalUsers: number;
    userRank: number;
  };
}

export interface TransactionShareData {
  type: string;
  amount?: string;
  tokenSymbol?: string;
  network?: string;
  to?: string;
  hash?: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  achievement?: Achievement;
  userStats?: UserStats;
  personalizedMessage?: string;
  socialProof?: SocialProof;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly WALLET_ADDRESS_KEY = 'current_wallet_address';
  private isRefreshing = false;
  private lastRefreshTime = 0;
  private readonly REFRESH_COOLDOWN = 5000; // 5 seconds cooldown
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];
  
  // Performance optimizations
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_DEDUP_TTL = 1000; // 1 second
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay
  
  constructor() {
    // Use app configuration for API URL
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || Config.API_URL || 'http://localhost:5001';
    console.log('API Service initialized with base URL:', this.baseURL);
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 25000, // Reduced from 30s to 15s for better UX
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate', // Enable compression
        'Platform': Platform.OS,
        'App-Version': Config.APP_VERSION || '1.0.0',
      },
      // Enable request/response compression
      decompress: true,
    });
    
    // Add request interceptor for auth token
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = await AsyncStorage.getItem(this.TOKEN_KEY);
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            console.log('⭐ [api.service] Token attached to request:', token.substring(0, 20) + '...');
            console.log('⭐ [api.service] Request URL:', config.url);
          } else {
            console.log('⭐ [api.service] No token found in AsyncStorage for request:', config.url);
          }
        } catch (error) {
          console.error('⭐ [api.service] Error getting token:', error);
        }
        return config;
      },
      (error: Error) => {
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor for automatic token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: any) => {
        const originalRequest = error.config;
        
        // Handle token expiration (401 errors)
        if (
          error.response &&
          error.response.status === 401 &&
          !originalRequest._retry &&
          error.response.data &&
          error.response.data.error !== 'User not found' &&
          error.response.data.message !== 'User not found' &&
          // Prevent infinite loop: don't refresh if this IS the refresh request
          !originalRequest.url?.includes('refresh-token')
        ) {
          const now = Date.now();
          
          // Check if we're in a cooldown period
          if (now - this.lastRefreshTime < this.REFRESH_COOLDOWN) {
            console.log('⏳ [API Service] Refresh cooldown active, skipping...');
            return Promise.reject(error);
          }
          
          console.log('🔍 [API Service] 401 error detected, attempting token refresh...');
          
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            console.log('⏳ [API Service] Token refresh already in progress, queuing request...');
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              console.log('🔄 [API Service] Retrying queued request...');
              return this.api(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }
          
          originalRequest._retry = true;
          this.isRefreshing = true;
          this.lastRefreshTime = now;
          
          try {
            // Get the current wallet address
            const walletAddress = await this.getCurrentWalletAddress();
            
            if (!walletAddress) {
              console.log('❌ [API Service] No wallet address found for token refresh');
              this.processQueue(null, 'No wallet address available');
              return Promise.reject(error);
            }
            
            console.log('🔍 [API Service] Refreshing token for wallet:', walletAddress);
            
            // Call the refresh token endpoint WITHOUT using the main request method
            // to avoid triggering the interceptor again
            const refreshResponse = await axios.post(`${this.baseURL}/api/users/refresh-token`, {
              walletAddress
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              timeout: 10000
            });
            
            if (refreshResponse.data.success && refreshResponse.data.data?.token) {
              console.log('✅ [API Service] Token refresh successful');
              
              // Store the new token
              await this.storeToken(refreshResponse.data.data.token);
              
              // Small delay to ensure token is stored
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Process queued requests
              this.processQueue(refreshResponse.data.data.token, null);
              
              // Update the original request with the new token before retrying
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.token}`;
              console.log('🔄 [API Service] Retrying original request with new token:', refreshResponse.data.data.token.substring(0, 20) + '...');
              
              // Retry the original request
              return this.api(originalRequest);
            } else {
              console.log('❌ [API Service] Token refresh failed:', refreshResponse.data.error);
              this.processQueue(null, refreshResponse.data.error || 'Token refresh failed');
              this.resetRefreshState();
              return Promise.reject(error);
            }
          } catch (refreshError: any) {
            console.error('❌ [API Service] Error during token refresh:', refreshError);
            this.processQueue(null, refreshError.message || 'Token refresh failed');
            this.resetRefreshState();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Start cache cleanup interval
    this.startCacheCleanup();
  }
  
  // Process queued requests after token refresh
  private processQueue(token: string | null, error: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }
  
  // Get the current wallet address from storage
  private async getCurrentWalletAddress(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.WALLET_ADDRESS_KEY);
    } catch (error) {
      console.error('Error getting current wallet address:', error);
      return null;
    }
  }
  
  // Set the current wallet address in storage
  async setCurrentWalletAddress(address: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WALLET_ADDRESS_KEY, address);
      console.log('✅ [API Service] Current wallet address stored:', address);
    } catch (error) {
      console.error('Error storing current wallet address:', error);
    }
  }
  
  // Clear the current wallet address
  async clearCurrentWalletAddress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.WALLET_ADDRESS_KEY);
      console.log('✅ [API Service] Current wallet address cleared');
    } catch (error) {
      console.error('Error clearing current wallet address:', error);
    }
  }
  
  // Reset refresh state (useful for logout or errors)
  private resetRefreshState(): void {
    this.isRefreshing = false;
    this.lastRefreshTime = 0;
    this.failedQueue = [];
    console.log('🔄 [API Service] Refresh state reset');
  }
  
  // Public method to manually trigger token refresh (for testing/debugging)
  async manualRefreshToken(): Promise<boolean> {
    try {
      const walletAddress = await this.getCurrentWalletAddress();
      if (!walletAddress) {
        console.log('❌ [API Service] No wallet address found for manual refresh');
        return false;
      }
      
      console.log('🔍 [API Service] Manual token refresh for wallet:', walletAddress);
      
      const refreshResponse = await axios.post(`${this.baseURL}/api/users/refresh-token`, {
        walletAddress
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000
      });
      
      if (refreshResponse.data.success && refreshResponse.data.data?.token) {
        console.log('✅ [API Service] Manual token refresh successful');
        await this.storeToken(refreshResponse.data.data.token);
        return true;
      } else {
        console.log('❌ [API Service] Manual token refresh failed:', refreshResponse.data.error);
        return false;
      }
    } catch (error: any) {
      console.error('❌ [API Service] Error during manual token refresh:', error);
      return false;
    }
  }
  
  // Get the base URL for debugging
  getBaseURL(): string {
    return this.baseURL;
  }
  
  // Generate cache key from request config
  private generateCacheKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    const key = `${method?.toUpperCase()}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
    return key;
  }
  
  // Get cached response if available and not expired
  private getCachedResponse(cacheKey: string): any | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(cacheKey);
      return null;
    }
    
    console.log('⭐ [api.service] Cache hit for:', cacheKey);
    return entry.data;
  }
  
  // Store response in cache
  private setCachedResponse(cacheKey: string, data: any, ttl?: number): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL
    });
    console.log('⭐ [api.service] Cached response for:', cacheKey);
  }
  
  // Check for pending request to prevent duplicates
  private getPendingRequest(cacheKey: string): Promise<any> | null {
    const pending = this.pendingRequests.get(cacheKey);
    if (!pending) return null;
    
    const now = Date.now();
    if (now - pending.timestamp > this.REQUEST_DEDUP_TTL) {
      // Pending request expired, remove it
      this.pendingRequests.delete(cacheKey);
      return null;
    }
    
    console.log('⭐ [api.service] Returning pending request for:', cacheKey);
    return pending.promise;
  }
  
  // Store pending request
  private setPendingRequest(cacheKey: string, promise: Promise<any>): void {
    this.pendingRequests.set(cacheKey, {
      promise,
      timestamp: Date.now()
    });
  }
  
  // Remove pending request
  private removePendingRequest(cacheKey: string): void {
    this.pendingRequests.delete(cacheKey);
  }
  
  // Retry logic with exponential backoff
  private async retryRequest<T>(config: AxiosRequestConfig, retries = 0): Promise<AxiosResponse<T>> {
    try {
      return await this.api(config);
    } catch (error: any) {
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
        throw error;
      }
      
      if (retries >= this.MAX_RETRIES) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = this.RETRY_DELAY * Math.pow(2, retries);
      console.log(`⭐ [api.service] Retrying request (${retries + 1}/${this.MAX_RETRIES}) in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(config, retries + 1);
    }
  }
  
  // Cache cleanup to prevent memory leaks
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      // Clean up expired pending requests
      for (const [key, pending] of this.pendingRequests.entries()) {
        if (now - pending.timestamp > this.REQUEST_DEDUP_TTL) {
          this.pendingRequests.delete(key);
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`⭐ [api.service] Cleaned up ${cleanedCount} expired cache entries`);
      }
    }, 60000); // Run cleanup every minute
  }
  
  // Check if request should be cached (GET requests only)
  private shouldCache(config: AxiosRequestConfig): boolean {
    return config.method?.toLowerCase() === 'get';
  }
  
  // Generic request method with optimizations
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(config);
    const shouldCache = this.shouldCache(config);
    
    try {
      // Check cache first for GET requests
      if (shouldCache) {
        const cachedResponse = this.getCachedResponse(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }
      }
      
      // Check for pending request to prevent duplicates
      const pendingRequest = this.getPendingRequest(cacheKey);
      if (pendingRequest) {
        return await pendingRequest;
      }
      
      // Create new request promise
      const requestPromise = this.executeRequest<T>(config, cacheKey, shouldCache);
      this.setPendingRequest(cacheKey, requestPromise);
      
      const response = await requestPromise;
      this.removePendingRequest(cacheKey);
      
      return response;
    } catch (error: any) {
      this.removePendingRequest(cacheKey);
      
      if (error.response) {
        // Server responded with an error
        return {
          success: false,
          error: error.response.data.error || error.response.data.message || 'Server error',
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          error: 'No response from server. Please check your internet connection.',
        };
      } else {
        // Error setting up the request
        return {
          success: false,
          error: error.message || 'An unexpected error occurred',
        };
      }
    }
  }
  
  // Execute the actual request with retry logic
  private async executeRequest<T>(config: AxiosRequestConfig, cacheKey: string, shouldCache: boolean): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.retryRequest<ApiResponse<T>>(config);
    
    // Cache successful GET responses
    if (shouldCache && response.data.success) {
      this.setCachedResponse(cacheKey, response.data);
    }
    
    //console.log('Api response:', response);
    return response.data;
  }
  
  // Auth methods
  async login(walletAddress: string, signature: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>({
      method: 'POST',
      url: 'api/auth/login',
      data: {
        walletAddress,
        signature,
      },
    });
    
    // Store wallet address for token refresh
    if (response.success) {
      await this.setCurrentWalletAddress(walletAddress);
    }
    
    return response;
  }
  
  async register(walletAddress: string, signature: string, username: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>({
      method: 'POST',
      url: 'api/auth/register',
      data: {
        walletAddress,
        signature,
        username,
      },
    });
    
    // Store wallet address for token refresh
    if (response.success) {
      await this.setCurrentWalletAddress(walletAddress);
    }
    
    return response;
  }
  
  async logout(): Promise<ApiResponse> {
    const response = await this.request({
      method: 'POST',
      url: 'api/auth/logout',
    });
    
    // Clear wallet address and token on logout
    await this.clearCurrentWalletAddress();
    await this.clearToken();
    
    // Reset refresh state
    this.resetRefreshState();
    
    return response;
  }
  
  async getUserProfile(): Promise<ApiResponse<User>> {
    const token = await this.getToken();
    console.log('⭐ [api.service] getUserProfile called with token:', token ? 'Token exists' : 'No token');
    const allUsers = await this.getAllUsers();
    console.log('⭐ [api.service] getAllUsers:', allUsers);
    return this.request({
      method: 'GET',
      url: 'api/users/profile',
    });
  }
  
  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request({
      method: 'PATCH',
      url: 'api/users/me',
      data,
    });
  }
  
  // Transaction methods
  async getTransactions(page = 1, limit = 20): Promise<ApiResponse<{ transactions: Transaction[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/transactions',
      params: { page, limit },
    });
  }
  
  async getTransactionDetails(transactionId: string): Promise<ApiResponse<Transaction>> {
    return this.request({
      method: 'GET',
      url: 'api/transactions' + (transactionId ? `/${transactionId}` : ''),
    });
  }
  
  async recordTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<ApiResponse<Transaction>> {
    return this.request({
      method: 'POST',
      url: 'api/transactions',
      data: transaction,
    });
  }
  
  // Transaction History methods
  async getTransactionHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    network?: string;
    search?: string;
  }): Promise<ApiResponse<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return this.request({
      method: 'GET',
      url: 'api/transactions/history',
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.network && { network: params.network }),
        ...(params?.search && { search: params.search }),
      },
    });
  }

  async getTransactionStats(): Promise<ApiResponse<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byNetwork: Record<string, number>;
  }>> {
    return this.request({
      method: 'GET',
      url: 'api/transactions/history/stats',
    });
  }
  
  // Contact methods
  async getContacts(page = 1, limit = 50): Promise<ApiResponse<{ contacts: Contact[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/contacts',
      params: { page, limit },
    });
  }
  
  async addContact(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<ApiResponse<Contact>> {
    return this.request({
      method: 'POST',
      url: 'api/contacts',
      data: contact,
    });
  }
  
  async updateContact(contactId: string, data: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.request({
      method: 'PATCH',
      url: 'api/contacts' + (contactId ? `/${contactId}` : ''),
      data,
    });
  }
  
  async deleteContact(contactId: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: 'api/contacts' + (contactId ? `/${contactId}` : ''),
    });
  }
  
  // Token/Balance methods
  async getTokenBalances(walletAddress: string, network?: string): Promise<ApiResponse<Token[]>> {
    return this.request({
      method: 'GET',
      url: 'api/tokens/balances',
      params: { walletAddress, network },
    });
  }
  
  async getTokenPrice(symbol: string): Promise<ApiResponse<{ price: number; change24h: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/tokens/price/${symbol}',
    });
  }
  
  // AI/Chat processing methods
  async processTransaction(userInput: string, walletAddress?: string, network?: string): Promise<AIResponse> {
    try {
      // Call the backend AI service to process the user input
      const response = await this.request<AIResponse>({
        method: 'POST',
        url: 'api/ai/process',
        data: {
          userInput,
          walletAddress,
          network
        }
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // If the API call fails, return an error response
      return {
        explanation: response.error || 'Sorry, I encountered an error processing your request.',
        responseType: 'ERROR'
      };
    } catch (error) {
      console.error('Error processing transaction:', error);
      return {
        explanation: 'Sorry, I encountered an error processing your request.',
        responseType: 'ERROR'
      };
    }
  }
  
  async executeTransaction(network: string, signedTransaction: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Call the backend API to broadcast the transaction to the blockchain
      const response = await this.request<{ transactionHash: string }>({ 
        method: 'POST',
        url: 'api/transactions/execute',
        data: {
          network,
          signedTransaction
        }
      });
      
      if (response.success && response.data) {
        return {
          success: true,
          transactionHash: response.data.transactionHash
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to execute transaction'
      };
    } catch (error) {
      console.error('Error executing transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Track a transaction that has been executed by the frontend
   * This updates the ChatMessage metadata with the actual transaction data
   */
  async trackTransaction(transactionData: {
    messageId: string;
    transactionHash: string;
    network: string;
    from: string;
    to?: string;
    amount: string;
    tokenSymbol: string;
    gasUsed?: string;
    blockNumber?: number;
    status: 'success' | 'pending' | 'failed';
    transactionType: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Tracking transaction in backend:', transactionData);
      
      const response = await this.request<{ success: boolean; message?: string }>({
        method: 'POST',
        url: 'api/transactions/track',
        data: transactionData
      });
      
      if (response.success) {
        console.log('✅ Transaction tracked successfully:', response.message);
        return {
          success: true
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to track transaction'
      };
    } catch (error) {
      console.error('Error tracking transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getWalletBalances(network: string, walletAddress: string): Promise<Token[]> {
    console.log('⭐ getWalletBalances walletAddress on the network:', network, walletAddress);
    try {
      // Call the backend API to get wallet balances
      const response = await this.request<{ balances: Token[] }>({
        method: 'GET',
        url: 'api/transactions/wallet/balances',
        params: {
          network,
          walletAddress
        }
      });
      
      console.log('⭐ Raw API response:', response);
      
      if ((response as any).balances) {
        console.log('⭐ Returning balances from API:', (response as any).balances);
        return (response as any).balances;
      }
      
      // If the direct API call fails, try the token balances endpoint as fallback
      const tokenBalancesResponse = await this.getTokenBalances(walletAddress, network);
      
      if (tokenBalancesResponse.success && tokenBalancesResponse.data) {
        console.log('⭐ Returning balances from fallback:', tokenBalancesResponse.data);
        return tokenBalancesResponse.data;
      }
      
      // If all API calls fail, log the error and return empty array
      console.warn('Failed to fetch wallet balances from API');
      return [];
    } catch (error) {
      console.error('Error getting wallet balances:', error);
      return [];
    }
  }
  
  
  // Chat methods
  async getChatSessions(page = 1, limit = 20): Promise<ApiResponse<{ sessions: ChatSession[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/chat/sessions',
      params: { page, limit },
    });
  }

  // Add a method to log all AsyncStorage contents
  async logAllAsyncStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('⭐ [api.service] All AsyncStorage keys:', allKeys);
      
      // const allItems = await AsyncStorage.multiGet(allKeys);
      // console.log('⭐ [api.service] All AsyncStorage contents:');
      // allItems.forEach(([key, value]) => {
      //   console.log(`  ${key}:`, value);
      // });
    } catch (error) {
      console.error('⭐ [api.service] Error reading AsyncStorage:', error);
    }
  }

  async createOrUpdateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    console.log('⭐ [api.service] Creating/Updating profile with data:', data);
    const response = await this.request<{ user: User; token: string }>({
      method: 'POST',
      url: 'api/users/profile',
      data,
    });
    
    // Log the exact response structure
    console.log('⭐ [api.service] Raw profile update response:', JSON.stringify(response, null, 2));
    
    // If we got a token in the response, store it
    if ((response as any).token) {
      console.log('⭐ [api.service] Found token in response, attempting to store...');
      const stored = await this.storeToken((response as any).token);
      if (!stored) {
        console.error('⭐ [api.service] Failed to store token in AsyncStorage');
      }
    } else {
      console.log('⭐ [api.service] No token in response. Response structure:', Object.keys(response));
    }
    
    return {
      success: response.success,
      data: (response as any).user,
      error: response.error,
      message: response.message
    };
  }

  // Token management methods
  private async storeToken(token: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      console.log('⭐ [api.service] Token stored in AsyncStorage:', token.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('⭐ [api.service] Error storing token:', error);
      return false;
    }
  }

  private async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('⭐ [api.service] Error getting token:', error);
      return null;
    }
  }

  // Make this public so it can be called from outside
  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      console.log('⭐ [api.service] Token cleared from AsyncStorage');
    } catch (error) {
      console.error('⭐ [api.service] Error clearing token:', error);
    }
  }

  // Add a method to check token status
  async checkTokenStatus(): Promise<void> {
    const token = await this.getToken();
    console.log('⭐ [api.service] Current token status:', token ? 'Token exists' : 'No token found');
    if (token) {
      console.log('⭐ [api.service] Token value:', token);
    }
  }

  // Define a more specific response type for chat session creation
  async createChatSession(title?: string, metadata?: Record<string, any>): Promise<ApiResponse<ChatSession> & { session?: ChatSession, id?: string }> {
    console.log('Creating chat session with title:', title || 'New Chat');
    
    try {
      const response = await this.request<any>({
        method: 'POST',
        url: 'api/chat/sessions',
        data: {
          title: title || 'New Chat',
          metadata: metadata || {}
        },
      });
      
      console.log('Create session response:', response);
      return response;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating chat session'
      };
    }
  }

  async updateChatSession(sessionId: string, title?: string, metadata?: Record<string, any>): Promise<ApiResponse<ChatSession>> {
    return this.request({
      method: 'PUT',
      url: `api/chat/sessions/${sessionId}`,
      data: {
        title,
        metadata
      },
    });
  }

  async deleteChatSession(sessionId: string): Promise<ApiResponse<void>> {
    console.log('🔍 [API Service] deleteChatSession called with sessionId:', sessionId);
    return this.request({
      method: 'DELETE',
      url: `api/chat/sessions/${sessionId}`,
    });
  }
  
  async getChatMessages(sessionId: string, page = 1, limit = 50): Promise<ApiResponse<{ messages: ChatMessage[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: `api/chat/sessions/${sessionId}/messages`,
      params: { page, limit },
    });
  }
  
  async addChatMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): Promise<ApiResponse<ChatMessage>> {
    return this.request({
      method: 'POST',
      url: `api/chat/sessions/${sessionId}/messages`,
      data: {
        role,
        content,
        metadata: metadata || {}
      },
    });
  }
  
  // Send a chat message and get AI response with support for contact mentions
  async sendChatMessage(params: {
    sessionId?: string;
    message: string;
    contactData?: { contacts: Array<{ name: string; address: string; network: string }> };
    walletAddress?: string;
    recipient?: any;
  }): Promise<ApiResponse<{
    sessionId: string;
    chatMessage: ChatMessage;
    reply: {
      content: string;
      transaction?: {
        type: TransactionType;
        data: any;
      };
    };
  }>> {
    console.log('Sending message to API with contact information:', JSON.stringify(params));
    
    // Build metadata object with both contactData and recipient if present
    const metadata: any = {};
    if (params.contactData) metadata.contactData = params.contactData;
    if (params.recipient) metadata.recipient = params.recipient;
    // If we have a sessionId, use the existing session
    if (params.sessionId) {
      return this.request({
        method: 'POST',
        url: `api/chat/sessions/${params.sessionId}/messages`,
        data: {
          role: 'user',
          content: params.message,
          walletAddress: params.walletAddress,
          metadata
        },
      });
    } else {
      // If no sessionId, we need to create a new session first
      const sessionResponse = await this.createChatSession('New Chat');
      console.log('⭐ Create session response:', sessionResponse);
      
      if (sessionResponse.success && sessionResponse.session && sessionResponse.session.id) {
        const sessionId = sessionResponse.session.id;
        console.log('⭐ Session ID:', sessionId);
        
        try {
          const chatResponse = await this.request<{
            sessionId: string;
            chatMessage: ChatMessage;
            reply: {
              content: string;
              transaction?: {
                type: TransactionType;
                data: any;
              };
            };
          }>({
            method: 'POST',
            url: `api/chat/sessions/${sessionId}/messages`,
            data: {
              role: 'user',
              content: params.message,
              walletAddress: params.walletAddress,
              metadata
            },
          });
          
          console.log('⭐ Chat message response:', chatResponse);
          return chatResponse;
        } catch (error) {
          console.error('Error sending chat message:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Error sending chat message'
          };
        }
      } else {
        console.error('Session creation failed or returned invalid data:', sessionResponse);
        return {
          success: false,
          error: 'Failed to create chat session'
        };
      }
    }
  }
  
  // Notification methods
  async getNotifications(page = 1, limit = 20): Promise<ApiResponse<{ notifications: any[]; total: number }>> {
    console.log('🔍 [API Service] getNotifications called with page:', page, 'limit:', limit);
    console.log('🔍 [API Service] Current token status before request...');
    const token = await this.getToken();
    console.log('🔍 [API Service] Token exists:', !!token, 'Token preview:', token ? token.substring(0, 20) + '...' : 'NONE');
    
    return this.request({
      method: 'GET',
      url: 'api/notifications',
      params: { page, limit },
    });
  }
  
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.request({
      method: 'PATCH',
      url: `api/notifications/${notificationId}/read`,
    });
  }
  
  async updatePushToken(token: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: 'api/notifications/push-token',
      data: { token },
    });
  }

  // Get all users (admin or for management)
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    return this.request({
      method: 'GET',
      url: 'api/users/users',
    });
  }

  // Lookup user by username
  async getUserByUsername(username: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `api/users/lookup?username=${encodeURIComponent(username)}`,
    });
  }

  async walletConnect(address: string, network?: string, walletType?: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>({
      method: 'POST',
      url: 'api/users/wallet-connect',
      data: { address, network, walletType },
    });
    
    // Store wallet address for token refresh
    if (response.success) {
      await this.setCurrentWalletAddress(address);
    }
    
    return response;
  }

  // Privy authentication method
  async privyAuth(privyUser: PrivyUser): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>({
      method: 'POST',
      url: 'api/users/privy-auth',
      data: { privyUser }, // Send full Privy user object
    });
    
    // Store wallet address for token refresh (use first linked account)
    if (response.success && privyUser.linked_accounts && privyUser.linked_accounts.length > 0) {
      const firstAccount = privyUser.linked_accounts[0];
      if (firstAccount.address) {
        await this.setCurrentWalletAddress(firstAccount.address);
      }
    }
    
    return response;
  }

  /**
   * Get enhanced transaction data for sharing
   */
  async getTransactionShareData(messageId: string): Promise<ApiResponse<TransactionShareData>> {
    return this.request({
      method: 'GET',
      url: `api/transactions/share/${messageId}`,
    });
  }

  /**
   * Get user achievements and stats
   */
  async getUserStats(userId: string): Promise<ApiResponse<{
    userStats: UserStats;
    achievements: Achievement[];
  }>> {
    return this.request({
      method: 'GET',
      url: `api/transactions/user-stats/${userId}`,
    });
  }

  async getTokenPriceForReceive(network: string, token: string, currency: string): Promise<number | null> {
    try {
      const response = await this.api.get(`/api/transactions/token/price`, {
        params: { network, token, currency }
      });
      if (response.data && (typeof response.data.price === 'number' || typeof response.data.price?.price === 'number')) {
        return response.data.price.price ?? response.data.price;
      }
      return null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  // Notification API endpoints
  async registerPushToken(token: string) {
    try {
      const response = await this.api.post('api/notifications/push-token', { token });
      return response;
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  async getNotificationPreferences() {
    try {
      const response = await this.api.get('api/notifications/preferences');
      return response;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(preferences: any) {
    try {
      const response = await this.api.put('api/notifications/preferences', preferences);
      return response;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async sendTestNotification(data: any) {
    try {
      const response = await this.api.post('api/notifications/test', data);
      return response;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  async addPriceAlert(alert: any) {
    try {
      const response = await this.api.post('api/notifications/price-alerts', alert);
      return response;
    } catch (error) {
      console.error('Error adding price alert:', error);
      throw error;
    }
  }

  async removePriceAlert(symbol: string, targetPrice: number) {
    try {
      const response = await this.api.delete('api/notifications/price-alerts', {
        data: { symbol, targetPrice }
      });
      return response;
    } catch (error) {
      console.error('Error removing price alert:', error);
      throw error;
    }
  }

  async getPriceAlerts() {
    try {
      const response = await this.api.get('api/notifications/price-alerts');
      return response;
    } catch (error) {
      console.error('Error getting price alerts:', error);
      throw error;
    }
  }

  // Request methods
  async getRequest(requestId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `api/requests/${requestId}`,
    });
  }

  async createRequest(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: 'api/requests',
      data,
    });
  }

  async respondToRequest(requestId: string, response: 'accept' | 'decline'): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `api/requests/${requestId}/respond`,
      data: { action: response },
    });
  }

  async buildRequestTransactionPreview(requestId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `api/requests/${requestId}/preview`,
    });
  }

  async markRequestAsAccepted(requestId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `api/requests/${requestId}/accept`,
    });
  }

  async cancelRequest(requestId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'DELETE',
      url: `api/requests/${requestId}`,
    });
  }

  async getMyRequests(page = 1, limit = 20): Promise<ApiResponse<{ requests: any[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/requests/my-requests',
      params: { page, limit },
    });
  }

  async getReceivedRequests(page = 1, limit = 20): Promise<ApiResponse<{ requests: any[]; total: number }>> {
    return this.request({
      method: 'GET',
      url: 'api/requests/received',
      params: { page, limit },
    });
  }
}

export const apiService = new ApiService();
export default apiService;
