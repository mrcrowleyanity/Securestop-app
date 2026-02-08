# Secure Folder - Development Build Guide

## Overview
This app requires a **development build** for full functionality, especially:
- Native screen pinning (Lock Task Mode)
- Background audio recording
- Full camera/location access

## Current Status
The app currently runs in Expo Go with limited functionality:
- ✅ Basic navigation and UI
- ✅ Document upload and viewing
- ✅ Officer authentication flow
- ⚠️ Screen pinning (manual setup required in Expo Go)
- ⚠️ Background recording (not available in Expo Go)

## Building for Samsung S24

### Prerequisites
1. Node.js 18+
2. EAS CLI: `npm install -g eas-cli`
3. Expo account (free)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Initialize EAS Build
```bash
cd /app/frontend
eas build:configure
```

### Step 3: Create Development Build
```bash
# For Android (Samsung S24)
eas build --profile development --platform android

# This will:
# - Generate native android/ folder with native modules
# - Build an APK/AAB for your device
# - Include screen pinning native module
```

### Step 4: Install on Device
After build completes:
1. Download the APK from EAS dashboard
2. Transfer to Samsung S24
3. Enable "Install from unknown sources" if needed
4. Install the APK

### Step 5: Run Development Server
```bash
npx expo start --dev-client
```

## Native Screen Pinning (Lock Task Mode)

### How It Works
The app uses Android's Lock Task Mode to pin the screen:
- When entering Secure Mode, the app calls `startLockTask()`
- The user cannot leave the app without entering their PIN
- On exit, the app calls `stopLockTask()`

### Android Configuration
The development build includes these AndroidManifest.xml changes:
```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask"
    android:lockTaskMode="if_whitelisted">
</activity>
```

### Samsung S24 Specific
On Samsung devices, you may also need to:
1. Enable Screen Pinning in Settings > Security > Other settings > Pin windows
2. Enable "Ask for PIN before unpinning"

## Permissions Included
- Camera (document scanning, intruder photos)
- Microphone (audio recording)
- Location (access logging)
- Storage (document storage)
- Contacts (emergency contacts)
- Foreground Service (background operations)
- Wake Lock (keep screen on)

## Troubleshooting

### Screen Pinning Not Working
1. Check if running development build (not Expo Go)
2. Verify Lock Task Mode permissions in device settings
3. Enable Screen Pinning manually in Settings

### Session Not Persisting
1. Check AsyncStorage is working
2. Verify app has storage permissions
3. Clear app cache and re-login

### Build Errors
```bash
# Clean build
npx expo prebuild --clean
eas build --profile development --platform android --clear-cache
```

## Project Structure
```
/app/frontend
├── app/                    # Screens (Expo Router)
│   ├── secure-mode.tsx     # Main secure mode screen
│   ├── officer-login.tsx   # Officer authentication
│   └── ...
├── modules/
│   └── screen-pinning/     # Native module interface
├── app.json               # Expo config with permissions
└── eas.json               # EAS Build config (create if needed)
```

## EAS Build Configuration
Create `/app/frontend/eas.json`:
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Support
For issues with screen pinning or native features, ensure you:
1. Have the development build installed
2. Are not running in Expo Go
3. Have granted all required permissions
