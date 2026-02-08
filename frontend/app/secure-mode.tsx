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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

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
  const [showPinningRequired, setShowPinningRequired] = useState(false);
  const [pinningConfirmed, setPinningConfirmed] = useState(false);

  useEffect(() => {
    initSecureMode();
    
    // Failsafe: If still loading after 5 seconds, force it to false
    const failsafe = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    
    return () => clearTimeout(failsafe);
  }, []);

  const initSecureMode = async () => {
    // Check if user has confirmed pinning setup
    const hasConfirmedPinning = await AsyncStorage.getItem('pinning_confirmed');
    
    // Always show pinning requirement on Android/iOS unless confirmed this session
    if (Platform.OS !== 'web' && !hasConfirmedPinning) {
      setShowPinningRequired(true);
    } else {
      setPinningConfirmed(true);
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
        try {
          const response = await axios.get(`${API_URL}/api/documents/${userId}`, {
            timeout: 10000,
          });
          setDocuments(response.data || []);
        } catch (apiError) {
          console.error('API Error:', apiError);
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setDocuments([]);
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
        await AsyncStorage.removeItem('pinning_confirmed');
        
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

  const openPinningSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        // Try different Android security settings intents
        // Different manufacturers use different settings paths
        const intents = [
          'android.settings.SECURITY_SETTINGS',
          'android.settings.LOCK_SCREEN_SETTINGS', 
        ];
        
        for (const intent of intents) {
          try {
            await Linking.sendIntent(intent);
            return;
          } catch (e) {
            continue;
          }
        }
        // Final fallback
        await Linking.openSettings();
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      await Linking.openSettings();
    }
  };

  const confirmPinningEnabled = async () => {
    // User confirms they've enabled pinning
    await AsyncStorage.setItem('pinning_confirmed', 'true');
    setPinningConfirmed(true);
    setShowPinningRequired(false);
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

  // Pinning Required Modal - MANDATORY
  const renderPinningRequiredModal = () => (
    <Modal
      visible={showPinningRequired}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Cannot dismiss
    >
      <View style={styles.pinningModalOverlay}>
        <ScrollView contentContainerStyle={styles.pinningModalScrollContent}>
          <View style={styles.pinningModalContent}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={60} color="#FF3B30" />
            </View>
            
            <Text style={styles.pinningModalTitle}>Screen Pinning Required</Text>
            
            <Text style={styles.pinningModalText}>
              Screen pinning locks your phone to this app during police encounters.
            </Text>
            
            <View style={styles.pinningSteps}>
              <Text style={styles.pinningStepTitle}>How to find Screen Pinning:</Text>
              <Text style={styles.pinningStep}>1. Go to Settings</Text>
              <Text style={styles.pinningStep}>2. Search "pin" or "screen pin" in search bar</Text>
              <Text style={styles.pinningStepOr}>— OR find manually —</Text>
              <Text style={styles.pinningStepSmall}>• Security → Screen/App Pinning</Text>
              <Text style={styles.pinningStepSmall}>• Security → Advanced → Screen Pinning</Text>
              <Text style={styles.pinningStepSmall}>• Biometrics & Security → Other → Pin windows</Text>
              <Text style={styles.pinningStep}>3. Turn it ON</Text>
              <Text style={styles.pinningStep}>4. Enable "Ask for PIN before unpinning"</Text>
            </View>

            <View style={styles.pinningTip}>
              <Ionicons name="bulb" size={18} color="#FF9500" />
              <Text style={styles.pinningTipText}>
                TIP: Search "pin" in your Settings app to find it quickly!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openSettingsButton}
              onPress={openPinningSettings}
            >
              <Ionicons name="settings" size={22} color="#fff" />
              <Text style={styles.openSettingsButtonText}>Open Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmPinningButton}
              onPress={confirmPinningEnabled}
            >
              <Ionicons name="checkmark-circle" size={22} color="#34C759" />
              <Text style={styles.confirmPinningButtonText}>I've Enabled Screen Pinning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.replace('/home')}
            >
            <Text style={styles.cancelButtonText}>Cancel & Go Back</Text>
          </TouchableOpacity>
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

  // Loading state - show exit button even while loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.lockedHeader}>
          <Ionicons name="lock-closed" size={16} color="#FF3B30" />
          <Text style={styles.lockedHeaderText}>SECURE MODE ACTIVE</Text>
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading secure documents...</Text>
        </View>
        
        {/* Exit Button - always visible */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <TouchableOpacity 
            style={styles.exitSecureModeBtn} 
            onPress={handleExitSecureMode}
          >
            <Ionicons name="lock-open" size={20} color="#fff" />
            <Text style={styles.exitSecureModeBtnText}>Exit Secure Mode</Text>
          </TouchableOpacity>
        </View>
        
        {renderPinningRequiredModal()}
        {renderExitModal()}
      </View>
    );
  }

  // Document full-screen view
  if (selectedDoc) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedDoc.name}</Text>
          <TouchableOpacity onPress={handleExitSecureMode} style={styles.exitButtonSmall}>
            <Ionicons name="lock-open" size={20} color="#FF3B30" />
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

        {/* Exit Button */}
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

        {renderExitModal()}
        {renderPinningRequiredModal()}
      </View>
    );
  }

  // Main secure mode view
  return (
    <View style={styles.container}>
      {/* Secure Mode Header */}
      <View style={styles.secureHeader}>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          <Text style={styles.secureBadgeText}>SECURE MODE</Text>
        </View>
        <TouchableOpacity onPress={handleExitSecureMode} style={styles.exitButtonSmall}>
          <Ionicons name="lock-open" size={20} color="#FF3B30" />
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
      </ScrollView>

      {/* Exit Secure Mode Button - PROMINENT */}
      <TouchableOpacity style={styles.exitSecureModeBtn} onPress={handleExitSecureMode}>
        <Ionicons name="lock-open" size={20} color="#fff" />
        <Text style={styles.exitSecureModeBtnText}>Exit Secure Mode</Text>
      </TouchableOpacity>

      {/* Bottom Lock Bar */}
      <View style={styles.bottomBar}>
        <Ionicons name="lock-closed" size={16} color="#FF3B30" />
        <Text style={styles.bottomBarText}>Phone locked to Secure Folder</Text>
      </View>

      {/* Restricted Alert */}
      {showRestrictedAlert && (
        <View style={styles.restrictedAlert}>
          <Ionicons name="lock-closed" size={24} color="#fff" />
          <Text style={styles.restrictedText}>PIN Required to Exit</Text>
        </View>
      )}

      {renderExitModal()}
      {renderPinningRequiredModal()}
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
  exitButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
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
  exitSecureModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
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
  // Pinning Required Modal Styles
  pinningModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinningModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinningModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  pinningModalText: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  pinningSteps: {
    width: '100%',
    backgroundColor: '#0f0f1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pinningStepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  pinningStep: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    paddingLeft: 4,
  },
  pinningTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  pinningTipText: {
    flex: 1,
    color: '#007AFF',
    fontSize: 13,
    lineHeight: 18,
  },
  openSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  openSettingsButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmPinningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 2,
    borderColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  confirmPinningButtonText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
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
});
