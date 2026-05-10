/**
 * Screen Pinning / Lock Task module
 *
 * Uses the custom native ScreenPinningModule (com.securestop.app.ScreenPinningModule)
 * which is injected into the Android build via the withScreenPinning Expo config plugin.
 *
 * Updated for RN 0.81 New Architecture (Bridgeless mode):
 * - Uses TurboModuleRegistry.get() instead of NativeModules (dead bridge in bridgeless mode)
 *
 * On Android: calls Activity.startLockTask() / stopLockTask() directly via TurboModuleRegistry.
 * On iOS: screen pinning is not supported; all methods are no-ops.
 */

import { TurboModuleRegistry, Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Native module interface
// ---------------------------------------------------------------------------

interface ScreenPinningNativeModule {
  startLockTask(): Promise<boolean>;
  stopLockTask(): Promise<boolean>;
  isInLockTaskMode(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Module resolution (TurboModuleRegistry for New Architecture)
// ---------------------------------------------------------------------------

function getNativeModule(): ScreenPinningNativeModule | null {
  if (Platform.OS !== 'android') return null;
  return TurboModuleRegistry.get<ScreenPinningNativeModule>('ScreenPinning');
}

const Native = getNativeModule();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ScreenPinning = {
  async startLockTask(): Promise<boolean> {
    if (!Native) {
      console.warn('[ScreenPinning] Module not available on this platform or not loaded');
      return false;
    }
    try {
      return await Native.startLockTask();
    } catch (e) {
      console.error('[ScreenPinning] startLockTask failed:', e);
      return false;
    }
  },

  async stopLockTask(): Promise<boolean> {
    if (!Native) {
      console.warn('[ScreenPinning] Module not available on this platform or not loaded');
      return false;
    }
    try {
      return await Native.stopLockTask();
    } catch (e) {
      console.error('[ScreenPinning] stopLockTask failed:', e);
      return false;
    }
  },

  async isInLockTaskMode(): Promise<boolean> {
    if (!Native) return false;
    try {
      return await Native.isInLockTaskMode();
    } catch (e) {
      console.error('[ScreenPinning] isInLockTaskMode failed:', e);
      return false;
    }
  },
};

export default ScreenPinning;
