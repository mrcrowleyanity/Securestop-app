# Secure Folder App - Product Requirements Document

## Overview
A secure folder mobile application primarily for Android (Samsung S24) that allows users to securely present electronic documentation (ID, vehicle registration, etc.) to police officers during encounters.

## Core Requirements

### 1. Secure Mode ✅ IMPLEMENTED
- Locked-down mode that displays documents to officers
- Officer must enter name and badge number before viewing documents
- Back button is blocked in secure mode
- Exit requires PIN verification via prominent "Exit Secure Mode" button

### 2. Screen Pinning (Kiosk Mode) ⚠️ REQUIRES DEV BUILD
- **Current Status**: Manual setup required in Expo Go
- **Target**: Native Lock Task Mode with development build
- Shows mandatory modal requiring user to enable screen pinning
- "Open Settings" button to navigate to security settings
- Instructions for Samsung S24 specific paths

### 3. Exit Secure Mode ✅ IMPLEMENTED  
- Prominent RED "Exit Secure Mode" button - ALWAYS visible
- Opens PIN verification modal
- On correct PIN: logs officer access, clears session data, returns to home
- Button is visible even during document loading

### 4. Officer Login ✅ IMPLEMENTED
- Officers must enter name and badge number
- No cancel button - credentials are mandatory
- All access is logged with timestamp and location
- Session validation on screen load

### 5. Access Logging ✅ IMPLEMENTED
- Logs officer name, badge number, timestamp, location
- Documents viewed tracking
- Export to PDF functionality (TODO)

### 6. Document Storage ✅ IMPLEMENTED
- Categories: ID/Driver's License, Birth Certificate, Vehicle Registration, Gun Registration, Disability Paperwork, Permits, Job Badge, Immigration, Social Security, Insurance
- Upload via camera, gallery, or file picker
- Category-based folder view

### 7. Security Alerts ✅ IMPLEMENTED
- Photo capture on failed PIN attempt using front camera
- Email alert with photo, location, and timestamp via SendGrid

## Technical Architecture

### Frontend (React Native/Expo)
- Expo SDK 54
- Expo Router for navigation
- AsyncStorage for local session management
- SafeAreaView for proper layout
- StatusBar configuration

### Backend (FastAPI)
- MongoDB for data storage
- SendGrid for email alerts
- PIN hashing with SHA-256

### Native Modules (Development Build)
- Screen Pinning module for Lock Task Mode
- Audio recording for evidence capture
- Background location tracking

## Permissions Required
- Camera (document scanning, intruder photos)
- Microphone (audio recording)  
- Location (access logging)
- Storage (document storage)
- Contacts (emergency contacts)
- Foreground Service (background operations)
- Wake Lock (keep screen on)

## Key Fixes Applied (Feb 2026)

### Exit Button Visibility
- Restructured secure-mode.tsx layout
- Exit button now in dedicated `bottomSection` with shadow
- Button visible during loading, document view, and main view
- Added testID for automation testing

### AsyncStorage Authentication
- Added session validation in officer-login.tsx
- Using `multiSet` for atomic operations
- Added error handling for storage failures
- Session verification on app state changes

### Navigation Fixes
- Updated _layout.tsx with proper screen options
- Disabled gestures on secure screens
- Added fade animation for secure-mode transition
- AppState listener for background/foreground handling

### Development Build Setup
- Created eas.json configuration
- Updated app.json with all permissions
- Created screen-pinning module interface
- Added DEV_BUILD_GUIDE.md documentation

## File Structure
```
/app/frontend
├── app/
│   ├── _layout.tsx         - Navigation config
│   ├── index.tsx           - Splash/auth check
│   ├── setup.tsx           - User registration
│   ├── home.tsx            - Main dashboard
│   ├── secure-mode.tsx     - Secure document viewer
│   ├── officer-login.tsx   - Officer authentication
│   ├── documents.tsx       - Document management
│   ├── add-document.tsx    - Document upload
│   ├── access-history.tsx  - Access logs
│   ├── settings.tsx        - User settings
│   └── unlock.tsx          - PIN unlock
├── modules/
│   └── screen-pinning/     - Native module interface
├── app.json                - Expo config
├── eas.json                - EAS Build config
├── package.json            - Dependencies
└── DEV_BUILD_GUIDE.md      - Build instructions
```

## TODO / Remaining Tasks

### P0 - Critical
1. ✅ Exit button visibility - FIXED
2. ✅ AsyncStorage session fixes - FIXED
3. ⏳ Development build for native screen pinning

### P1 - High Priority
1. Export Access History to PDF
2. Native screen pinning implementation
3. Background voice recording

### P2 - Medium Priority  
1. Stripe Payments Integration (postponed)
2. Emergency contact integration
3. Document scanner with cropping

### P3 - Future
1. Background Voice Recorder (premium)
2. Downloadable Recordings (premium)
3. Cloud backup

## Testing on Samsung S24

### Current (Expo Go)
1. Scan QR code in Expo Go
2. Screen pinning requires manual setup in Settings
3. All basic features work

### Target (Development Build)
1. Install development APK
2. Native screen pinning enabled
3. All premium features available

## Build Commands
```bash
# Development build
cd /app/frontend
npx expo prebuild
eas build --profile development --platform android

# Run with dev client
npx expo start --dev-client
```

## Test Credentials
- No pre-configured credentials required
- Users create their own email/PIN during setup
