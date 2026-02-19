import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Permissions, { PermissionStatus } from '../utils/permissions';

interface PermissionItem {
  key: keyof PermissionStatus;
  title: string;
  description: string;
  icon: string;
  isPremium: boolean;
  isRequired: boolean;
}

const PERMISSION_ITEMS: PermissionItem[] = [
  {
    key: 'location',
    title: 'Location Access',
    description: 'Records your location during police stops for documentation',
    icon: 'location',
    isPremium: false,
    isRequired: true,
  },
  {
    key: 'storage',
    title: 'Storage Access',
    description: 'Saves documents and photos securely on your device',
    icon: 'folder',
    isPremium: false,
    isRequired: true,
  },
  {
    key: 'camera',
    title: 'Camera Access',
    description: 'Scan documents and capture photos during encounters',
    icon: 'camera',
    isPremium: true,
    isRequired: false,
  },
  {
    key: 'microphone',
    title: 'Microphone Access',
    description: 'Audio record interactions during police stops',
    icon: 'mic',
    isPremium: true,
    isRequired: false,
  },
  {
    key: 'contacts',
    title: 'Contacts Access',
    description: 'Quick access to emergency contacts and attorney',
    icon: 'people',
    isPremium: true,
    isRequired: false,
  },
  {
    key: 'screenPinning',
    title: 'Screen Pinning',
    description: 'Lock your phone to this app during encounters',
    icon: 'phone-portrait',
    isPremium: false,
    isRequired: false,
  },
];

