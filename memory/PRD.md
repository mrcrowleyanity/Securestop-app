# Secure Folder App - Product Requirements Document

## Overview
A secure folder mobile application for Android that allows users to securely present electronic documentation (ID, vehicle registration, etc.) to police officers during encounters.

## Core Requirements

### 1. Secure Mode
- **Screen Pinning**: Lock the app to the screen using Android's `startLockTask()` (kiosk mode)
- **PIN Exit**: Require device owner's PIN to exit secure mode
- **Back Button Block**: Prevent all attempts to leave the app during secure mode

### 2. Officer Authentication
- Officers must enter name and badge number before viewing documents
- All access is logged with timestamp and location
- Access history exportable to PDF

### 3. Document Management
- Upload documents via camera scan or gallery
- Categorize: ID, vehicle registration, gun registration, birth certificate, disability, permits, job badge, immigration, social security, insurance
- View and delete documents

### 4. Security Features
- User PIN for app setup and secure mode exit
- Failed PIN attempt logging
- Email alerts with intruder photo on failed attempts (premium)
- Location logging for all access events

### 5. Permissions Required
- Camera (document scanning, intruder photos)
- Microphone (audio recording - premium)
- Location (access logging)
- Storage (document storage)

## Technical Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 53+ with Expo Router
- **Build**: EAS Build for development builds (required for native modules)
- **Target Device**: Samsung S24 (Android)

### Backend (FastAPI)
- **Database**: MongoDB
- **APIs**: User management, documents, access logs, failed attempts

### Native Modules
- **ScreenPinningModule**: Android native module for Lock Task Mode
  - `startLockTask()`: Pin app to screen
  - `stopLockTask()`: Unpin on PIN verification
  - `isInLockTaskMode()`: Check pinning status

## Implementation Status

### Completed ✅
- [x] User registration and login with PIN
- [x] Document upload (gallery)
- [x] Document viewing by category
- [x] Document deletion
- [x] Officer login screen with name/badge
- [x] Secure mode UI with exit button
- [x] Back button blocking in secure mode
- [x] PIN verification to exit secure mode
- [x] Access logging API
- [x] Native ScreenPinning module (Kotlin)
- [x] Android manifest with permissions
- [x] EAS Build configuration
- [x] TypeScript compilation clean

### In Progress 🔄
- [ ] Test development build on Samsung S24
- [ ] Camera document scanner integration

### Pending 📋
- [ ] PDF export for access history
- [ ] Email alerts with SendGrid
- [ ] Premium features (background recording)

## Key Files

```
/app/frontend/
├── app/
│   ├── secure-mode.tsx      # Main secure mode with pinning
│   ├── officer-login.tsx    # Officer credential entry
│   ├── home.tsx            # Home screen with menu
│   ├── setup.tsx           # User registration/login
│   └── _layout.tsx         # Root navigation
├── modules/
│   └── screen-pinning/index.ts  # Native module interface
├── android/
│   └── app/src/main/java/com/securestop/
│       ├── screenpinning/
│       │   ├── ScreenPinningModule.kt
│       │   └── ScreenPinningPackage.kt
│       ├── MainActivity.kt
│       └── MainApplication.kt
├── app.json                # Expo config with permissions
└── eas.json               # EAS build profiles
```

## Build Instructions

### Development Build (for Samsung S24)
```bash
cd /app/frontend
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

### Running Development Server
```bash
npx expo start --dev-client
```

## API Endpoints

- `POST /api/users` - Create user
- `POST /api/users/verify-pin` - Verify PIN
- `GET /api/users/by-email/{email}` - Get user by email
- `POST /api/documents` - Upload document
- `GET /api/documents/{user_id}` - Get user documents
- `DELETE /api/documents/{doc_id}` - Delete document
- `POST /api/access-log` - Log officer access
- `GET /api/access-log/{user_id}` - Get access history

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "pin_hash": "string",
  "created_at": "datetime",
  "is_premium": "boolean"
}
```

### documents
```json
{
  "id": "uuid",
  "user_id": "string",
  "doc_type": "string",
  "name": "string",
  "image_base64": "string",
  "created_at": "datetime"
}
```

### access_logs
```json
{
  "id": "uuid",
  "user_id": "string",
  "officer_name": "string",
  "badge_number": "string",
  "timestamp": "datetime",
  "latitude": "float",
  "longitude": "float"
}
```

---
Last updated: 2026-02-14
