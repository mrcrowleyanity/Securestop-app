import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  BackHandler,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as KeepAwake from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Document {
  id: string;
  doc_type: string;
  name: string;
  image_base64: string;
}

export default function SecureMode() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [viewedDocs, setViewedDocs] = useState<string[]>([]);
  const [showRestrictedAlert, setShowRestrictedAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPinningHelp, setShowPinningHelp] = useState(false);

  useEffect(() => {
    initSecureMode();
    
    return () => {
      try {
        KeepAwake.deactivateKeepAwake();
      } catch (error) {
        // Ignore on web
      }
      try {
        StatusBar.setHidden(false);
      } catch (error) {
        // Ignore on web
      }
    };
  }, []);

  const initSecureMode = async () => {
    // Keep screen awake (only works on native, not web)
    if (Platform.OS !== 'web') {
      try {
        await KeepAwake.activateKeepAwakeAsync();
      } catch (error) {
        console.log('KeepAwake not available:', error);
      }
    }
    
    // Lock orientation (only works on native, not web)
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.log('Screen orientation lock not available:', error);
      }
    }
    
    // Hide status bar for more immersive lock
    if (Platform.OS !== 'web') {
      try {
        StatusBar.setHidden(true);
      } catch (error) {
        console.log('StatusBar not available:', error);
      }
    }
    
    // Show pinning help on first load
    const hasSeenPinningHelp = await AsyncStorage.getItem('has_seen_pinning_help');
    if (!hasSeenPinningHelp && Platform.OS === 'android') {
      setShowPinningHelp(true);
      await AsyncStorage.setItem('has_seen_pinning_help', 'true');
    }
    
    // Load data
    await loadData();
  };

  // Block ALL back button attempts
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        showRestrictedMessage();
        return true; // ALWAYS prevent back
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const name = await AsyncStorage.getItem('current_officer_name');
      const badge = await AsyncStorage.getItem('current_officer_badge');

      if (name) setOfficerName(name);
      if (badge) setBadgeNumber(badge);

      if (userId) {
        const response = await axios.get(`${API_URL}/api/documents/${userId}`);
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showRestrictedMessage = () => {
    setShowRestrictedAlert(true);
    setTimeout(() => setShowRestrictedAlert(false), 2000);
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc);
    if (!viewedDocs.includes(doc.id)) {
      setViewedDocs([...viewedDocs, doc.id]);
    }
  };

  const handleExitSecureMode = () => {
    setShowExitModal(true);
    setExitPin('');
    setPinError('');
  };

  const verifyPinAndExit = async () => {
    if (exitPin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    setIsVerifying(true);
    setPinError('');

    try {
      const userId = await AsyncStorage.getItem('user_id');
      const response = await axios.post(`${API_URL}/api/users/verify-pin`, {
        user_id: userId,
        pin: exitPin,
      });

      if (response.data.success) {
        // Log the access before exiting
        await logOfficerAccess();
        
        // Clear secure mode data
        await AsyncStorage.removeItem('current_officer_name');
        await AsyncStorage.removeItem('current_officer_badge');
        await AsyncStorage.removeItem('current_location');
        await AsyncStorage.removeItem('secure_mode_active');
        
        // Restore status bar
        StatusBar.setHidden(false);
        
        // Navigate to home
        setShowExitModal(false);
        router.replace('/home');
      } else {
        setPinError('Incorrect PIN. Try again.');
        setExitPin('');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setPinError('Failed to verify PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const logOfficerAccess = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const locationStr = await AsyncStorage.getItem('current_location');
      const location = locationStr ? JSON.parse(locationStr) : null;

      if (userId && officerName && badgeNumber) {
        await axios.post(`${API_URL}/api/access-log`, {
          user_id: userId,
          officer_name: officerName,
          badge_number: badgeNumber,
          latitude: location?.latitude,
          longitude: location?.longitude,
          documents_viewed: viewedDocs,
        });
      }
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  };

  const openAndroidPinSettings = async () => {
    // Try to open Android security settings for screen pinning
    if (Platform.OS === 'android') {
      try {
        // Try to open the security settings directly
        const securitySettingsUrl = 'android.settings.SECURITY_SETTINGS';
        const canOpen = await Linking.canOpenURL(`intent://#Intent;action=${securitySettingsUrl};end`);
        
        if (canOpen) {
          await Linking.openURL(`intent://#Intent;action=${securitySettingsUrl};end`);
        } else {
          // Fallback to general settings
          await Linking.openSettings();
        }
      } catch (error) {
        // Fallback to general settings
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      id: 'ID / License',
      vehicle_registration: 'Vehicle Registration',
      gun_registration: 'Gun Registration',
      birth_certificate: 'Birth Certificate',
      disability: 'Disability Paperwork',
      permit: 'Permits',
      job_badge: 'Job Badge',
      immigration: 'Immigration',
      social_security: 'Social Security',
      insurance: 'Insurance',
    };
    return labels[type] || type;
  };

  const getDocTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      id: 'card',
      vehicle_registration: 'car',
      gun_registration: 'shield-checkmark',
      birth_certificate: 'document',
      disability: 'medical',
      permit: 'document-text',
      job_badge: 'briefcase',
      immigration: 'airplane',
      social_security: 'shield',
      insurance: 'umbrella',
    };
    return icons[type] || 'document';
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.doc_type]) {
      acc[doc.doc_type] = [];
    }
    acc[doc.doc_type].push(doc);
    return acc;
  }, {} as { [key: string]: Document[] });

  // Screen Pinning Help Modal
  const renderPinningHelpModal = () => (
    <Modal
      visible={showPinningHelp}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPinningHelp(false)}
    >
      <View style={styles.helpModalOverlay}>
        <View style={styles.helpModalContent}>
          <Ionicons name="phone-portrait" size={48} color="#007AFF" />
          <Text style={styles.helpModalTitle}>Enable Screen Pinning</Text>
          <Text style={styles.helpModalText}>
            For maximum security, enable Android's Screen Pinning feature:
          </Text>
          <View style={styles.helpSteps}>
            <Text style={styles.helpStep}>1. Go to Settings → Security</Text>
            <Text style={styles.helpStep}>2. Find "Screen Pinning" or "App Pinning"</Text>
            <Text style={styles.helpStep}>3. Turn it ON</Text>
            <Text style={styles.helpStep}>4. Open Recent Apps and tap the pin icon</Text>
          </View>
          <Text style={styles.helpNote}>
            This will prevent anyone from leaving this app without your PIN!
          </Text>
          <View style={styles.helpButtons}>
            <TouchableOpacity
              style={styles.helpOpenSettings}
              onPress={openAndroidPinSettings}
            >
              <Ionicons name="settings" size={18} color="#fff" />
              <Text style={styles.helpOpenSettingsText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpDismiss}
              onPress={() => setShowPinningHelp(false)}
            >
              <Text style={styles.helpDismissText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Exit PIN Modal
  const renderExitModal = () => (
    <Modal
      visible={showExitModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowExitModal(false)}
    >
      <View style={styles.exitModalOverlay}>
        <View style={styles.exitModalContent}>
          <View style={styles.exitModalHeader}>
            <Ionicons name="lock-open" size={40} color="#007AFF" />
            <Text style={styles.exitModalTitle}>Exit Secure Mode</Text>
            <Text style={styles.exitModalSubtitle}>Enter device owner's PIN</Text>
          </View>

          {pinError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{pinError}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.pinInput}
            placeholder="Enter PIN"
            placeholderTextColor="#666"
            value={exitPin}
            onChangeText={setExitPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          <View style={styles.exitModalButtons}>
            <TouchableOpacity
              style={styles.cancelExitBtn}
              onPress={() => setShowExitModal(false)}
              disabled={isVerifying}
            >
              <Text style={styles.cancelExitBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmExitBtn, isVerifying && styles.btnDisabled]}
              onPress={verifyPinAndExit}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmExitBtnText}>Unlock & Exit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <View style={styles.lockedHeader}>
          <Ionicons name="lock-closed" size={16} color="#FF3B30" />
          <Text style={styles.lockedHeaderText}>SECURE MODE ACTIVE</Text>
        </View>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading secure documents...</Text>
      </View>
    );
  }

  // Document full-screen view
  if (selectedDoc) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedDoc.name}</Text>
          <TouchableOpacity onPress={handleExitSecureMode} style={styles.exitButton}>
            <Ionicons name="lock-open" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Document View */}
        <ScrollView style={styles.docViewContainer} contentContainerStyle={styles.docViewContent}>
          <Image
            source={{ uri: selectedDoc.image_base64 }}
            style={styles.documentImage}
            resizeMode="contain"
          />
        </ScrollView>

        {/* Restricted Alert */}
        {showRestrictedAlert && (
          <View style={styles.restrictedAlert}>
            <Ionicons name="lock-closed" size={24} color="#fff" />
            <Text style={styles.restrictedText}>PIN Required to Exit</Text>
          </View>
        )}

        {renderExitModal()}
      </View>
    );
  }

  // Main secure mode view
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Secure Mode Header */}
      <View style={styles.secureHeader}>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          <Text style={styles.secureBadgeText}>SECURE MODE</Text>
        </View>
        <TouchableOpacity onPress={handleExitSecureMode} style={styles.exitButton}>
          <Ionicons name="lock-open" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Officer Info Card */}
      <View style={styles.officerCard}>
        <View style={styles.officerHeader}>
          <Ionicons name="person-circle" size={40} color="#007AFF" />
          <View style={styles.officerDetails}>
            <Text style={styles.officerName}>{officerName || 'Officer'}</Text>
            <Text style={styles.officerBadge}>Badge #{badgeNumber || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.accessInfo}>
          <Ionicons name="time" size={14} color="#888" />
          <Text style={styles.accessTime}>Access logged at {new Date().toLocaleTimeString()}</Text>
        </View>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Documents</Text>

        {Object.keys(groupedDocs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No documents uploaded</Text>
          </View>
        ) : (
          Object.entries(groupedDocs).map(([type, docs]) => (
            <View key={type} style={styles.docGroup}>
              <View style={styles.docGroupHeader}>
                <Ionicons name={getDocTypeIcon(type) as any} size={18} color="#007AFF" />
                <Text style={styles.docGroupTitle}>{getDocTypeLabel(type)}</Text>
                <Text style={styles.docCount}>{docs.length}</Text>
              </View>
              {docs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.docItem}
                  onPress={() => handleViewDocument(doc)}
                >
                  <View style={styles.docThumbnail}>
                    <Image
                      source={{ uri: doc.image_base64 }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    {viewedDocs.includes(doc.id) && (
                      <View style={styles.viewedBadge}>
                        <Ionicons name="eye" size={12} color="#34C759" />
                        <Text style={styles.viewedText}>Viewed</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        {/* Screen Pinning Tip */}
        {Platform.OS === 'android' && (
          <TouchableOpacity style={styles.pinningTip} onPress={() => setShowPinningHelp(true)}>
            <Ionicons name="phone-portrait" size={18} color="#FF9500" />
            <Text style={styles.pinningTipText}>
              Tap here to learn how to lock this app to the screen
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FF9500" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Exit Secure Mode Button */}
      <TouchableOpacity style={styles.exitSecureModeBtn} onPress={handleExitSecureMode}>
        <Ionicons name="lock-open" size={20} color="#fff" />
        <Text style={styles.exitSecureModeBtnText}>Exit Secure Mode</Text>
      </TouchableOpacity>

      {/* Restricted Alert */}
      {showRestrictedAlert && (
        <View style={styles.restrictedAlert}>
          <Ionicons name="lock-closed" size={24} color="#fff" />
          <Text style={styles.restrictedText}>PIN Required to Exit</Text>
        </View>
      )}

      {/* Bottom Lock Bar */}
      <View style={styles.bottomBar}>
        <Ionicons name="lock-closed" size={16} color="#FF3B30" />
        <Text style={styles.bottomBarText}>Phone locked to Secure Folder</Text>
      </View>

      {renderExitModal()}
      {renderPinningHelpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    gap: 8,
  },
  lockedHeaderText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  secureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  secureBadgeText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  officerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  officerDetails: {
    flex: 1,
  },
  officerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  officerBadge: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  accessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 6,
  },
  accessTime: {
    fontSize: 12,
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  docGroup: {
    marginBottom: 24,
  },
  docGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  docGroupTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  docCount: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    color: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  docThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  docInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  viewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewedText: {
    fontSize: 12,
    color: '#34C759',
  },
  pinningTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  pinningTipText: {
    flex: 1,
    color: '#FF9500',
    fontSize: 13,
  },
  exitSecureModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  exitSecureModeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  docViewContainer: {
    flex: 1,
  },
  docViewContent: {
    padding: 20,
    alignItems: 'center',
  },
  documentImage: {
    width: width - 40,
    height: width * 1.4,
    borderRadius: 12,
  },
  restrictedAlert: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  restrictedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 14,
    gap: 8,
  },
  bottomBarText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  // Exit Modal Styles
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exitModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  exitModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  exitModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  exitModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  pinInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelExitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
  },
  cancelExitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  confirmExitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmExitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Help Modal Styles
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  helpModalText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  helpSteps: {
    width: '100%',
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  helpStep: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  helpNote: {
    fontSize: 13,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 20,
  },
  helpButtons: {
    width: '100%',
    gap: 12,
  },
  helpOpenSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  helpOpenSettingsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpDismiss: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  helpDismissText: {
    color: '#888',
    fontSize: 16,
  },
});
