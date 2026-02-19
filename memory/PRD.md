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

### 5. Permissions (Requested on Startup)
| Permission | Type | Description |
|------------|------|-------------|
| Location | Required | Records location during police stops |
| Storage | Required | Saves documents and photos locally |
| Camera | Premium | Document scanning, cop photos |
| Microphone | Premium | Audio recording during encounters |
| Contacts | Premium | Emergency contacts access |
| Screen Pinning | Recommended | Full app lockdown |

### 6. Premium Features
- **Audio Recording**: Record interactions during police stops
- **Cop Photo**: Take photo of officer after badge entry
- **Emergency Contacts**: Quick call/text to attorney or family
- **SMS Alerts**: Auto-text location to contacts when stopped

## Technical Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54+ with Expo Router
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

### Utilities
- **Permissions Manager** (`/utils/permissions.ts`): Centralized permission handling
- **Emergency Contacts** (`/utils/emergencyContacts.ts`): Contact management and quick actions

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
- [x] Android manifest with all permissions
- [x] EAS Build configuration
- [x] **Permissions setup screen on first launch**
- [x] **Permissions manager utility**
- [x] **Emergency contacts utility**
- [x] TypeScript compilation clean

### In Progress 🔄
- [ ] Test development build on Samsung S24
- [ ] Camera document scanner integration

### Pending 📋
- [ ] PDF export for access history
- [ ] Email alerts with SendGrid
- [ ] Cop photo capture on officer login (premium)
- [ ] Audio recording during secure mode (premium)
- [ ] Emergency contacts UI screen
- [ ] Stripe payments for premium

## Key Files

```
/app/frontend/
├── app/
│   ├── permissions.tsx      # Permissions setup screen (NEW)
│   ├── secure-mode.tsx      # Main secure mode with pinning
│   ├── officer-login.tsx    # Officer credential entry
│   ├── home.tsx            # Home screen with menu
│   ├── setup.tsx           # User registration/login
│   ├── index.tsx           # Splash + permission check
│   └── _layout.tsx         # Root navigation
├── utils/
│   ├── permissions.ts       # Permission manager (NEW)
│   └── emergencyContacts.ts # Emergency contacts (NEW)
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

## App Flow

```
1. First Launch → Permissions Setup Screen
   ↓
2. Request Location, Storage, Camera, Mic, Contacts
   ↓
3. Guide user to enable Screen Pinning
   ↓
4. Registration/Login → Home Screen
   ↓
5. Activate Secure Mode → Officer Login
   ↓
6. Enter Officer Name/Badge → View Documents
   ↓
7. Exit requires user PIN
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
- `POST /api/failed-attempt/alert` - Send security alert

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