export default function PermissionsSetup() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPinningGuide, setShowPinningGuide] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setIsLoading(true);
    const status = await Permissions.checkAllPermissions();
    setPermissionStatus(status);
    setIsLoading(false);
  };

  const handleRequestAll = async () => {
    setIsRequesting(true);
    const status = await Permissions.requestAllPermissions();
    setPermissionStatus(status);
    setIsRequesting(false);
  };

  const handleRequestSingle = async (key: keyof PermissionStatus) => {
    setIsRequesting(true);
    
    switch (key) {
      case 'location':
        await Permissions.requestLocationPermission();
        break;
      case 'camera':
        await Permissions.requestCameraPermission();
        break;
      case 'microphone':
        await Permissions.requestMicrophonePermission();
        break;
      case 'storage':
        await Permissions.requestStoragePermission();
        break;
      case 'contacts':
        await Permissions.requestContactsPermission();
        break;
      case 'screenPinning':
        setShowPinningGuide(true);
        setIsRequesting(false);
        return;
    }
    
    const status = await Permissions.checkAllPermissions();
    setPermissionStatus(status);
    setIsRequesting(false);
  };

  const handleOpenSettings = async () => {
    await Permissions.openAppSettings();
  };

  const handleOpenPinningSettings = async () => {
    await Permissions.openScreenPinningSettings();
  };

  const handleConfirmPinning = async () => {
    await Permissions.confirmScreenPinning();
    const status = await Permissions.checkAllPermissions();
    setPermissionStatus(status);
    setShowPinningGuide(false);
  };

  const handleContinue = async () => {
    await Permissions.markPermissionsChecked();
    router.replace('/setup');
  };

  const getStatusColor = (status: string | undefined): string => {
    if (status === 'granted' || status === 'enabled') return '#34C759';
    if (status === 'denied' || status === 'disabled') return '#FF3B30';
    return '#FF9500';
  };

  const getStatusText = (status: string | undefined): string => {
    if (status === 'granted' || status === 'enabled') return 'Enabled';
    if (status === 'denied') return 'Denied';
    if (status === 'disabled') return 'Not Setup';
    return 'Not Set';
  };

  const getStatusIcon = (status: string | undefined): string => {
    if (status === 'granted' || status === 'enabled') return 'checkmark-circle';
    if (status === 'denied' || status === 'disabled') return 'close-circle';
    return 'alert-circle';
  };

  const canContinue = permissionStatus && 
    permissionStatus.location === 'granted' && 
    permissionStatus.storage === 'granted';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Screen Pinning Guide Modal
  if (showPinningGuide) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <ScrollView contentContainerStyle={styles.pinningGuideContent}>
          <View style={styles.pinningHeader}>
            <View style={styles.pinningIconContainer}>
              <Ionicons name="phone-portrait" size={50} color="#007AFF" />
            </View>
            <Text style={styles.pinningTitle}>Setup Screen Pinning</Text>
            <Text style={styles.pinningSubtitle}>
              Screen pinning locks your phone to this app during police encounters
            </Text>
          </View>

          <View style={styles.pinningSteps}>
            <Text style={styles.stepsTitle}>For Samsung S24:</Text>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Open Settings app</Text>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Search "pin" in the search bar</Text>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Find "Pin windows" or "Screen Pinning"</Text>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepText}>Turn it ON</Text>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
              <Text style={styles.stepText}>Enable "Ask for PIN to unpin"</Text>
            </View>
          </View>

          <View style={styles.pinningTip}>
            <Ionicons name="bulb" size={20} color="#FF9500" />
            <Text style={styles.pinningTipText}>
              After setup: Open Recent Apps → Tap app icon → Select "Pin this app"
            </Text>
          </View>

          <TouchableOpacity
            style={styles.openSettingsBtn}
            onPress={handleOpenPinningSettings}
          >
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.openSettingsBtnText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmPinningBtn}
            onPress={handleConfirmPinning}
          >
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.confirmPinningBtnText}>I've Enabled Screen Pinning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => setShowPinningGuide(false)}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={50} color="#007AFF" />
          </View>
          <Text style={styles.title}>App Permissions</Text>
          <Text style={styles.subtitle}>
            Secure Stop needs these permissions to protect you during police encounters
          </Text>
        </View>

        {/* Permission Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {permissionStatus ? Permissions.getGrantedCount(permissionStatus) : 0}
            </Text>
            <Text style={styles.statLabel}>of 6 enabled</Text>
          </View>
        </View>

        {/* Request All Button */}
        <TouchableOpacity
          style={[styles.requestAllBtn, isRequesting && styles.btnDisabled]}
          onPress={handleRequestAll}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="shield" size={20} color="#fff" />
              <Text style={styles.requestAllBtnText}>Enable All Permissions</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Permissions List */}
        <View style={styles.permissionsList}>
          {PERMISSION_ITEMS.map((item) => {
            const status = permissionStatus?.[item.key];
            const statusColor = getStatusColor(status);
            const statusText = getStatusText(status);
            const statusIcon = getStatusIcon(status);
            const isEnabled = status === 'granted' || status === 'enabled';

            return (
              <View key={item.key} style={styles.permissionItem}>
                <View style={[styles.permissionIcon, { backgroundColor: `${statusColor}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={statusColor} />
                </View>
                
                <View style={styles.permissionContent}>
                  <View style={styles.permissionHeader}>
                    <Text style={styles.permissionTitle}>{item.title}</Text>
                    <View style={styles.badgeRow}>
                      {item.isPremium && (
                        <View style={styles.premiumBadge}>
                          <Ionicons name="star" size={10} color="#FFD700" />
                          <Text style={styles.premiumText}>Premium</Text>
                        </View>
                      )}
                      {item.isRequired && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>Required</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.permissionDescription}>{item.description}</Text>
                  
                  <View style={styles.permissionStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons name={statusIcon as any} size={14} color={statusColor} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    
                    {!isEnabled && (
                      <TouchableOpacity
                        style={styles.enableBtn}
                        onPress={() => handleRequestSingle(item.key)}
                        disabled={isRequesting}
                      >
                        <Text style={styles.enableBtnText}>Enable</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Open Settings Link */}
        <TouchableOpacity style={styles.settingsLink} onPress={handleOpenSettings}>
          <Ionicons name="settings-outline" size={16} color="#007AFF" />
          <Text style={styles.settingsLinkText}>Open App Settings</Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <View style={styles.footer}>
          {!canContinue && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color="#FF9500" />
              <Text style={styles.warningText}>
                Location and Storage are required to continue
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.continueBtnText}>Continue to Setup</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {!canContinue && (
            <TouchableOpacity style={styles.skipSetupBtn} onPress={handleContinue}>
              <Text style={styles.skipSetupBtnText}>Skip for now (limited features)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  requestAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  requestAllBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionsList: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  requiredBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    lineHeight: 16,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  enableBtn: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enableBtnText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  settingsLinkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    paddingBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    color: '#FF9500',
    fontSize: 13,
    flex: 1,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueBtnDisabled: {
    backgroundColor: '#333',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipSetupBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipSetupBtnText: {
    color: '#666',
    fontSize: 14,
  },
  // Pinning Guide Styles
  pinningGuideContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  pinningHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pinningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  pinningSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  pinningSteps: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  pinningTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  pinningTipText: {
    color: '#FF9500',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  openSettingsBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmPinningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 2,
    borderColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  confirmPinningBtnText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    color: '#666',
    fontSize: 14,
  },
});
