import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
            title: 'Secure Stop', 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="secure-mode" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
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
