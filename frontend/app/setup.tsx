import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Setup() {
  const [mode, setMode] = useState<'choice' | 'register' | 'login'>('choice');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ============ REGISTER FLOW ============
  const handleEmailSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handlePinSubmit = () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      Alert.alert('Error', 'PIN must contain only numbers');
      return;
    }
    setStep(3);
  };

  const handleConfirmPin = async () => {
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/users`, {
        email: email.trim().toLowerCase(),
        pin: pin,
      });

      const userId = response.data.id;
      await AsyncStorage.setItem('user_id', userId);
      await AsyncStorage.setItem('user_email', email.trim().toLowerCase());

      Alert.alert('Success', 'Your Secure Folder is ready!', [
        { text: 'OK', onPress: () => router.replace('/home') },
      ]);
    } catch (error: any) {
      console.error('Setup error:', error);
      if (error.response?.data?.detail === 'User already exists') {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => {
                setMode('login');
                setStep(1);
                setPin('');
                setConfirmPin('');
              }
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============ LOGIN FLOW ============
  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    setIsLoading(true);
    try {
      // First get user by email
      const usersResponse = await axios.get(`${API_URL}/api/users/by-email/${encodeURIComponent(email.trim().toLowerCase())}`);
      const userId = usersResponse.data.id;

      // Verify PIN
      const verifyResponse = await axios.post(`${API_URL}/api/users/verify-pin`, {
        user_id: userId,
        pin: pin,
      });

      if (verifyResponse.data.success) {
        await AsyncStorage.setItem('user_id', userId);
        await AsyncStorage.setItem('user_email', email.trim().toLowerCase());
        router.replace('/home');
      } else {
        Alert.alert('Error', 'Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 404) {
        Alert.alert('Error', 'No account found with this email. Please register first.');
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============ CHOICE SCREEN ============
  const renderChoice = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Welcome</Text>
      <Text style={styles.stepDescription}>
        Secure your documents for police encounters
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => setMode('register')}
      >
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={styles.buttonText}>Create New Account</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={() => setMode('login')}
      >
        <Ionicons name="log-in" size={20} color="#007AFF" />
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ LOGIN SCREEN ============
  const renderLogin = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-open" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Sign In</Text>
      <Text style={styles.stepDescription}>
        Enter your email and PIN to access your secure folder
      </Text>

      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your PIN"
        placeholderTextColor="#666"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="log-in" size={20} color="#fff" />
            <Text style={styles.buttonText}>Sign In</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          setMode('choice');
          setEmail('');
          setPin('');
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ REGISTER SCREENS ============
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Enter Your Email</Text>
      <Text style={styles.stepDescription}>
        This will be used for security alerts when someone tries to access your folder
      </Text>
      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.button} onPress={handleEmailSubmit}>
        <Text style={styles.buttonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          setMode('choice');
          setEmail('');
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Create Your PIN</Text>
      <Text style={styles.stepDescription}>
        This PIN will be used to exit secure mode. Make it memorable but secure.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 4+ digit PIN"
        placeholderTextColor="#666"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      <TouchableOpacity style={styles.button} onPress={handlePinSubmit}>
        <Text style={styles.buttonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Confirm Your PIN</Text>
      <Text style={styles.stepDescription}>
        Enter your PIN again to confirm
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Confirm PIN"
        placeholderTextColor="#666"
        value={confirmPin}
        onChangeText={setConfirmPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleConfirmPin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>Complete Setup</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>Secure Folder</Text>
        </View>

        {mode === 'register' && (
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        )}

        {mode === 'choice' && renderChoice()}
        {mode === 'login' && renderLogin()}
        {mode === 'register' && step === 1 && renderStep1()}
        {mode === 'register' && step === 2 && renderStep2()}
        {mode === 'register' && step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
