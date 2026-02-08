# Secure Folder App - Product Requirements Document

## Overview
A secure folder mobile application primarily for Android that allows users to securely present electronic documentation (ID, vehicle registration, etc.) to police officers during encounters.

## Core Requirements

### 1. Secure Mode
- **Status**: IMPLEMENTED
- Locked-down mode that displays documents to officers
- Officer must enter name and badge number before viewing documents
- Back button is blocked in secure mode
- Exit requires PIN verification

### 2. Screen Pinning (Kiosk Mode)
- **Status**: IMPLEMENTED (Manual Setup Required)
- Added "Setup Screen Pinning" button on Home screen (visible on Android only)
- Modal with step-by-step instructions for enabling Android's native screen pinning
- Button to open device Settings directly
- Note: Programmatic screen pinning requires device admin privileges which is beyond standard app capabilities

### 3. Officer Login
- **Status**: IMPLEMENTED
- Officers must enter name and badge number
- No cancel button - credentials are mandatory
- All access is logged with timestamp and location

### 4. Access Logging
- **Status**: IMPLEMENTED
- Logs officer name, badge number, timestamp, location
- Export to PDF functionality (TODO)

### 5. Document Storage
- **Status**: IMPLEMENTED
- Categories: ID/Driver's License, Birth Certificate, Vehicle Registration, Gun Registration, Disability Paperwork, Permits, Job Badge, Immigration, Social Security, Insurance
- Upload via camera, gallery, or file picker
- Category-based folder view

### 6. Security Alerts
- **Status**: IMPLEMENTED
- Photo capture on failed PIN attempt using front camera
- Email alert with photo, location, and timestamp via SendGrid

### 7. Exit Secure Mode
- **Status**: IMPLEMENTED
- Exit button in Secure Mode screen
- PIN verification modal
- On correct PIN, navigates back to home

## Technical Architecture

### Frontend (React Native/Expo)
- Expo Router for navigation
- AsyncStorage for local session management
- expo-camera for intruder photo capture
- expo-keep-awake for keeping screen on (Android/iOS only)
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
- Wake Lock API errors on web - this is expected
- Screen pinning features not available on web
- The app is designed for Android devices via Expo Go

### Screen Pinning
- Android's screen pinning cannot be activated programmatically without device admin privileges
- User must manually enable it via Settings > Security > Screen Pinning
- App provides guided instructions and settings link

## Completed Work (Dec 2025)
1. User Setup and Authentication flow (email/PIN)
2. Category-based document viewing
3. Document upload with camera/gallery/file options
4. Secure Mode with officer credentials
5. Exit Secure Mode with PIN verification
6. Screen Pinning setup guide with Settings link
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
        ├── home.tsx - Contains Screen Pinning setup button and modal
        ├── index.tsx
        ├── officer-login.tsx
        ├── secure-mode.tsx - Contains Exit button with PIN verification
        ├── settings.tsx
        ├── setup.tsx
        └── unlock.tsx
```

## Test Credentials
- No pre-configured credentials required
- Users create their own email/PIN during setup
