import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Image, Share, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import * as Clipboard from 'expo-clipboard';
import ViewShot from 'react-native-view-shot';

const { width: screenWidth } = Dimensions.get('window');

const networkMeta: Record<string, { label: string; color: [string, string]; icon: string }> = {
  ethereum: { label: 'Ethereum', color: ['#8A2BE2', '#4ECDC4'], icon: 'logo-ethereum' },
  polygon: { label: 'Polygon', color: ['#8247e5', '#c084fc'], icon: 'logo-usd' },
  arbitrum: { label: 'Arbitrum', color: ['#28A0F0', '#AEE9F7'], icon: 'cloud-outline' },
  optimism: { label: 'Optimism', color: ['#FF0420', '#FF7A7A'], icon: 'flame-outline' },
  base: { label: 'Base', color: ['#0052FF', '#7ED7FF'], icon: 'cube-outline' },
  solana: { label: 'Solana', color: ['#9945FF', '#14F195'], icon: 'logo-bitcoin' },
};

interface ReceiveShareCardProps {
  network: string;
  token: { symbol: string; name: string; logoUrl?: string };
  amount: string;
  fiatAmount: string;
  currency: string;
  address: string;
  paymentUri: string;
}

// Helper function to get network icon
const getNetworkIcon = (network: string = 'ethereum') => {
  switch ((network || '').toLowerCase()) {
    case 'ethereum':
      return require('../assets/networks/ethereum.png');
    case 'polygon':
      return require('../assets/networks/polygon.png');
    case 'arbitrum':
      return require('../assets/networks/arbitrium.png');
    case 'optimism':
      return require('../assets/networks/optimism.png');
    case 'base':
      return require('../assets/networks/base.png');
    case 'solana':
      return require('../assets/networks/solana.png');
    default:
      return require('../assets/networks/ethereum.png');
  }
};

const BLOQZ_LOGO = require('../assets/images/bloqz_logo.png'); // Add your logo asset here
const BLOQZ_PURPLE = '#AE1CFF';
const CARD_BG = require('../assets/receiveShareCard/card.png');

const ReceiveShareCard: React.FC<ReceiveShareCardProps> = ({
  network,
  token,
  amount,
  fiatAmount,
  currency,
  address,
  paymentUri,
}) => {
  const { currentTheme } = useTheme();
  const viewShotRef = useRef<any>(null);
  const exportShotRef = useRef<any>(null);

  // Copy feedback state
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Share payment URI
  const handleShareLink = async () => {
    await Share.share({
      message: paymentUri,
      url: paymentUri,
      title: 'My Bloqz Receive Link',
    });
  };

  // Share branded QR code as image
  const handleShareQR = async () => {
    if (exportShotRef.current) {
      const uri = await exportShotRef.current.capture();
      await Share.share({
        url: uri,
        title: 'My Bloqz QR Code',
      });
    }
  };

  // Copy address with feedback
  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1200);
  };

  // Copy link with feedback
  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(paymentUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1200);
  };

  const networkInfo = networkMeta[network] || networkMeta.ethereum;
  // Use dark theme for export background
  const exportBg = '#18122B';
  
  return (
    <>
      {/* Hidden export view for branded QR code */}
      <ViewShot ref={exportShotRef} options={{ format: 'png', quality: 1.0 }} style={{ position: 'absolute', left: -9999 }}>
        <View style={{ alignItems: 'center', backgroundColor: exportBg, padding: 20, borderRadius: 20, width: 260 }}>
          <QRCode
            value={paymentUri}
            size={220}
            color={BLOQZ_PURPLE}
            backgroundColor={exportBg}
          />
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 36, marginBottom: 4 }}>
            <Image source={BLOQZ_LOGO} style={{ width: 24, height: 24, marginRight: 8 }} />
            <Text style={{ color: BLOQZ_PURPLE, fontWeight: 'bold', fontSize: 16 }}>Powered by Bloqz</Text>
          </View>
        </View>
      </ViewShot>
      {/* Main card UI */}
      <TouchableOpacity style={styles.container} activeOpacity={0.92}>
        <ImageBackground
          source={CARD_BG}
          style={styles.gradientContainer}
          resizeMode="cover"
        >
          <View style={styles.rowContainer}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={styles.qrRowHorizontal}>
              <QRCode value={paymentUri} size={56} backgroundColor="transparent" color="#fff" />
            </ViewShot>
            <View style={styles.infoCol}>
              <View style={styles.headerRowHorizontal}>
                <View style={styles.pillsRow}>
                  <View style={styles.glassPill}>
                    <Image source={getNetworkIcon(network)} style={{ width: 16, height: 16, marginRight: 6 }} resizeMode="contain" />
                    <Text style={styles.pillText}>{networkInfo.label}</Text>
                  </View>
                  <View style={styles.glassPill}>
                    <Ionicons name="ellipse" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.pillText}>{token.symbol}</Text>
                  </View>
                </View>
                <View style={styles.iconShareRow}>
                  <TouchableOpacity style={styles.iconShareButton} onPress={handleShareLink}>
                    <Ionicons name="share-social-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconShareButton, { marginLeft: 6 }]} onPress={handleShareQR}>
                    <Ionicons name="qr-code-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.amountRowHorizontal}>
                <Text style={styles.amountText}>{amount} {token.symbol}</Text>
                <Text style={styles.fiatText}>≈ {fiatAmount} {currency}</Text>
              </View>
              <View style={styles.glassPillRowHorizontal}>
                <TouchableOpacity style={styles.glassPill} onPress={handleCopyAddress}>
                  {copiedAddress ? (
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="copy-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.pillText}>{address.slice(0, 6)}...{address.slice(-4)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.glassPill} onPress={handleCopyLink}>
                  {copiedLink ? (
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="link-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.pillText}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth * 0.8,
    borderRadius: 18,
    marginVertical: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginLeft: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientContainer: {
    padding: 12,
    borderRadius: 18,
    minHeight: 100,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  qrRowHorizontal: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    justifyContent: 'space-between',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    marginRight: 2,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  glassPillRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  pillText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  amountRowHorizontal: {
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  amountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 1,
  },
  fiatText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  iconShareButton: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 12,
    padding: 4,
    marginLeft: 0,
    marginRight: 0,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReceiveShareCard; 