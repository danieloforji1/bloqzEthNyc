import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Polyfill crypto for React Native
import * as ExpoCrypto from 'expo-crypto';
if (typeof global.crypto === 'undefined') {
  global.crypto = ExpoCrypto;
  // If expo-crypto doesn't provide getRandomValues, fallback:
  if (!global.crypto.getRandomValues) {
    global.crypto.getRandomValues = require('react-native-get-random-values').getRandomValues;
  }
}

import 'expo-router/entry';