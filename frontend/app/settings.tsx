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
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
    const email = await AsyncStorage.getItem('user_email');
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
      const userId = await AsyncStorage.getItem('user_id');
      
      // First verify current PIN
      const verifyResponse = await axios.post(`${API_URL}/api/users/verify-pin`, {
        user_id: userId,
        pin: currentPin,
      });

      if (!verifyResponse.data.success) {
        Alert.alert('Error', 'Current PIN is incorrect');
        return;
      }

      // Update PIN
      await axios.put(`${API_URL}/api/users/${userId}/pin?old_pin=${currentPin}&new_pin=${newPin}`);

      Alert.alert('Success', 'PIN updated successfully');
      setShowChangePinModal(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      console.error('Change PIN error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update PIN');
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
            await AsyncStorage.clear();
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
            // For MVP, just clear local storage
            await AsyncStorage.clear();
            router.replace('/setup');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="mail" size={20} color="#007AFF" />
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
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowChangePinModal(true)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="key" size={20} color="#FF9500" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Change PIN</Text>
              <Text style={styles.settingSubtext}>Update your secure mode PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle" size={20} color="#34C759" />
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
              <Text style={[styles.settingValue, { color: '#34C759' }]}>Protected</Text>
            </View>
          </View>
        </View>

        {/* Premium Section - Placeholder */}
        <Text style={styles.sectionTitle}>Premium</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.premiumBanner}>
            <View style={styles.premiumContent}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>Background voice recording & more</Text>
              </View>
            </View>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingIcon}>
              <Ionicons name="log-out" size={20} color="#FF9500" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: '#FF9500' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={styles.settingIcon}>
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal
        visible={showChangePinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangePinModal(false)}
      >
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
                placeholder="Enter current PIN"
                placeholderTextColor="#666"
                value={currentPin}
                onChangeText={setCurrentPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new PIN (4+ digits)"
                placeholderTextColor="#666"
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new PIN"
                placeholderTextColor="#666"
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
  },
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
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  settingValue: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  settingSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  premiumBanner: {
    padding: 16,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  comingSoon: {
    marginTop: 12,
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  modalCancel: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
