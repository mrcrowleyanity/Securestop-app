/**
 * Emergency Contacts Manager
 * Premium feature for quick access to attorney and emergency contacts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'attorney' | 'emergency' | 'family';
  isDefault: boolean;
}

const EMERGENCY_CONTACTS_KEY = 'emergency_contacts';
const DEFAULT_MESSAGE = "I've been stopped by police. My location: ";

/**
 * Get all saved emergency contacts
 */
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const data = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting emergency contacts:', error);
    return [];
  }
}

/**
 * Save an emergency contact
 */
export async function saveEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
  try {
    const contacts = await getEmergencyContacts();
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now().toString(),
    };
    
    // If this is set as default, unset others of same type
    if (newContact.isDefault) {
      contacts.forEach(c => {
        if (c.type === newContact.type) {
          c.isDefault = false;
        }
      });
    }
    
    contacts.push(newContact);
    await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(contacts));
    return newContact;
  } catch (error) {
    console.error('Error saving emergency contact:', error);
    throw error;
  }
}

/**
 * Update an emergency contact
 */
export async function updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<void> {
  try {
    const contacts = await getEmergencyContacts();
    const index = contacts.findIndex(c => c.id === id);
    
    if (index !== -1) {
      // If setting as default, unset others of same type
      if (updates.isDefault) {
        contacts.forEach(c => {
          if (c.type === contacts[index].type) {
            c.isDefault = false;
          }
        });
      }
      
      contacts[index] = { ...contacts[index], ...updates };
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(contacts));
    }
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    throw error;
  }
}

/**
 * Delete an emergency contact
 */
export async function deleteEmergencyContact(id: string): Promise<void> {
  try {
    const contacts = await getEmergencyContacts();
    const filtered = contacts.filter(c => c.id !== id);
    await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    throw error;
  }
}

/**
 * Get default contact by type
 */
export async function getDefaultContact(type: 'attorney' | 'emergency' | 'family'): Promise<EmergencyContact | null> {
  const contacts = await getEmergencyContacts();
  return contacts.find(c => c.type === type && c.isDefault) || null;
}

/**
 * Make a phone call to a contact
 */
export async function callContact(phone: string): Promise<boolean> {
  try {
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error making call:', error);
    return false;
  }
}

/**
 * Send SMS to a contact with location
 */
export async function sendEmergencySMS(
  phone: string, 
  latitude?: number, 
  longitude?: number,
  customMessage?: string
): Promise<boolean> {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      console.log('SMS not available');
      return false;
    }
    
    let message = customMessage || DEFAULT_MESSAGE;
    if (latitude && longitude) {
      message += `https://maps.google.com/?q=${latitude},${longitude}`;
    }
    
    await SMS.sendSMSAsync([phone], message);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Quick action - call attorney
 */
export async function callAttorney(): Promise<boolean> {
  const attorney = await getDefaultContact('attorney');
  if (attorney) {
    return callContact(attorney.phone);
  }
  return false;
}

/**
 * Quick action - call emergency contact
 */
export async function callEmergencyContact(): Promise<boolean> {
  const emergency = await getDefaultContact('emergency');
  if (emergency) {
    return callContact(emergency.phone);
  }
  return false;
}

/**
 * Quick action - text all emergency contacts with location
 */
export async function textAllEmergencyContacts(
  latitude?: number, 
  longitude?: number
): Promise<number> {
  const contacts = await getEmergencyContacts();
  let successCount = 0;
  
  for (const contact of contacts) {
    const success = await sendEmergencySMS(contact.phone, latitude, longitude);
    if (success) successCount++;
  }
  
  return successCount;
}

/**
 * Pick a contact from device contacts
 */
export async function pickContactFromDevice(): Promise<{ name: string; phone: string } | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    
    // Note: Contacts.presentContactPickerAsync is not available in all Expo versions
    // This is a simplified version - in production, you'd show a custom contact picker
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    
    if (data.length > 0 && data[0].phoneNumbers && data[0].phoneNumbers.length > 0) {
      return {
        name: data[0].name || 'Unknown',
        phone: data[0].phoneNumbers[0].number || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error picking contact:', error);
    return null;
  }
}

export default {
  getEmergencyContacts,
  saveEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getDefaultContact,
  callContact,
  sendEmergencySMS,
  callAttorney,
  callEmergencyContact,
  textAllEmergencyContacts,
  pickContactFromDevice,
};
