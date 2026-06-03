import * as SecureStore from 'expo-secure-store';
import * as SMS from 'expo-sms';
import { Linking, Alert } from 'react-native';

export interface ContactInfo {
  name: string;
  phone: string;
}

const EMERGENCY_KEY = 'emergency_contact_v1';
const ATTORNEY_KEY = 'attorney_contact_v1';

export async function getEmergencyContact(): Promise<ContactInfo | null> {
  try {
    const data = await SecureStore.getItemAsync(EMERGENCY_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function getAttorneyContact(): Promise<ContactInfo | null> {
  try {
    const data = await SecureStore.getItemAsync(ATTORNEY_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function saveEmergencyContact(contact: ContactInfo): Promise<void> {
  await SecureStore.setItemAsync(EMERGENCY_KEY, JSON.stringify(contact));
}

export async function saveAttorneyContact(contact: ContactInfo): Promise<void> {
  await SecureStore.setItemAsync(ATTORNEY_KEY, JSON.stringify(contact));
}

export async function deleteEmergencyContact(): Promise<void> {
  await SecureStore.deleteItemAsync(EMERGENCY_KEY).catch(() => {});
}

export async function deleteAttorneyContact(): Promise<void> {
  await SecureStore.deleteItemAsync(ATTORNEY_KEY).catch(() => {});
}

export async function sendEmergencyAlert(
  officerName: string,
  badgeNumber: string,
  latitude: number | null,
  longitude: number | null
): Promise<boolean> {
  try {
    const contact = await getEmergencyContact();
    if (!contact?.phone) {
      Alert.alert('No Emergency Contact', 'Please set up an emergency contact in Settings first.');
      return false;
    }

    const locationText = latitude && longitude
      ? `Location: https://maps.google.com/?q=${latitude},${longitude}`
      : 'Location: unavailable';

    const message = `SECURE STOP ALERT: I am in a police encounter. Officer: ${officerName}, Badge: ${badgeNumber}. ${locationText}. Time: ${new Date().toLocaleString()}. This message was sent automatically by Secure Stop Protect.`;

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([contact.phone], message);
      return true;
    } else {
      await Linking.openURL(
        `sms:${contact.phone}?body=${encodeURIComponent(message)}`
      );
      return true;
    }
  } catch (e) {
    console.error('Emergency alert error:', e);
    return false;
  }
}

export async function callAttorney(): Promise<void> {
  const contact = await getAttorneyContact();
  if (!contact?.phone) {
    Alert.alert('No Attorney Contact', 'Please set up an attorney contact in Settings first.');
    return;
  }
  await Linking.openURL(`tel:${contact.phone}`);
}

export async function callEmergencyContact(): Promise<void> {
  const contact = await getEmergencyContact();
  if (!contact?.phone) {
    Alert.alert('No Emergency Contact', 'Please set up an emergency contact in Settings first.');
    return;
  }
  await Linking.openURL(`tel:${contact.phone}`);
}

export async function hasEmergencyContact(): Promise<boolean> {
  const c = await getEmergencyContact();
  return !!(c?.phone);
}

export async function hasAttorneyContact(): Promise<boolean> {
  const c = await getAttorneyContact();
  return !!(c?.phone);
}
