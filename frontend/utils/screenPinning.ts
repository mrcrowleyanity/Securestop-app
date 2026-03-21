/**
 * Screen Pinning Utility - Android Lock Task Mode
 * Uses @akbaraditamasp/expo-lock-task for native screen pinning
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Type definitions for expo-lock-task
interface ExpoLockTask {
  startLockTask(): Promise<boolean>;
  stopLockTask(): Promise<boolean>;
  isLockTaskMode(): Promise<boolean>;
}

let LockTask: ExpoLockTask | null = null;

// Try to import the native module
try {
  if (Platform.OS === 'android') {
    LockTask = require('@akbaraditamasp/expo-lock-task').default;
  }
} catch (error) {
  console.log('expo-lock-task module not available (likely in Expo Go):', error);
}

const LOCK_TASK_CONFIRMED_KEY = 'lock_task_confirmed';

export interface ScreenPinningResult {
  success: boolean;
  message: string;
  isLockTaskMode?: boolean;
}

/**
 * Check if screen pinning is available on this device
 */
export function isScreenPinningAvailable(): boolean {
  return Platform.OS === 'android' && LockTask !== null;
}

/**
 * Start lock task mode (screen pinning)
 * This shows the Android system pinning dialog
 */
export async function enterScreenPinning(): Promise<ScreenPinningResult> {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      message: 'Screen pinning is only available on Android',
    };
  }

  if (!LockTask) {
    return {
      success: false,
      message: 'Screen pinning module not available. Build a development build with EAS.',
    };
  }

  try {
    const started = await LockTask.startLockTask();
    
    if (started) {
      // Save confirmation that user has activated lock task
      await SecureStore.setItemAsync(LOCK_TASK_CONFIRMED_KEY, 'true');
      
      return {
        success: true,
        message: 'Screen pinning activated',
        isLockTaskMode: true,
      };
    } else {
      return {
        success: false,
        message: 'User declined screen pinning',
        isLockTaskMode: false,
      };
    }
  } catch (error) {
    console.error('Error starting lock task:', error);
    return {
      success: false,
      message: `Failed to start screen pinning: ${error}`,
    };
  }
}

/**
 * Stop lock task mode (unpin screen)
 * This can only be called when already in lock task mode
 */
export async function exitScreenPinning(): Promise<ScreenPinningResult> {
  if (!LockTask) {
    return {
      success: false,
      message: 'Screen pinning module not available',
    };
  }

  try {
    const stopped = await LockTask.stopLockTask();
    
    if (stopped) {
      return {
        success: true,
        message: 'Screen pinning deactivated',
        isLockTaskMode: false,
      };
    } else {
      return {
        success: false,
        message: 'Failed to stop screen pinning',
      };
    }
  } catch (error) {
    console.error('Error stopping lock task:', error);
    return {
      success: false,
      message: `Failed to stop screen pinning: ${error}`,
    };
  }
}

/**
 * Check if currently in lock task mode
 */
export async function isInLockTaskMode(): Promise<boolean> {
  if (!LockTask) {
    return false;
  }

  try {
    return await LockTask.isLockTaskMode();
  } catch (error) {
    console.error('Error checking lock task mode:', error);
    return false;
  }
}

/**
 * Check if user has confirmed lock task setup before
 */
export async function hasConfirmedLockTask(): Promise<boolean> {
  try {
    const confirmed = await SecureStore.getItemAsync(LOCK_TASK_CONFIRMED_KEY);
    return confirmed === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Clear lock task confirmation (for testing/debugging)
 */
export async function clearLockTaskConfirmation(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LOCK_TASK_CONFIRMED_KEY);
  } catch (error) {
    console.error('Error clearing lock task confirmation:', error);
  }
}

export default {
  isScreenPinningAvailable,
  enterScreenPinning,
  exitScreenPinning,
  isInLockTaskMode,
  hasConfirmedLockTask,
  clearLockTaskConfirmation,
};
