# Bloqz - Blockchain Mobile App

A modern, feature-rich blockchain mobile application built with React Native and Expo, designed to provide seamless DeFi and cryptocurrency management experiences.

## 🚀 Features

- **Multi-Chain Wallet Support**: Ethereum and Solana blockchain integration
- **Secure Authentication**: Apple Sign-In, Passkeys, and Privy integration
- **Chat & Social Features**: In-app messaging and social interactions
- **Transaction Management**: Send, receive, and track cryptocurrency transactions
- **Crypto Purchases**: Integrated Transak widget for fiat-to-crypto conversions
- **KYC Verification**: Built-in identity verification system
- **Real-time Notifications**: Push notifications for transactions and updates
- **Cross-Platform**: iOS and Android support with responsive design

## 🛠 Tech Stack

- **Frontend**: React Native 0.79.2, Expo SDK 53
- **Blockchain**: Ethereum (Ethers.js), Solana, WalletConnect
- **Authentication**: Privy, Apple Sign-In, Passkeys
- **State Management**: React Context API
- **Navigation**: Expo Router
- **UI Components**: Custom themed components with Expo Blur and Linear Gradient
- **Development**: TypeScript, ESLint, Metro bundler

## 📱 Supported Platforms

- iOS 17.5+ (iPhone & iPad)
- Android (API level 35+)
- Web (responsive)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bloqzEthNYC
   ```

2. **Install dependencies**
   ```bash
   cd bloqz
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` (if available)
   - Configure your Privy App ID and Client ID
   - Set up your Transak API keys

4. **Start the development server**
   ```bash
   npm start
   ```

### Running on Devices

- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

## 🔧 Configuration

### App Configuration

The app configuration is managed through `app.json` and includes:
- Bundle identifiers for iOS and Android
- Permissions and capabilities
- Splash screen and icon settings
- Plugin configurations

### Blockchain Configuration

- **Ethereum**: Configured with Ethers.js and WalletConnect
- **Solana**: Integrated with Solana wallet adapters
- **Multi-chain**: Support for both networks with seamless switching

## 📁 Project Structure

```
bloqz/
├── app/                    # Main app screens and navigation
├── components/            # Reusable UI components
├── services/             # API and blockchain services
├── hooks/                # Custom React hooks
├── contexts/             # React context providers
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── theme/                # UI theme and styling
├── assets/               # Images, fonts, and static assets
└── navigation/           # Navigation configuration
```

## 🔐 Security Features

- Secure storage with Expo Secure Store
- Biometric authentication support
- Encrypted communication
- KYC compliance features
- Camera and location permissions for verification

## 🚀 Deployment

### EAS Build

The project uses Expo Application Services (EAS) for builds:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform ios
eas build --platform android
```

### App Store Deployment

- iOS: Configure through App Store Connect
- Android: Upload to Google Play Console

## 🧪 Testing

```bash
# Run linting
npm run lint

# Run tests (if configured)
npm test
```

## 📱 Key Components

- **Wallet Management**: Multi-chain wallet creation and management
- **Transaction System**: Send, receive, and track crypto transactions
- **Chat Interface**: In-app messaging system
- **KYC Verification**: Identity verification workflow
- **Crypto Purchases**: Fiat-to-crypto conversion interface
- **Notification Center**: Real-time updates and alerts

## 🔗 Dependencies

### Core Dependencies
- React Native 0.79.2
- Expo SDK 53
- React Navigation 7
- Ethers.js 5.7.2
- Solana Web3.js

### Authentication & Security
- Privy SDK
- Apple Authentication
- Passkeys support
- Secure Store

### UI & UX
- Expo Blur
- Linear Gradient
- React Native Reanimated
- Custom themed components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support and questions:
- Check the project documentation
- Review existing issues
- Contact the development team

## 🔄 Updates

Stay updated with the latest changes:
- Check the changelog
- Follow the project releases
- Monitor dependency updates

---

**Note**: This is a private project. Please ensure you have the necessary permissions before contributing or distributing. 