# Secure Folder App - Product Requirements Document

## Overview
A secure folder mobile application primarily for Android that allows users to securely present electronic documentation (ID, vehicle registration, etc.) to police officers during encounters.

## Core Requirements

### 1. Secure Mode
- **Status**: IMPLEMENTED
- Locked-down mode that displays documents to officers
- Officer must enter name and badge number before viewing documents
- Back button is blocked in secure mode
- Exit requires PIN verification via prominent "Exit Secure Mode" button

### 2. Screen Pinning (Kiosk Mode)
- **Status**: IMPLEMENTED (Mandatory Setup Flow)
- When entering Secure Mode on Android/iOS, app checks if pinning has been confirmed
- Shows mandatory modal with warning icon requiring user to enable screen pinning
- Modal includes:
  - Step-by-step instructions
  - "Open Settings" button to go directly to security settings
  - "I've Enabled Screen Pinning" confirmation button
  - "Cancel & Go Back" option
- Note: Programmatic screen pinning requires device admin privileges which is beyond standard app capabilities

### 3. Exit Secure Mode
- **Status**: IMPLEMENTED
- Prominent red "Exit Secure Mode" button visible at all times (including during loading)
- Opens PIN verification modal
- On correct PIN: logs officer access, clears session data, returns to home

### 4. Officer Login
- **Status**: IMPLEMENTED
- Officers must enter name and badge number
- No cancel button - credentials are mandatory
- All access is logged with timestamp and location

### 5. Access Logging
- **Status**: IMPLEMENTED
- Logs officer name, badge number, timestamp, location
- Export to PDF functionality (TODO)

### 6. Document Storage
- **Status**: IMPLEMENTED
- Categories: ID/Driver's License, Birth Certificate, Vehicle Registration, Gun Registration, Disability Paperwork, Permits, Job Badge, Immigration, Social Security, Insurance
- Upload via camera, gallery, or file picker
- Category-based folder view

### 7. Security Alerts
- **Status**: IMPLEMENTED
- Photo capture on failed PIN attempt using front camera
- Email alert with photo, location, and timestamp via SendGrid

## Technical Architecture

### Frontend (React Native/Expo)
- Expo Router for navigation
- AsyncStorage for local session management
- expo-camera for intruder photo capture
- Axios for API calls

### Backend (FastAPI)
- MongoDB for data storage
- SendGrid for email alerts
- PIN hashing with SHA-256

### Key Endpoints
- POST /api/users - Create user
- POST /api/users/verify-pin - Verify PIN
- POST /api/documents - Add document
- GET /api/documents/{user_id} - Get documents
- DELETE /api/documents/{doc_id} - Delete document
- POST /api/access-log - Log officer access
- POST /api/failed-attempt/alert - Send intruder alert

## Known Limitations

### Web Preview
- Wake Lock API errors on web - this is expected from Expo's internal dev tools
- Screen pinning features designed for Android only
- The app is designed for Android devices via Expo Go
- Web preview may show loading states differently than native

### Screen Pinning
- Android's screen pinning cannot be activated programmatically without device admin privileges
- User must manually enable it via Settings > Security > Screen Pinning
- App provides guided instructions and settings link
- Pinning confirmation is required before each Secure Mode session

## Completed Work (Feb 2026)
1. User Setup and Authentication flow (email/PIN)
2. Category-based document viewing
3. Document upload with camera/gallery/file options
4. Secure Mode with officer credentials
5. **Exit Secure Mode with PIN verification - PROMINENT BUTTON**
6. **Screen Pinning mandatory setup flow with warning modal**
7. Intruder photo capture on failed PIN
8. Email alerts via SendGrid

## TODO / Future Tasks
1. Export Access History to PDF
2. Stripe Payments Integration (user postponed)
3. Background Voice Recorder (premium feature)
4. Downloadable Recordings (premium feature)
5. Document scanner with cropping (partially implemented)

## File Structure
```
/app
├── backend
│   ├── .env
│   ├── requirements.txt
│   └── server.py
└── frontend
    ├── .env
    ├── app.json
    ├── package.json
    └── app
        ├── _layout.tsx
        ├── access-history.tsx
        ├── add-document.tsx
        ├── documents.tsx
        ├── home.tsx - Contains Screen Pinning setup button (Android only)
        ├── index.tsx
        ├── officer-login.tsx
        ├── secure-mode.tsx - Contains Exit button + PIN modal + Pinning Required modal
        ├── settings.tsx
        ├── setup.tsx
        └── unlock.tsx
```

## Test Credentials
- No pre-configured credentials required
- Users create their own email/PIN during setup

## Key Changes in This Session
1. Added mandatory "Screen Pinning Required" modal when entering Secure Mode
2. Added prominent "Exit Secure Mode" button that shows even during loading
3. Exit button triggers PIN verification modal
4. Correct PIN logs access and returns to home
5. Removed expo-keep-awake dependency (was causing web errors)
