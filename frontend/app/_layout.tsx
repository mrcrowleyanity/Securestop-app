import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for app state changes to handle background/foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - verify session is still valid
      await verifySession();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      console.log('Auth check - user_id:', userId ? 'exists' : 'not found');
      setIsAuthenticated(!!userId);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifySession = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId !== null) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Session verification error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
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
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="permissions" 
          options={{ 
            title: 'Permissions', 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="setup" 
          options={{ 
            title: 'Setup', 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="home" 
          options={{ 
            title: 'Secure Folder', 
            headerShown: false,
            // Prevent going back to setup/login from home
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="secure-mode" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
            // Prevent any navigation out except through the app
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="officer-login" 
          options={{ 
            title: 'Officer Verification', 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="documents" 
          options={{ 
            title: 'My Documents',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="add-document" 
          options={{ 
            title: 'Add Document',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="access-history" 
          options={{ 
            title: 'Access History',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="unlock" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
          }} 
        />
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
