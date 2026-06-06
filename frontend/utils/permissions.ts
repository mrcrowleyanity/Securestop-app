/**
 * Permissions Manager - Handles all app permissions
 *
 * Standard Features:
 * - Location (for stop logging)
 * - Storage (for document storage)
 * - Screen Pinning (setup guide)
 *
 * Premium Features:
 * - Camera (cop photos, document scanning)
 * - Microphone (audio recording)
 * - SMS/Phone (attorney/emergency calls)
 */

import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import * as IntentLauncher from 'expo-intent-launcher';
import * as SecureStore from 'expo-secure-store';

// Camera permission functions from the Camera object
const { getCameraPermissionsAsync, requestCameraPermissionsAsync } = Camera;

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'undetermined';
  camera: 'granted' | 'denied' | 'undetermined';
  microphone: 'granted' | 'denied' | 'undetermined';
  storage: 'granted' | 'denied' | 'undetermined';
  screenPinning: 'enabled' | 'disabled' | 'unknown';
}

export interface PermissionResult {
  permission: keyof PermissionStatus;
  granted: boolean;
  canAskAgain?: boolean;
}

// Storage keys
const PERMISSIONS_CHECKED_KEY = 'permissions_checked';
const SCREEN_PINNING_CONFIRMED_KEY = 'screen_pinning_confirmed';

/**
 * Check all permission statuses
 */
export async function checkAllPermissions(): Promise<PermissionStatus> {
  const status: PermissionStatus = {
    location: 'undetermined',
    camera: 'undetermined',
    microphone: 'undetermined',
    storage: 'undetermined',
    screenPinning: 'unknown',
  };

  try {
    // Location
    const locationStatus = await Location.getForegroundPermissionsAsync();
    status.location = locationStatus.granted ? 'granted' : locationStatus.canAskAgain ? 'undetermined' : 'denied';

    // Camera
    const cameraStatus = await getCameraPermissionsAsync();
    status.camera = cameraStatus.granted ? 'granted' : cameraStatus.canAskAgain ? 'undetermined' : 'denied';

    // Microphone
    const micStatus = await Audio.getPermissionsAsync();
    status.microphone = micStatus.granted ? 'granted' : micStatus.canAskAgain ? 'undetermined' : 'denied';

    // Storage/Media Library
    const storageStatus = await MediaLibrary.getPermissionsAsync();
    status.storage = storageStatus.granted ? 'granted' : storageStatus.canAskAgain ? 'undetermined' : 'denied';

    // Screen Pinning - use SecureStore for local storage
    const pinningConfirmed = await SecureStore.getItemAsync(SCREEN_PINNING_CONFIRMED_KEY);
    status.screenPinning = pinningConfirmed === 'true' ? 'enabled' : 'disabled';
  } catch (error) {
    console.error('Error checking permissions:', error);
  }

  return status;
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      permission: 'location',
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('Location permission error:', error);
    return { permission: 'location', granted: false };
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await requestCameraPermissionsAsync();
    return {
      permission: 'camera',
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('Camera permission error:', error);
    return { permission: 'camera', granted: false };
  }
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await Audio.requestPermissionsAsync();
    return {
      permission: 'microphone',
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('Microphone permission error:', error);
    return { permission: 'microphone', granted: false };
  }
}

/**
 * Request storage/media library permission
 */
export async function requestStoragePermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    return {
      permission: 'storage',
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('Storage permission error:', error);
    return { permission: 'storage', granted: false };
  }
}

/**
 * Request all permissions in sequence
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
  await requestLocationPermission();
  await requestStoragePermission();
  await requestCameraPermission();
  await requestMicrophonePermission();
  return await checkAllPermissions();
}

/**
 * Open app settings for manual permission changes
 */
export async function openAppSettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
        { data: 'package:com.securestop.app' }
      );
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Failed to open settings:', error);
    await Linking.openSettings();
  }
}

/**
 * Open screen pinning settings (Android)
 */
export async function openScreenPinningSettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.SECURITY_SETTINGS
        );
        return;
      } catch (e) {
        // Fall back to general settings
      }
    }
    await Linking.openSettings();
  } catch (error) {
    console.error('Failed to open security settings:', error);
    await Linking.openSettings();
  }
}

/**
 * Mark screen pinning as confirmed by user - stored locally
 */
