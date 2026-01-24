import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function Home() {
  const [userEmail, setUserEmail] = useState('');
  const [hasLocation, setHasLocation] = useState(false);

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
    Alert.alert(
      'Activate Secure Mode',
      'This will lock the app to document viewing mode. An officer will need to enter their credentials to view your documents.\n\nYou will need your PIN to exit secure mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'destructive',
          onPress: () => router.push('/officer-login'),
        },
      ]
    );
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
            When activated, officers must enter their credentials to view your documents
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
