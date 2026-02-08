import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ScreenOrientation from 'expo-screen-orientation';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function OfficerLogin() {
  const [officerName, setOfficerName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLocation();
    // Lock screen orientation
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  // Block back button - NO WAY TO EXIT without entering credentials
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Show error message instead of allowing back
        setError('Officer credentials required to proceed');
        setTimeout(() => setError(''), 2000);
        return true; // Prevent back
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!officerName.trim()) {
      setError('Officer name is required');
      setTimeout(() => setError(''), 2000);
      return;
    }
    if (!badgeNumber.trim()) {
      setError('Badge number is required');
      setTimeout(() => setError(''), 2000);
      return;
    }

    setIsLoading(true);
    try {
      // Store officer info for the secure mode session
      await AsyncStorage.setItem('current_officer_name', officerName.trim());
      await AsyncStorage.setItem('current_officer_badge', badgeNumber.trim());
      await AsyncStorage.setItem('secure_mode_active', 'true');
      if (location) {
        await AsyncStorage.setItem('current_location', JSON.stringify(location));
      }

      console.log('Officer credentials saved, entering secure mode...');
      
      // Navigate to secure mode
      setTimeout(() => {
        router.replace('/secure-mode');
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to proceed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Locked indicator */}
      <View style={styles.lockedBanner}>
        <Ionicons name="lock-closed" size={16} color="#FF3B30" />
        <Text style={styles.lockedText}>SECURE MODE ACTIVATED - CREDENTIALS REQUIRED</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield" size={60} color="#FF9500" />
          </View>
          <Text style={styles.title}>Officer Verification</Text>
          <Text style={styles.subtitle}>
            Enter your credentials to access documents
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={18} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Officer Full Name"
              placeholderTextColor="#666"
              value={officerName}
              onChangeText={setOfficerName}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="card" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Badge Number"
              placeholderTextColor="#666"
              value={badgeNumber}
              onChangeText={setBadgeNumber}
              autoCapitalize="characters"
              editable={!isLoading}
            />
          </View>

          {location && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color="#34C759" />
              <Text style={styles.locationText}>Location will be logged</Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color="#FF9500" />
            <Text style={styles.disclaimerText}>
              This access will be permanently logged with timestamp, location, and your credentials for legal documentation purposes.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Access Documents</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* NO CANCEL BUTTON - Officers must enter credentials */}
          <View style={styles.noExitNotice}>
            <Ionicons name="lock-closed" size={14} color="#666" />
            <Text style={styles.noExitText}>
              Secure mode is active. Credentials required to proceed.
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    gap: 8,
  },
  lockedText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    padding: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
    color: '#fff',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    color: '#34C759',
    fontSize: 12,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    color: '#FF9500',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  noExitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  noExitText: {
    color: '#666',
    fontSize: 12,
  },
});
