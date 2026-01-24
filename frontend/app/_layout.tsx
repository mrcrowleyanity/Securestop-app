import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      setIsSetup(!!userId);
    } catch (error) {
      console.error('Error checking setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0f0f1a' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'Setup', headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Secure Folder', headerShown: false }} />
        <Stack.Screen name="secure-mode" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="officer-login" options={{ title: 'Officer Verification', headerShown: false }} />
        <Stack.Screen name="documents" options={{ title: 'My Documents' }} />
        <Stack.Screen name="add-document" options={{ title: 'Add Document' }} />
        <Stack.Screen name="access-history" options={{ title: 'Access History' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="unlock" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
});
