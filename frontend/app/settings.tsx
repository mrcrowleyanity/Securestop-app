import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import {
  getEmergencyContact, saveEmergencyContact,
  getAttorneyContact, saveAttorneyContact,
  deleteEmergencyContact, deleteAttorneyContact,
  type ContactInfo
} from '../utils/emergencyContact';
import { isFoundingMember, getFoundingMemberSpotsRemaining, FOUNDING_MEMBER_MAX } from '../utils/proFeatures';
export default function Settings() {
  const [userEmail, setUserEmail] = useState('');
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    // user_email is stored in SecureStore by setup.tsx
    const email = await SecureStore.getItemAsync('user_email');
    if (email) setUserEmail(email);
  };

  const handleChangePin = async () => {
    if (currentPin.length < 4) {
      Alert.alert('Error', 'Please enter your current PIN');
      return;
    }
    if (newPin.length < 4) {
      Alert.alert('Error', 'New PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Verify current PIN locally
      const storedPin = await SecureStore.getItemAsync('user_pin');
      if (!storedPin || storedPin !== currentPin) {
        Alert.alert('Error', 'Current PIN is incorrect');
        setIsLoading(false);
        return;
      }

      // Update PIN locally
      await SecureStore.setItemAsync('user_pin', newPin);

      Alert.alert('Success', 'PIN updated successfully');
      setShowChangePinModal(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      console.error('Change PIN error:', error);
      Alert.alert('Error', 'Failed to update PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to set up the app again on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Clear AsyncStorage
            await AsyncStorage.clear();
            // Also clear SecureStore keys so index.tsx does not auto-login
            await SecureStore.deleteItemAsync('user_id').catch(() => {});
            await SecureStore.deleteItemAsync('user_pin').catch(() => {});
            await SecureStore.deleteItemAsync('user_email').catch(() => {});
            await SecureStore.deleteItemAsync('secure_mode_active').catch(() => {});
            router.replace('/setup');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all stored documents. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            // Also clear all SecureStore keys
            await SecureStore.deleteItemAsync('user_id').catch(() => {});
            await SecureStore.deleteItemAsync('user_pin').catch(() => {});
            await SecureStore.deleteItemAsync('user_email').catch(() => {});
            await SecureStore.deleteItemAsync('secure_mode_active').catch(() => {});
            router.replace('/setup');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="person" size={20} color="#007AFF" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{userEmail}</Text>
          </View>
        </View>
      </View>

      {/* Security Section */}
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowChangePinModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="lock-closed" size={20} color="#FF9500" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Change PIN</Text>
            <Text style={styles.settingSubtext}>Update your secure mode PIN</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <Text style={styles.sectionTitle}>Information</Text>
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="information-circle" size={20} color="#888" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Security Status</Text>
            <Text style={styles.settingValue}>Protected</Text>
          </View>
        </View>
      </View>

      {/* Premium Section */}
      <Text style={styles.sectionTitle}>Premium</Text>
      <View style={styles.section}>
        <View style={styles.premiumBanner}>
          <View style={styles.premiumContent}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Secure Stop Protect Pro</Text>
              <Text style={styles.premiumSubtitle}>$4.99/month</Text>
            </View>
          </View>
          <View style={styles.premiumFeatures}>
            <View style={styles.premiumFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.premiumFeatureText}>Auto audio recording of encounters</Text>
            </View>
            <View style={styles.premiumFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.premiumFeatureText}>Front camera officer photo capture</Text>
            </View>
            <View style={styles.premiumFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.premiumFeatureText}>GPS location logging</Text>
            </View>
            <View style={styles.premiumFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.premiumFeatureText}>One-tap attorney & emergency contact</Text>
            </View>
            <View style={styles.premiumFeatureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.premiumFeatureText}>Badge rate limiting & flagging</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.8}>
            <Ionicons name="star" size={18} color="#0f0f1a" />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro — Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Contacts Section */}
      <Text style={styles.sectionTitle}>Emergency Contacts (Pro)</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            setContactName(emergencyContact?.name || '');
            setContactPhone(emergencyContact?.phone || '');
            setShowEmergencyModal(true);
          }}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="alert-circle" size={20} color="#FF6B00" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Emergency Contact</Text>
            <Text style={styles.settingSubtext}>
              {emergencyContact ? `${emergencyContact.name} — ${emergencyContact.phone}` : 'Not configured'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            setContactName(attorneyContact?.name || '');
            setContactPhone(attorneyContact?.phone || '');
            setShowAttorneyModal(true);
          }}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="briefcase" size={20} color="#2e6da4" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Attorney Contact</Text>
            <Text style={styles.settingSubtext}>
              {attorneyContact ? `${attorneyContact.name} — ${attorneyContact.phone}` : 'Not configured'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Founding Member Status */}
      {foundingMember && (
        <>
          <Text style={styles.sectionTitle}>Membership</Text>
          <View style={styles.section}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Founding Member</Text>
                <Text style={styles.settingSubtext}>$4.99/month — Price locked forever</Text>
              </View>
              <View style={styles.foundingBadge}>
                <Text style={styles.foundingBadgeText}>#{FOUNDING_MEMBER_MAX - spotsRemaining}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Danger Zone */}
      <Text style={styles.sectionTitle}>Account Actions</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <View style={styles.settingIcon}>
            <Ionicons name="log-out" size={20} color="#FF3B30" />
          </View>
          <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
          <View style={styles.settingIcon}>
            <Ionicons name="trash" size={20} color="#FF3B30" />
          </View>
          <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contact Modal */}
      <Modal visible={showEmergencyModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Emergency Contact</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Full name"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                if (!contactName || !contactPhone) {
                  Alert.alert('Error', 'Please fill in all fields');
                  return;
                }
                await saveEmergencyContact({ name: contactName, phone: contactPhone });
                setEmergencyContactState({ name: contactName, phone: contactPhone });
                setShowEmergencyModal(false);
                Alert.alert('Saved', 'Emergency contact saved successfully');
              }}
            >
              <Text style={styles.saveButtonText}>Save Contact</Text>
            </TouchableOpacity>
            {emergencyContact && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#FF3B30', marginTop: 12 }]}
                onPress={async () => {
                  await deleteEmergencyContact();
                  setEmergencyContactState(null);
                  setShowEmergencyModal(false);
                  Alert.alert('Removed', 'Emergency contact removed');
                }}
              >
                <Text style={styles.saveButtonText}>Remove Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Attorney Contact Modal */}
      <Modal visible={showAttorneyModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAttorneyModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Attorney Contact</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Attorney Name</Text>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Attorney full name"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Attorney phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                if (!contactName || !contactPhone) {
                  Alert.alert('Error', 'Please fill in all fields');
                  return;
                }
                await saveAttorneyContact({ name: contactName, phone: contactPhone });
                setAttorneyContactState({ name: contactName, phone: contactPhone });
                setShowAttorneyModal(false);
                Alert.alert('Saved', 'Attorney contact saved successfully');
              }}
            >
              <Text style={styles.saveButtonText}>Save Attorney</Text>
            </TouchableOpacity>
            {attorneyContact && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#FF3B30', marginTop: 12 }]}
                onPress={async () => {
                  await deleteAttorneyContact();
                  setAttorneyContactState(null);
                  setShowAttorneyModal(false);
                  Alert.alert('Removed', 'Attorney contact removed');
                }}
              >
                <Text style={styles.saveButtonText}>Remove Attorney</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Change PIN Modal */}
      <Modal visible={showChangePinModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChangePinModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change PIN</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current PIN</Text>
              <TextInput
                style={styles.input}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="Enter current PIN"
                placeholderTextColor="#666"
                secureTextEntry
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN (min 4 digits)"
                placeholderTextColor="#666"
                secureTextEntry
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                placeholderTextColor="#666"
                secureTextEntry
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleChangePin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Update PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scrollView: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 16, color: '#fff' },
  settingValue: { fontSize: 14, color: '#888', marginTop: 2 },
  settingSubtext: { fontSize: 12, color: '#666', marginTop: 2 },
  premiumBanner: { padding: 16 },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumText: { flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  premiumSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  comingSoon: { marginTop: 12, color: '#FFD700', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#0f0f1a' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  modalCancel: { color: '#007AFF', fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#888', marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  premiumFeatures: { marginTop: 12 },
  premiumFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  premiumFeatureText: { color: '#ccc', fontSize: 13, flex: 1 },
  upgradeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 14,
    marginTop: 16, gap: 8,
  },
  upgradeButtonText: { color: '#0f0f1a', fontSize: 15, fontWeight: '700' },
});
