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
  Alert,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as KeepAwake from 'expo-keep-awake';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
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

  useEffect(() => {
    loadData();
    KeepAwake.activateKeepAwakeAsync();

    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, []);

  // Block back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        showRestrictedMessage();
        return true; // Prevent default back behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  const loadData = async () => {
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

  const handleUnlock = () => {
    router.push('/unlock');
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

  if (selectedDoc) {
    return (
      <View style={styles.container}>
        {/* Header with lock icon */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedDoc.name}</Text>
          <TouchableOpacity onPress={handleUnlock} style={styles.lockButton}>
            <Ionicons name="lock-closed" size={20} color="#FF3B30" />
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
            <Ionicons name="lock-closed" size={24} color="#FF3B30" />
            <Text style={styles.restrictedText}>Restricted Access - PIN Required to Exit</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          <Text style={styles.secureBadgeText}>SECURE MODE</Text>
        </View>
        <TouchableOpacity onPress={handleUnlock} style={styles.lockButton}>
          <Ionicons name="lock-closed" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Officer Info */}
      <View style={styles.officerInfo}>
        <View style={styles.officerRow}>
          <Ionicons name="person" size={16} color="#888" />
          <Text style={styles.officerLabel}>Officer:</Text>
          <Text style={styles.officerValue}>{officerName}</Text>
        </View>
        <View style={styles.officerRow}>
          <Ionicons name="card" size={16} color="#888" />
          <Text style={styles.officerLabel}>Badge:</Text>
          <Text style={styles.officerValue}>{badgeNumber}</Text>
        </View>
      </View>

      {/* Documents List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Documents</Text>

        {Object.keys(groupedDocs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No documents available</Text>
          </View>
        ) : (
          Object.entries(groupedDocs).map(([type, docs]) => (
            <View key={type} style={styles.docGroup}>
              <View style={styles.docGroupHeader}>
                <Ionicons name={getDocTypeIcon(type) as any} size={18} color="#007AFF" />
                <Text style={styles.docGroupTitle}>{getDocTypeLabel(type)}</Text>
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

      {/* Restricted Alert */}
      {showRestrictedAlert && (
        <View style={styles.restrictedAlert}>
          <Ionicons name="lock-closed" size={24} color="#FF3B30" />
          <Text style={styles.restrictedText}>Restricted Access - PIN Required to Exit</Text>
        </View>
      )}

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Ionicons name="information-circle" size={16} color="#666" />
        <Text style={styles.bottomInfoText}>
          Tap the lock icon to exit secure mode (PIN required)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  secureBadgeText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerInfo: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  officerLabel: {
    color: '#888',
    fontSize: 14,
  },
  officerValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
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
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: '#1a1a2e',
  },
  bottomInfoText: {
    color: '#666',
    fontSize: 12,
  },
});
