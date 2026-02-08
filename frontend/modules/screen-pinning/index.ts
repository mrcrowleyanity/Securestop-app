/**
 * Screen Pinning Module for React Native
 * 
 * This module provides a JavaScript interface to Android's Lock Task Mode (screen pinning).
 * It allows the app to pin itself to the screen, preventing users from leaving the app.
 * 
 * IMPORTANT: This module requires a development build to work.
 * It will NOT work in Expo Go - a warning will be shown instead.
 * 
 * Usage:
 *   import ScreenPinning from '../modules/screen-pinning';
 *   
 *   // Start screen pinning
 *   const success = await ScreenPinning.startLockTask();
 *   
 *   // Stop screen pinning (requires PIN verification in the app)
 *   await ScreenPinning.stopLockTask();
 *   
 *   // Check if currently pinned
 *   const isPinned = await ScreenPinning.isInLockTaskMode();
 */

import { Platform, NativeModules, Alert, Linking } from 'react-native';

// Check if we have native module access
const hasNativeModule = Platform.OS === 'android' && NativeModules.ScreenPinningModule;

/**
 * Screen Pinning API
 */
const ScreenPinning = {
  /**
   * Check if we're running in a development build with native module support
   */
  isAvailable(): boolean {
    return hasNativeModule;
  },

  /**
   * Start Lock Task Mode (screen pinning)
   * 
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async startLockTask(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('Screen pinning is only available on Android');
      return false;
    }

    if (!hasNativeModule) {
      // Show warning for Expo Go users
      console.log('Screen pinning requires a development build. Falling back to manual instructions.');
      return false;
    }

    try {
      const result = await NativeModules.ScreenPinningModule.startLockTask();
      return result === true;
    } catch (error) {
      console.error('Failed to start lock task:', error);
      return false;
    }
  },

  /**
   * Stop Lock Task Mode (unpin the screen)
   * 
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async stopLockTask(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (!hasNativeModule) {
      return false;
    }

    try {
      const result = await NativeModules.ScreenPinningModule.stopLockTask();
      return result === true;
    } catch (error) {
      console.error('Failed to stop lock task:', error);
      return false;
    }
  },

  /**
   * Check if the app is currently in Lock Task Mode
   * 
   * @returns Promise<boolean> - true if in lock task mode, false otherwise
   */
  async isInLockTaskMode(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (!hasNativeModule) {
      return false;
    }

    try {
      const result = await NativeModules.ScreenPinningModule.isInLockTaskMode();
      return result === true;
    } catch (error) {
      console.error('Failed to check lock task mode:', error);
      return false;
    }
  },

  /**
   * Open Android security settings for manual screen pinning setup
   */
  async openSecuritySettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Try to open security settings directly
        const opened = await Linking.openURL('android.settings.SECURITY_SETTINGS');
        if (!opened) {
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      await Linking.openSettings();
    }
  },

  /**
   * Show instructions for manual screen pinning setup
   */
  showManualInstructions(): void {
    Alert.alert(
      'Enable Screen Pinning',
      `To enable screen pinning on your Samsung S24:

1. Go to Settings
2. Search for "pin" in the search bar
3. Look for "Pin windows" or "Screen Pinning"
4. Turn it ON
5. Enable "Ask for PIN/Pattern to unpin"

After enabling:
• Open Recent Apps (swipe up)
• Tap the app icon at the top of the card
• Select "Pin this app"`,
      [
        {
          text: 'Open Settings',
          onPress: () => ScreenPinning.openSecuritySettings(),
        },
        {
          text: 'Got it',
          style: 'cancel',
        },
      ]
    );
  },
};

export default ScreenPinning;
