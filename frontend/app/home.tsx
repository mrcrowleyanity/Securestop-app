import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Home() {
  const [userEmail, setUserEmail] = useState('');
  const [hasLocation, setHasLocation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []);

  const loadUserData = async () => {
    const email = await AsyncStorage.getItem('user_email');
    if (email) setUserEmail(email);
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocation(status === 'granted');
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const handleActivateSecureMode = () => {
    // Go directly to officer login - no PIN required to activate
    router.push('/officer-login');
  };

  const verifyPinAndActivate = async () => {
    if (pin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    setIsVerifying(true);
    setPinError('');

    try {
      const userId = await AsyncStorage.getItem('user_id');
      const response = await axios.post(`${API_URL}/api/users/verify-pin`, {
        user_id: userId,
        pin: pin,
      });

      if (response.data.success) {
        setShowPinModal(false);
        setPin('');
        // Navigate to officer login - this starts secure mode
        setTimeout(() => {
          router.push('/officer-login');
        }, 100);
      } else {
        setPinError('Incorrect PIN. Try again.');
        setPin('');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setPinError('Failed to verify PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const menuItems = [
    {
      icon: 'document-text',
      title: 'My Documents',
      subtitle: 'View and manage stored documents',
      route: '/documents',
      color: '#007AFF',
    },
    {
      icon: 'add-circle',
      title: 'Add Document',
      subtitle: 'Upload ID, license, or other docs',
      route: '/add-document',
      color: '#34C759',
    },
    {
      icon: 'time',
      title: 'Access History',
      subtitle: 'View officer access logs',
      route: '/access-history',
      color: '#FF9500',
    },
    {
      icon: 'settings',
      title: 'Settings',
      subtitle: 'Change PIN and preferences',
      route: '/settings',
      color: '#8E8E93',
    },
  ];

  const renderPinModal = () => (
    <Modal
      visible={showPinModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPinModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pinModal}>
          <View style={styles.pinModalHeader}>
            <Ionicons name="lock-closed" size={40} color="#FF3B30" />
            <Text style={styles.pinModalTitle}>Confirm Activation</Text>
            <Text style={styles.pinModalSubtitle}>
              Enter your PIN to activate secure mode
            </Text>
          </View>

          {pinError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{pinError}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.pinInput}
            placeholder="Enter PIN"
            placeholderTextColor="#666"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color="#FF9500" />
            <Text style={styles.warningText}>
              Once activated, only your PIN can exit secure mode. The phone will be locked to this app.
            </Text>
          </View>

          <View style={styles.pinModalButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowPinModal(false)}
              disabled={isVerifying}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.activateBtn, isVerifying && styles.btnDisabled]}
              onPress={verifyPinAndActivate}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.activateBtnText}>Activate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoSmall}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Secure Folder</Text>
        </View>
        <Text style={styles.headerEmail}>{userEmail}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Secure Mode Button */}
        <TouchableOpacity
          style={styles.secureModeButton}
          onPress={handleActivateSecureMode}
          activeOpacity={0.8}
        >
          <View style={styles.secureModeIcon}>
            <Ionicons name="lock-closed" size={40} color="#fff" />
          </View>
          <View style={styles.secureModeContent}>
            <Text style={styles.secureModeTitle}>Activate Secure Mode</Text>
            <Text style={styles.secureModeSubtitle}>
              Lock phone for police encounters
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoBannerText}>
            Secure mode locks your phone to this app. Officers must enter credentials to view documents.
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons
              name={hasLocation ? 'location' : 'location-outline'}
              size={16}
              color={hasLocation ? '#34C759' : '#FF3B30'}
            />
            <Text style={[styles.statusText, { color: hasLocation ? '#34C759' : '#FF3B30' }]}>
              {hasLocation ? 'Location enabled' : 'Location disabled'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderPinModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    marginLeft: 52,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  secureModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  secureModeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  secureModeContent: {
    flex: 1,
  },
  secureModeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  secureModeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  statusContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
  // PIN Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  pinModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  pinModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  pinInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    color: '#FF9500',
    fontSize: 12,
    lineHeight: 18,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  activateBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  activateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
