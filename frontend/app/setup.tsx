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
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { initVault } from '../utils/secureDocumentStorage';

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
      const userId = `local_${Date.now()}`;

      // Store all sensitive data in secure encrypted storage
      await SecureStore.setItemAsync('user_id', userId);
      await SecureStore.setItemAsync('user_email', email.trim().toLowerCase());
      await SecureStore.setItemAsync('user_pin', pin);
      await initVault(); // Eagerly create the secure storage folder

      router.replace('/home');
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to save account details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ LOGIN FLOW ============
  const handleLogin = async () => {
    if (!email.trim() || !pin) {
      Alert.alert('Error', 'Please enter both email and PIN');
      return;
    }
    setIsLoading(true);
    try {
      // Read credentials from secure storage
      const localEmail = await SecureStore.getItemAsync('user_email');
      const localPin = await SecureStore.getItemAsync('user_pin');
      if (!localEmail || !localPin) {
        Alert.alert(
          'No Account Found',
          'No account exists on this device. Would you like to create one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Account', onPress: () => { setMode('register'); setStep(1); } }
          ]
        );
      } else if (localEmail === email.trim().toLowerCase() && localPin === pin) {
        await initVault();
        router.replace('/home');
      } else {
        Alert.alert('Error', 'Incorrect email or PIN. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ UI COMPONENTS ============
  const renderChoice = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={60} color="#007AFF" />
      </View>
      <Text style={styles.stepTitle}>Welcome</Text>
      <Text style={styles.stepDescription}>
        Secure your documents for police encounters. All data is stored locally on this device.
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

  const renderLogin = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
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
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode('choice')}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'choice' && renderChoice()}
        {mode === 'login' && renderLogin()}
        {mode === 'register' && step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Enter Your Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleEmailSubmit}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
        {mode === 'register' && step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create Your PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 4+ digit PIN"
              placeholderTextColor="#666"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handlePinSubmit}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
        {mode === 'register' && step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Your PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              placeholderTextColor="#666"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleConfirmPin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Setup</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 60, alignItems: 'center' },
  stepContainer: { width: '100%', alignItems: 'center' },
  iconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  stepDescription: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 30 },
  input: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, fontSize: 18, color: '#fff', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  button: { flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 12 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#007AFF' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondaryButtonText: { color: '#007AFF' },
  backButtonText: { color: '#007AFF', fontSize: 16, marginTop: 20 },
});
