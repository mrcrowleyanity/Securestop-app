/**
 * Screen Pinning / Lock Task module
 *
 * Uses the custom native ScreenPinningModule (com.securestop.app.ScreenPinningModule)
 * which is injected into the Android build via the withScreenPinning Expo config plugin.
 *
 * On Android: calls Activity.startLockTask() / stopLockTask() directly via NativeModules.
 * On iOS: screen pinning is not supported; all methods are no-ops.
 */
import { NativeModules, Platform, Alert, Linking } from 'react-native';

// ---------------------------------------------------------------------------
// Native module interface
// ---------------------------------------------------------------------------

interface ScreenPinningNativeModule {
  startLockTask(): Promise<boolean>;
  stopLockTask(): Promise<boolean>;
  isInLockTaskMode(): Promise<boolean>;
}

function getNativeModule(): ScreenPinningNativeModule | null {
  if (Platform.OS !== 'android') return null;

  const mod = NativeModules.ScreenPinning as ScreenPinningNativeModule | undefined;

  if (
    mod &&
    typeof mod.startLockTask === 'function' &&
    typeof mod.stopLockTask === 'function' &&
    typeof mod.isInLockTaskMode === 'function'
  ) {
    return mod;
  }

  if (__DEV__) {
    console.warn(
      '[ScreenPinning] Native module not found. ' +
      'Make sure ScreenPinningPackage is registered in MainApplication.kt ' +
      'and you ran a fresh `npx expo prebuild`.'
    );
  }

  return null;
}

const Native = getNativeModule();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ScreenPinning = {
  /**
   * Returns true only on Android when the native module is present and linked.
   * Always false on iOS.
   */
  isAvailable(): boolean {
    return Native !== null;
  },

  /**
   * Starts Android Lock Task mode (screen pinning).
   * Shows the system screen-pinning confirmation UI.
   * Resolves to true if the request was accepted.
   */
  async startLockTask(): Promise<boolean> {
    if (!Native) return false;
    try {
      await Native.startLockTask();
      return true;
    } catch (error) {
      console.error('[ScreenPinning] startLockTask error:', error);
      return false;
    }
  },

  /**
   * Stops Android Lock Task mode.
   * Resolves to true if the request was accepted.
   */
  async stopLockTask(): Promise<boolean> {
    if (!Native) return false;
    try {
      await Native.stopLockTask();
      return true;
    } catch (error) {
      console.error('[ScreenPinning] stopLockTask error:', error);
      return false;
    }
  },

  /**
   * Returns true if the device is currently in Lock Task mode.
   */
  async isInLockTaskMode(): Promise<boolean> {
    if (!Native) return false;
    try {
      return await Native.isInLockTaskMode();
    } catch (error) {
      console.error('[ScreenPinning] isInLockTaskMode error:', error);
      return false;
    }
  },

  /**
   * Deep-links to the Android settings page.
   */
  async openSecuritySettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Open Settings',
        'Please open Settings to manage screen pinning permissions.',
        [{ text: 'OK' }]
      );
    }
  },

  /**
   * Shows a user-friendly alert with manual screen-pinning instructions.
   */
  showManualInstructions(): void {
    Alert.alert(
      'Enable Screen Pinning Manually',
      Platform.OS === 'android'
        ? 'To pin this screen manually:\n\n' +
          '1. Tap the Recents button (square icon)\n' +
          '2. Find the SecureStop card\n' +
          '3. Tap the app icon at the top of the card\n' +
          '4. Select "Pin"\n\n' +
          'To unpin: hold Back + Recents simultaneously.'
        : 'Screen pinning is only available on Android.',
      [{ text: 'Got it' }]
    );
  },
};

export default ScreenPinning;
