import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as Permissions from '../utils/permissions';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // CRITICAL: Check if secure mode is active FIRST.
      // If the user activated secure mode, we must return them there immediately
      // instead of running normal auth flow which would redirect away.
      const secureModeActive = await SecureStore.getItemAsync('secure_mode_active');
      if (secureModeActive === 'true') {
        router.replace('/secure-mode');
        return;
      }

      // Check if permissions have been set up
      const hasCheckedPermissions = await Permissions.hasCheckedPermissions();

      // Small delay for splash effect
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!hasCheckedPermissions) {
        // First launch - go to permissions setup
        router.replace('/permissions');
        return;
      }

      // Check if user is authenticated locally (using secure storage)
      const userId = await SecureStore.getItemAsync('user_id');
      const userPin = await SecureStore.getItemAsync('user_pin');

      // Check if user is authenticated and not in secure mode
      if (userId && userPin) {
        // We have local credentials securely stored, go home
        router.replace('/home');
      } else if (userId) {
        // User has completed setup but secure mode is active - go to unlock
        router.replace('/unlock');
      } else {
        // No valid local session - go to setup/login
        router.replace('/setup');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={80} color="#007AFF" />
        </View>
        <Text style={styles.title}>Secure Stop</Text>
        <Text style={styles.subtitle}>Your documents, protected</Text>
      </View>
      {isLoading && (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  loader: {
    marginTop: 60,
  },
});
