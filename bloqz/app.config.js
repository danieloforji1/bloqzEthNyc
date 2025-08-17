export default {
  expo: {
    name: "Bloqz",
    slug: "bloqz",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/bloqz_dark.png",
    scheme: "bloqz",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/bloqz_logo.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#18122B"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      usesAppleSignIn: true,
      bundleIdentifier: "com.bloqz.app",
      associatedDomains: ["webcredentials:bloqz.io"],
      infoPlist: {
        NSCameraUsageDescription: "Camera access is needed for KYC verification",
        NSLocationWhenInUseUsageDescription: "Location access is needed for compliance",
        NSMicrophoneUsageDescription: "Microphone access may be needed for verification",
        NSPhotoLibraryUsageDescription: "Photo library access is needed for KYC verification",
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/bloqz_logo.png",
        backgroundColor: "#18122B"
      },
      package: "com.bloqz.app",
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/bloqz_logo.png"
    },
    extra: {
      // API Configuration for different environments
      apiUrl: process.env.API_URL || "https://api.bloqz.io", //"http://100.82.165.103:5001", //"http://192.168.1.96:5001", 
      privyAppId: "cmcfex9nv58k201",
      privyClientId: "client-WY6N3NpnXNbW2H2MaDnaoUGcbBNQm2pUm",
      passkeyAssociatedDomain: "https://www.bloqz.io",
      eas: {
        projectId: "b389705a-6b30-4d-a3812fdbe356"
      }

    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-notifications",
        {
          icon: "./assets/images/bloqz_dark.png",
          color: "#18122B"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "17.5"
          },
          android: {
            compileSdkVersion: 35
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/bloqz_logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#18122B"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
}; 