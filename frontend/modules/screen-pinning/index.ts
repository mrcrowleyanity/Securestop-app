/**
 * Screen Pinning / Lock Task module
 *
 * Uses the custom native ScreenPinningModule (com.securestop.app.ScreenPinningModule)
 * which is injected into the Android build via the withScreenPinning Expo config plugin.
 *
 * Updated for RN 0.81 New Architecture (Bridgeless mode):
 * - Uses TurboModuleRegistry.get() instead of NativeModules (dead bridge in bridgeless mode)
 * - Interface extends TurboModule to satisfy TurboModuleRegistry type constraints
 *
 * v3: Added isScreenPinningEnabled() and getLockTaskModeState() for 3-phase flow.
 */

import { TurboModuleRegistry, Platform } from 'react-native';
import type { TurboModule } from 'react-native';

// Lock task mode state constants (mirror Android API)
export const LOCK_TASK_MODE_NONE = 0;    // Not in lock task mode
export const LOCK_TASK_MODE_LOCKED = 1;  // Device Owner locked (kiosk)
export const LOCK_TASK_MODE_PINNED = 2;  // User-initiated screen pinning

// ---------------------------------------------------------------------------
// Native module interface
// ---------------------------------------------------------------------------

interface ScreenPinningNativeModule extends TurboModule {
  // Check if the screen pinning setting is enabled in Android Settings (pre-Android 10)
  isScreenPinningEnabled(): Promise<boolean>;
  // Get current lock task mode: 0=NONE, 1=LOCKED (DPC), 2=PINNED (user)
  getLockTaskModeState(): Promise<number>;
  // Trigger the system "Pin this app?" dialog. Fire-and-forget on UI thread.
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
  /** True if the native module is loaded (Android dev build only) */
  isAvailable(): boolean {
    return Native !== null;
  },

  /**
   * Check if the screen pinning setting is enabled in Android Settings.
   * On Android 10+ always returns true (setting was removed, system always allows the dialog).
   * Call this BEFORE startLockTask() to decide whether to show manual setup instructions.
   */
  async isScreenPinningEnabled(): Promise<boolean> {
    if (!Native) return false;
    try {
      return await Native.isScreenPinningEnabled();
    } catch (e) {
      // Assume enabled on error — let startLockTask() handle the SecurityException
      return true;
    }
  },

  /**
   * Get the current lock task mode state.
   * Returns: 0 = NONE, 1 = LOCKED (Device Owner kiosk), 2 = PINNED (user screen pin)
   * Poll this after startLockTask() to know if the user tapped "Start".
   */
  async getLockTaskModeState(): Promise<number> {
    if (!Native) return LOCK_TASK_MODE_NONE;
    try {
      return await Native.getLockTaskModeState();
    } catch (e) {
      return LOCK_TASK_MODE_NONE;
    }
  },

  /**
   * Trigger Android's screen pinning system dialog.
   * This is FIRE-AND-FORGET: it shows the dialog and resolves immediately.
   * The user must tap "Start" in the dialog for pinning to actually activate.
   * Use getLockTaskModeState() polling to confirm the user accepted.
   *
   * Rejects with code SCREEN_PINNING_DISABLED if screen pinning is off in Settings.
   */
  async startLockTask(): Promise<boolean> {
    if (!Native) {
      console.warn('[ScreenPinning] Module not available on this platform or not loaded');
      return false;
    }
    try {
      return await Native.startLockTask();
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'SCREEN_PINNING_DISABLED') {
        throw e; // Let caller handle — they need to show settings instructions
      }
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
      return false;
    }
  },
};

export default ScreenPinning;