export async function confirmScreenPinning(): Promise<void> {
  await SecureStore.setItemAsync(SCREEN_PINNING_CONFIRMED_KEY, 'true');
}

/**
 * Mark permissions as checked (for first-run flow) - stored locally
 */
export async function markPermissionsChecked(): Promise<void> {
  await SecureStore.setItemAsync(PERMISSIONS_CHECKED_KEY, 'true');
}

/**
 * Check if permissions have been checked before
 */
export async function hasCheckedPermissions(): Promise<boolean> {
  const checked = await SecureStore.getItemAsync(PERMISSIONS_CHECKED_KEY);
  return checked === 'true';
}

/**
 * Get count of granted permissions
 */
export function getGrantedCount(status: PermissionStatus): number {
  let count = 0;
  if (status.location === 'granted') count++;
  if (status.camera === 'granted') count++;
  if (status.microphone === 'granted') count++;
  if (status.storage === 'granted') count++;
  if (status.screenPinning === 'enabled') count++;
  return count;
}

/**
 * Check if all critical permissions are granted
 */
export function hasCriticalPermissions(status: PermissionStatus): boolean {
  return status.location === 'granted' && status.storage === 'granted';
}

/**
 * Make a phone call (for emergency contacts)
 */
export async function makePhoneCall(phoneNumber: string): Promise<boolean> {
  try {
    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Phone call error:', error);
    return false;
  }
}

/**
 * Send SMS (for emergency contacts)
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const SMS = await import('expo-sms');
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([phoneNumber], message);
      return true;
    }
    return false;
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
}


/**
 * Check if user has required permissions for Secure Mode
 * Required: Screen Pinning, Storage
 * Returns object with missing permissions
 */
export interface SecureModePermissionCheck {
  hasRequiredPermissions: boolean;
  missingRequired: string[];
  optionalPermissions: {
    camera: boolean;
    location: boolean;
    microphone: boolean;
  };
  proFeatures: {
    cameraForCopPhotos: boolean;
    phoneAccess: boolean;
    microphoneRecording: boolean;
  };
}

export async function checkSecureModePermissions(): Promise<SecureModePermissionCheck> {
  const status = await checkAllPermissions();
  
  // Required permissions
  const requiredChecks = {
    screenPinning: status.screenPinning === 'enabled',
    storage: status.storage === 'granted',
  };
  
  const missingRequired: string[] = [];
  if (!requiredChecks.screenPinning) missingRequired.push('Screen Pinning');
  if (!requiredChecks.storage) missingRequired.push('Storage');
  
  // Optional permissions for basic features
  const optionalPermissions = {
    camera: status.camera === 'granted', // For document scanning
    location: status.location === 'granted', // For police interaction tracking
    microphone: status.microphone === 'granted', // For audio recording
  };
  
  // Pro feature permissions (subset of optional)
  const proFeatures = {
    cameraForCopPhotos: status.camera === 'granted', // Pro: Cop photo capture
    phoneAccess: true, // Pro: Emergency calls (using Linking, no permission needed)
    microphoneRecording: status.microphone === 'granted', // Pro: Audio recording during stop
  };
  
  return {
    hasRequiredPermissions: missingRequired.length === 0,
    missingRequired,
    optionalPermissions,
    proFeatures,
  };
}

/**
 * Request required permissions for Secure Mode
 * Returns true if all required permissions granted
 */
export async function requestSecureModePermissions(): Promise<boolean> {
  // Request storage first
  const storageResult = await requestStoragePermission();
  
  // Check screen pinning status
  const pinningConfirmed = await SecureStore.getItemAsync(SCREEN_PINNING_CONFIRMED_KEY);
  
  // If screen pinning not confirmed, guide user to enable it
  if (pinningConfirmed !== 'true') {
    await openScreenPinningSettings();
    return false;
  }
  
  return storageResult.granted && pinningConfirmed === 'true';
}

export default {
  checkAllPermissions,
  requestAllPermissions,
  requestLocationPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  requestStoragePermission,
  openAppSettings,
  openScreenPinningSettings,
  confirmScreenPinning,
  markPermissionsChecked,
  hasCheckedPermissions,
  getGrantedCount,
  hasCriticalPermissions,
  makePhoneCall,
  sendSMS,
  checkSecureModePermissions,
  requestSecureModePermissions,
};
