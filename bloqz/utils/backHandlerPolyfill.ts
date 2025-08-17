import { BackHandler } from 'react-native';

// Polyfill for BackHandler.removeEventListener deprecation in React Native 0.79+
if (BackHandler && !('removeEventListener' in BackHandler)) {
  (BackHandler as any).removeEventListener = (eventName: string, handler: () => boolean) => {
    // In newer versions, we don't need to manually remove listeners
    // The system handles cleanup automatically
    return;
  };
}

export default BackHandler; 