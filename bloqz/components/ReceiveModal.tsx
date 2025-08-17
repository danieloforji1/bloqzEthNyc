import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Share,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeProvider';
import { apiService } from '../services/api.service';

const { width: screenWidth } = Dimensions.get('window');

const networks = [
  { label: 'Ethereum', value: 'ethereum', color: ['#8A2BE2', '#4ECDC4'] as const },
  { label: 'Polygon', value: 'polygon', color: ['#8247e5', '#c084fc'] as const },
  { label: 'Arbitrum', value: 'arbitrum', color: ['#28A0F0', '#AEE9F7'] as const },
  { label: 'Optimism', value: 'optimism', color: ['#FF0420', '#FF7A7A'] as const },
  { label: 'Base', value: 'base', color: ['#0052FF', '#7ED7FF'] as const },
  { label: 'Solana', value: 'solana', color: ['#9945FF', '#14F195'] as const },
];

interface ReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  userAddresses: Record<string, string>;
  userBalances?: Record<string, Array<{ symbol: string; name: string; address: string; balance: string; decimals: number; logoUrl?: string }>>;
}

export default function ReceiveModal({ visible, onClose, userAddresses, userBalances = {} }: ReceiveModalProps) {
  const { currentTheme } = useTheme();
  const [network, setNetwork] = useState('ethereum');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [fiatAmount, setFiatAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<{ symbol: string; name: string; address: string; decimals: number; logoUrl?: string } | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const address = userAddresses[network];

  // Get tokens for the selected network (only those with balance > 0, plus native token)
  const tokens = (userBalances[network] || []).filter(t => parseFloat(t.balance) > 0);
  // Add native token if not present
  const nativeTokenMap: Record<string, { symbol: string; name: string; address: string; decimals: number }> = {
    ethereum: { symbol: 'ETH', name: 'Ethereum', address: '', decimals: 18 },
    polygon: { symbol: 'POL', name: 'Polygon', address: '', decimals: 18 },
    arbitrum: { symbol: 'ETH', name: 'Arbitrum ETH', address: '', decimals: 18 },
    optimism: { symbol: 'ETH', name: 'Optimism ETH', address: '', decimals: 18 },
    base: { symbol: 'ETH', name: 'Base ETH', address: '', decimals: 18 },
    solana: { symbol: 'SOL', name: 'Solana', address: '', decimals: 9 },
  };
  const nativeToken = nativeTokenMap[network];
  const hasNative = tokens.some(t => t.symbol === nativeToken.symbol);
  const tokenList = hasNative ? tokens : [nativeToken, ...tokens];

  // When network changes, reset selectedToken to the first token for that network
  React.useEffect(() => {
    if (tokenList.length > 0) {
      setSelectedToken(tokenList[0]);
    } else {
      setSelectedToken(null);
    }
  }, [network, tokenList.length]);

  // Fetch price when network, token, or currency changes
  React.useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedToken) return;
      setPriceLoading(true);
      try {
        const price = await apiService.getTokenPriceForReceive(network, selectedToken.symbol, currency);
        setPrice(price);
      } catch (e) {
        setPrice(null);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrice();
  }, [network, selectedToken, currency]);

  // Handle fiat <-> token conversion
  const handleFiatChange = (val: string) => {
    setFiatAmount(val);
    if (price && !isNaN(Number(val))) {
      setAmount((Number(val) / price).toString());
    } else {
      setAmount('');
    }
  };
  const handleTokenChange = (val: string) => {
    setAmount(val);
    if (price && !isNaN(Number(val))) {
      setFiatAmount((Number(val) * price).toString());
    } else {
      setFiatAmount('');
    }
  };

  // Generate payment URI for selected token
  let paymentUri = '';
  if (network === 'solana') {
    paymentUri = `solana:${address}${amount ? `?amount=${amount}` : ''}${selectedToken && selectedToken.symbol !== 'SOL' ? `&spl-token=${selectedToken.address}` : ''}`;
  } else {
    // EVM: value in wei, add contract address for ERC20
    if (selectedToken && selectedToken.symbol !== nativeToken.symbol) {
      paymentUri = `ethereum:${address}/transfer?contractAddress=${selectedToken.address}${amount ? `&uint256=${(parseFloat(amount) * Math.pow(10, selectedToken.decimals)).toFixed(0)}` : ''}`;
    } else {
      const valueInWei = amount ? (parseFloat(amount) * 1e18).toString() : '';
      paymentUri = `ethereum:${address}${valueInWei ? `?value=${valueInWei}` : ''}`;
    }
  }

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(paymentUri);
    Alert.alert('Copied!', 'Payment link copied to clipboard');
  };

  const copyAddress = async () => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied!', 'Address copied to clipboard');
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Send me crypto on Bloqz!\n${paymentUri}`,
        url: paymentUri,
        title: 'Send me crypto on Bloqz',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not share link');
    }
  };

  // Currency selector UI
  const currencyOptions = ['USD', 'EUR', 'GBP'];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <LinearGradient colors={[currentTheme.gradientStart, currentTheme.gradientEnd]} style={styles.gradientBg}>
          <View style={[styles.modal, { backgroundColor: currentTheme.cardBackground, borderRadius: 18 }]}> 
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: currentTheme.accent + '22' }]} onPress={onClose}>
              <Ionicons name="close" size={28} color={currentTheme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Receive Crypto</Text>
            {/* Chain and Token Selectors Side by Side */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginTop: 2 }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <TouchableOpacity
                  style={[styles.dropdownButton, { borderRadius: 16 }]}
                  onPress={() => setShowNetworkModal(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[(networks.find(n => n.value === network)?.color[0] || currentTheme.primary), (networks.find(n => n.value === network)?.color[1] || currentTheme.accent)]} style={[styles.dropdownGradient, { borderRadius: 16 }] }>
                    <Text style={[styles.dropdownButtonText, { color: currentTheme.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{networks.find(n => n.value === network)?.label || 'Select Network'}</Text>
                    <Ionicons name="chevron-down" size={18} color={currentTheme.textPrimary} style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <TouchableOpacity
                  style={[styles.dropdownButton, { borderRadius: 16 }]}
                  onPress={() => setShowTokenModal(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[currentTheme.primary, currentTheme.accent]} style={[styles.dropdownGradient, { borderRadius: 16 }] }>
                    <Text style={[styles.dropdownButtonText, { color: currentTheme.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{selectedToken ? selectedToken.symbol : 'Select Token'}</Text>
                    <Ionicons name="chevron-down" size={18} color={currentTheme.textPrimary} style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
            <Modal visible={showNetworkModal} transparent animationType="fade">
              <TouchableOpacity style={styles.networkModalOverlay} onPress={() => setShowNetworkModal(false)} activeOpacity={1}>
                <View style={[styles.networkModalContent, { backgroundColor: currentTheme.cardBackground, borderRadius: 16 }] }>
                  <FlatList
                    data={networks}
                    keyExtractor={item => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{ marginVertical: 6 }}
                        onPress={() => {
                          setNetwork(item.value);
                          setShowNetworkModal(false);
                          setSelectedToken(null);
                        }}
                      >
                        <LinearGradient colors={item.color} style={[styles.networkOptionGradient, { borderRadius: 14 }] }>
                          <Text style={[styles.networkOptionText, { color: currentTheme.textPrimary }]}>{item.label}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal visible={showTokenModal} transparent animationType="fade">
              <TouchableOpacity style={styles.networkModalOverlay} onPress={() => setShowTokenModal(false)} activeOpacity={1}>
                <View style={[styles.networkModalContent, { backgroundColor: currentTheme.cardBackground, borderRadius: 16 }] }>
                  <FlatList
                    data={tokenList}
                    keyExtractor={item => item.symbol + item.address}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{ marginVertical: 6 }}
                        onPress={() => {
                          setSelectedToken(item);
                          setShowTokenModal(false);
                        }}
                      >
                        <LinearGradient colors={[currentTheme.primary, currentTheme.accent]} style={[styles.networkOptionGradient, { borderRadius: 14 }] }>
                          <Text style={[styles.networkOptionText, { color: currentTheme.textPrimary }]}>{item.symbol} - {item.name}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Your Address</Text>
            <View style={[styles.addressRow, { backgroundColor: currentTheme.background + '18', borderRadius: 12 }] }>
              {address ? (
                <>
                  <Text style={[styles.address, { color: currentTheme.textPrimary }]}>
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </Text>
                  <TouchableOpacity onPress={copyAddress}>
                    <Ionicons name="copy" size={18} color={currentTheme.textPrimary} />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.address, { color: currentTheme.textSecondary }]}>No address found for this network</Text>
              )}
            </View>
            <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Amount</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, marginTop: 2 }}>
              {currencyOptions.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    backgroundColor: currency === opt ? currentTheme.primary : currentTheme.cardBackground,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    marginHorizontal: 4,
                    borderWidth: currency === opt ? 2 : 1,
                    borderColor: currency === opt ? currentTheme.accent : currentTheme.border,
                  }}
                  onPress={() => setCurrency(opt as 'USD' | 'EUR' | 'GBP')}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: currency === opt ? '#fff' : currentTheme.textPrimary, fontWeight: 'bold', fontSize: 15 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={[styles.label, { color: currentTheme.textPrimary, marginBottom: 2 }]}>Amount ({currency})</Text>
                <TextInput
                  style={[styles.input, { borderColor: currentTheme.accent, color: currentTheme.textPrimary, backgroundColor: currentTheme.background + '18', borderRadius: 12 }]}
                  placeholder={`0.00 ${currency}`}
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  value={fiatAmount}
                  onChangeText={handleFiatChange}
                />
              </View>
              <View style={{ width: 18 }} />
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={[styles.label, { color: currentTheme.textPrimary, marginBottom: 2 }]}>Amount ({selectedToken ? selectedToken.symbol : 'Token'})</Text>
                <TextInput
                  style={[styles.input, { borderColor: currentTheme.accent, color: currentTheme.textPrimary, backgroundColor: currentTheme.background + '18', borderRadius: 12 }]}
                  placeholder={`0.00 ${selectedToken ? selectedToken.symbol : ''}`}
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  value={amount}
                  onChangeText={handleTokenChange}
                />
              </View>
            </View>
            {priceLoading && <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 6 }}>Loading price...</Text>}
            {price && !priceLoading && (
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 6 }}>
                1 {selectedToken ? selectedToken.symbol : ''} ≈ {price} {currency}
              </Text>
            )}
            <View style={[styles.qrContainer, { backgroundColor: currentTheme.background + '18', borderRadius: 18 }] }>
              <View style={[styles.qrShadow, { borderRadius: 18, shadowColor: currentTheme.primary }] }>
                <QRCode value={paymentUri} size={180} backgroundColor="transparent" color={currentTheme.textPrimary} />
              </View>
            </View>
            {/* Share and Copy Buttons Side by Side, Icon Only */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 24,
                  width: 48,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginHorizontal: 10,
                  shadowColor: currentTheme.primary,
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={copyToClipboard}
                activeOpacity={0.85}
              >
                <Ionicons name="link" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.accent,
                  borderRadius: 24,
                  width: 48,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginHorizontal: 10,
                  shadowColor: currentTheme.accent,
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={shareLink}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.poweredBy, { color: currentTheme.textSecondary }]}>Powered by <Text style={{ color: currentTheme.primary, fontWeight: 'bold' }}>Bloqz</Text></Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  gradientBg: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  modal: {
    width: screenWidth * 0.92,
    borderRadius: 28,
    backgroundColor: 'rgba(30, 0, 60, 0.92)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
  },
  closeButton: { position: 'absolute', top: 18, right: 18, zIndex: 2, backgroundColor: 'rgba(138,43,226,0.18)', borderRadius: 16, padding: 4 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 18, marginTop: 8, letterSpacing: 0.5 },
  dropdownButton: { marginBottom: 18, borderRadius: 12, overflow: 'hidden', alignSelf: 'stretch' },
  dropdownGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  dropdownButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.2 },
  networkModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  networkModalContent: { backgroundColor: '#1e003c', borderRadius: 18, padding: 18, minWidth: 220, maxHeight: 400 },
  networkOptionGradient: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 2, alignItems: 'center' },
  networkOptionText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  label: { alignSelf: 'flex-start', marginTop: 10, color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  address: { fontSize: 15, color: '#fff', marginRight: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.2 },
  input: { borderWidth: 1, borderColor: '#fff', borderRadius: 10, padding: 10, width: 120, marginBottom: 12, textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
  qrContainer: { marginVertical: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 12 },
  qrShadow: { shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, borderRadius: 20 },
  copyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8A2BE2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, marginBottom: 10, marginTop: 2 },
  copyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  shareButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, marginBottom: 8 },
  shareButtonText: { color: '#8A2BE2', fontWeight: 'bold', fontSize: 16 },
  poweredBy: { color: '#fff', marginTop: 10, fontWeight: '600', fontSize: 13, opacity: 0.8 },
}); 