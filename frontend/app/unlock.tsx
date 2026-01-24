import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Unlock() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Request camera permission on mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  const captureIntruderPhoto = async (): Promise<string | null> => {
    try {
      if (!permission?.granted) {
        console.log('Camera permission not granted');
        return null;
      }

      // Show camera briefly to capture
      setShowCamera(true);
      
      // Wait for camera to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });
        
        setShowCamera(false);
        
        if (photo?.base64) {
          return `data:image/jpeg;base64,${photo.base64}`;
        }
      }
      
      setShowCamera(false);
      return null;
    } catch (error) {
      console.error('Failed to capture photo:', error);
      setShowCamera(false);
      return null;
    }
  };

  const handlePinSubmit = async () => {
    if (isLocked) return;
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter your full PIN');
      return;
    }

    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const userEmail = await AsyncStorage.getItem('user_email');

      const response = await axios.post(`${API_URL}/api/users/verify-pin`, {
        user_id: userId,
        pin: pin,
      });

      if (response.data.success) {
        // Log the officer access before exiting
        await logOfficerAccess();
        
        // Clear secure mode data
        await AsyncStorage.removeItem('current_officer_name');
        await AsyncStorage.removeItem('current_officer_badge');
        await AsyncStorage.removeItem('current_location');

        router.replace('/home');
      } else {
        await handleFailedAttempt(userId, userEmail);
      }
    } catch (error) {
      console.error('Unlock error:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    } finally {
      setIsLoading(false);
      setPin('');
    }
  };

  const handleFailedAttempt = async (userId: string | null, userEmail: string | null) => {
    Vibration.vibrate(500);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Capture photo of intruder
    let intruderPhoto: string | null = null;
    try {
      intruderPhoto = await captureIntruderPhoto();
    } catch (e) {
      console.log('Could not capture photo');
    }

    // Send email alert with photo on every failed attempt
    if (userId && userEmail) {
      try {
        let location = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            location = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
          }
        } catch (e) {
          console.log('Location unavailable');
        }

        await axios.post(`${API_URL}/api/failed-attempt/alert`, {
          user_id: userId,
          email: userEmail,
          latitude: location?.latitude,
          longitude: location?.longitude,
          intruder_photo: intruderPhoto,
        });
      } catch (e) {
        console.error('Failed to send alert:', e);
      }
    }

    if (newAttempts >= 3) {
      setIsLocked(true);
      setLockTimer(30); // 30 second lockout
      setAttempts(0);
      Alert.alert(
        'Too Many Attempts',
        'You have been locked out for 30 seconds. A security alert with photo has been sent to the account owner.'
      );
    } else {
      Alert.alert('Incorrect PIN', `${3 - newAttempts} attempts remaining. Photo captured.`);
    }
  };

  const logOfficerAccess = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const officerName = await AsyncStorage.getItem('current_officer_name');
      const badgeNumber = await AsyncStorage.getItem('current_officer_badge');
      const locationStr = await AsyncStorage.getItem('current_location');
      const location = locationStr ? JSON.parse(locationStr) : null;

      if (userId && officerName && badgeNumber) {
        await axios.post(`${API_URL}/api/access-log`, {
          user_id: userId,
          officer_name: officerName,
          badge_number: badgeNumber,
          latitude: location?.latitude,
          longitude: location?.longitude,
          documents_viewed: [],
        });
      }
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  };

  const handleNumberPress = (num: string) => {
    if (isLocked) return;
    if (pin.length < 8) {
      setPin(pin + num);
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin(pin.slice(0, -1));
  };

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keyEmpty} />;
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.keyButton}
                    onPress={handleBackspace}
                    disabled={isLocked}
                  >
                    <Ionicons name="backspace" size={28} color={isLocked ? '#444' : '#fff'} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.keyButton}
                  onPress={() => handleNumberPress(key)}
                  disabled={isLocked}
                >
                  <Text style={[styles.keyText, isLocked && styles.keyTextDisabled]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hidden camera for capturing intruder photos */}
      {showCamera && (
        <View style={styles.hiddenCamera}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-open" size={50} color="#007AFF" />
        </View>
        <Text style={styles.title}>Enter PIN to Exit</Text>
        <Text style={styles.subtitle}>Secure mode will be deactivated</Text>
      </View>

      {/* Security indicator */}
      <View style={styles.securityBadge}>
        <Ionicons name="camera" size={14} color="#FF9500" />
        <Text style={styles.securityText}>Security camera active</Text>
      </View>

      {isLocked && (
        <View style={styles.lockoutBanner}>
          <Ionicons name="time" size={20} color="#FF3B30" />
          <Text style={styles.lockoutText}>Locked for {lockTimer} seconds</Text>
        </View>
      )}

      <View style={styles.pinDisplay}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              i < pin.length && styles.pinDotFilled,
              isLocked && styles.pinDotLocked,
            ]}
          />
        ))}
      </View>

      {renderKeypad()}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (isLoading || isLocked || pin.length < 4) && styles.submitButtonDisabled,
        ]}
        onPress={handlePinSubmit}
        disabled={isLoading || isLocked || pin.length < 4}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Unlock</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Return to Documents</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 20,
    justifyContent: 'center',
  },
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  camera: {
    width: 100,
    height: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  securityText: {
    color: '#FF9500',
    fontSize: 12,
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  lockoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pinDotLocked: {
    borderColor: '#FF3B30',
  },
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#fff',
  },
  keyTextDisabled: {
    color: '#444',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
