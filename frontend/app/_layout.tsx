import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,       // All screens use their own custom header
        contentStyle: { backgroundColor: '#0f0f1a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="home" />
      <Stack.Screen name="secure-mode" />
      <Stack.Screen name="officer-login" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="add-document" />
      {/* FIX: register view-document so router.push('/view-document') resolves */}
      <Stack.Screen name="view-document" />
      <Stack.Screen name="access-history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="unlock" />
    </Stack>
  );
}
