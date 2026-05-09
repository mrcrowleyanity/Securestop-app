/**
 * Screen Pinning / Lock Task module
 *
 * Backed by @akbaraditamasp/expo-lock-task on Android.
 * The NativeModules.ScreenPinningModule approach has been removed — there is
 * no corresponding Kotlin module, so that path was always undefined at runtime.
 *
 * API surface is intentionally identical to the old NativeModules version so
 * that secure-mode.tsx requires zero changes.
 */

import { Platform, Alert, Linking } from 'react-native';

// ---------------------------------------------------------------------------
// Lazy-load the native package so we never crash on iOS (where the native
// side simply isn't compiled in).
// ---------------------------------------------------------------------------

interface ExpoLockTask {
  startLockTask(): Promise<boolean>;
  stopLockTask(): Promise<boolean>;
  /** Note: the package exposes isLockTaskMode(), not isInLockTaskMode() */
  isLockTaskMode(): Promise<boolean>;
}

function getLockTaskModule(): ExpoLockTask | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@akbaraditamasp/expo-lock-task').default as ExpoLockTask;
    if (typeof mod?.startLockTask === 'function') return mod;
    console.warn('[ScreenPinning] @akbaraditamasp/expo-lock-task loaded but API missing');
    return null;
  } catch (e) {
    console.warn('[ScreenPinning] Failed to load @akbaraditamasp/expo-lock-task:', e);
    return null;
  }
}

// Resolve once at module load; on Android this is the linked native module.
const LockTask = getLockTaskModule();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ScreenPinning = {
  /**
   * Returns true only on Android when the native module is present and linked.
   * Always false on iOS — screen pinning is an Android-only concept.
   */
  isAvailable(): boolean {
    return LockTask !== null;
  },

  /**
   * Starts Android Lock Task mode (screen pinning).
   * Resolves to true if the system accepted the request.
   */
  async startLockTask(): Promise<boolean> {
    if (!LockTask) return false;
    try {
      const result = await LockTask.startLockTask();
      return result === true;
    } catch (error) {
      console.error('[ScreenPinning] startLockTask error:', error);
      return false;
    }
  },

  /**
   * Stops Android Lock Task mode.
   * Resolves to true if the system accepted the request.
   */
  async stopLockTask(): Promise<boolean> {
    if (!LockTask) return false;
    try {
      const result = await LockTask.stopLockTask();
      return result === true;
    } catch (error) {
      console.error('[ScreenPinning] stopLockTask error:', error);
      return false;
    }
  },

  /**
   * Returns true if the device is currently in Lock Task mode.
   * Maps the package's `isLockTaskMode()` to our `isInLockTaskMode()` name.
   */
  async isInLockTaskMode(): Promise<boolean> {
    if (!LockTask) return false;
    try {
      const result = await LockTask.isLockTaskMode();
      return result === true;
    } catch (error) {
      console.error('[ScreenPinning] isInLockTaskMode error:', error);
      return false;
    }
  },

  /**
   * Deep-links to the Android security settings page where an admin can
   * enable/disable the device owner policy for lock task whitelisting.
   */
  async openSecuritySettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Open Settings',
        'Please open Settings → Security → Device Admin Apps to manage screen pinning permissions.',
        [{ text: 'OK' }]
      );
    }
  },

  /**
   * Shows a user-friendly alert with manual screen-pinning instructions for
   * devices where programmatic pinning is unavailable (e.g. non-whitelisted).
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
