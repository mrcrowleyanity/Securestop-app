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
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function OfficerLogin() {
  const [officerName, setOfficerName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      // Check if user is authenticated
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        console.error('No user_id found - redirecting to setup');
        router.replace('/setup');
        return;
      }

      // Get location
      await getLocation();
      setIsInitialized(true);
    } catch (error) {
      console.error('Initialization error:', error);
      setIsInitialized(true);
    }
  };

  // Block back button - NO WAY TO EXIT without entering credentials
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        setError('Officer credentials required to proceed');
        setTimeout(() => setError(''), 2000);
        return true; // Prevent back
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        console.log('Location obtained:', loc.coords.latitude, loc.coords.longitude);
      } else {
        console.log('Location permission not granted');
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const validateInputs = (): boolean => {
    if (!officerName.trim()) {
      setError('Officer name is required');
      setTimeout(() => setError(''), 2000);
      return false;
    }
    if (officerName.trim().length < 2) {
      setError('Please enter a valid name');
      setTimeout(() => setError(''), 2000);
      return false;
    }
    if (!badgeNumber.trim()) {
      setError('Badge number is required');
      setTimeout(() => setError(''), 2000);
      return false;
    }
    if (badgeNumber.trim().length < 2) {
      setError('Please enter a valid badge number');
      setTimeout(() => setError(''), 2000);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    setError('');

    try {
      // Verify user is still authenticated
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setError('Session expired. Please restart the app.');
        setIsLoading(false);
        setTimeout(() => router.replace('/setup'), 1500);
        return;
      }

      // Store officer info for the secure mode session
      const dataToStore = [
        ['current_officer_name', officerName.trim()],
        ['current_officer_badge', badgeNumber.trim()],
        ['secure_mode_active', 'true'],
        ['secure_mode_start_time', new Date().toISOString()],
      ];

      if (location) {
        dataToStore.push(['current_location', JSON.stringify(location)]);
      }

      // Use multiSet for atomic operation
      await AsyncStorage.multiSet(dataToStore);

      console.log('Officer credentials saved successfully');
      console.log('- Officer:', officerName.trim());
      console.log('- Badge:', badgeNumber.trim());
      console.log('- Location:', location ? 'Yes' : 'No');

      // Navigate to secure mode
      router.replace('/secure-mode');
    } catch (error) {
      console.error('Error saving officer data:', error);
      setError('Failed to proceed. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
                returnKeyType="next"
                testID="officer-name-input"
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
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                testID="badge-number-input"
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
              activeOpacity={0.8}
              testID="access-documents-btn"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 12,
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
