import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Permissions from '../utils/permissions';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if permissions have been set up
      const hasCheckedPermissions = await Permissions.hasCheckedPermissions();
      
      // Small delay for splash effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (!hasCheckedPermissions) {
        // First launch - go to permissions setup
        router.replace('/permissions');
        return;
      }
      
      // Check if user is authenticated
      const userId = await AsyncStorage.getItem('user_id');
      
      if (userId) {
        router.replace('/home');
      } else {
        router.replace('/setup');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/permissions');
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
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
});
