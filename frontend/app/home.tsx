import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function Home() {
  const [userEmail, setUserEmail] = useState('');
  const [hasLocation, setHasLocation] = useState(false);
  const [showPinningModal, setShowPinningModal] = useState(false);

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

  const openScreenPinningSettings = async () => {
    if (Platform.OS === 'android') {
      try {
        // Try to open security settings directly
        await Linking.openSettings();
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
    setShowPinningModal(false);
  };

  const renderPinningModal = () => (
    <Modal
      visible={showPinningModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPinningModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Ionicons name="phone-portrait" size={48} color="#007AFF" />
          </View>
          <Text style={styles.modalTitle}>Setup Screen Pinning</Text>
          <Text style={styles.modalSubtitle}>
            Screen pinning locks your phone to the Secure Folder app during police encounters.
          </Text>
          
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Go to Settings → Security & Privacy</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Find "App Pinning" or "Screen Pinning"</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Turn it ON and enable "Ask for PIN to unpin"</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>In Secure Mode, use Recent Apps → Pin icon</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb" size={18} color="#FF9500" />
            <Text style={styles.tipText}>
              Once pinned, hold Back + Recent to unpin (requires your PIN)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.openSettingsBtn}
            onPress={openScreenPinningSettings}
          >
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.openSettingsBtnText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => setShowPinningModal(false)}
          >
            <Text style={styles.dismissBtnText}>I'll do this later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
});
