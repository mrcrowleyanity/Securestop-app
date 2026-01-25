import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Document {
  id: string;
  doc_type: string;
  name: string;
  image_base64: string;
  created_at: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        const response = await axios.get(`${API_URL}/api/documents/${userId}`);
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/documents/${doc.id}`);
              setDocuments(documents.filter((d) => d.id !== doc.id));
              if (selectedDoc?.id === doc.id) {
                setSelectedDoc(null);
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
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

  const getDocTypeIcon = (type: string): any => {
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
        <View style={styles.docViewHeader}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.docViewTitle}>{selectedDoc.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(selectedDoc)} style={styles.deleteButton}>
            <Ionicons name="trash" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.docViewContent}>
          <Image
            source={{ uri: selectedDoc.image_base64 }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments(); }} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        ) : Object.keys(groupedDocs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No Documents</Text>
            <Text style={styles.emptySubtitle}>Add your first document to get started</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-document')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {Object.entries(groupedDocs).map(([type, docs]) => (
              <View key={type} style={styles.docGroup}>
                <View style={styles.docGroupHeader}>
                  <Ionicons name={getDocTypeIcon(type)} size={20} color="#007AFF" />
                  <Text style={styles.docGroupTitle}>{getDocTypeLabel(type)}</Text>
                  <Text style={styles.docCount}>{docs.length}</Text>
                </View>
                {docs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docItem}
                    onPress={() => setSelectedDoc(doc)}
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
                      <Text style={styles.docDate}>
                        Added {new Date(doc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.docDeleteBtn}
                      onPress={() => handleDelete(doc)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {Object.keys(groupedDocs).length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-document')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  docGroup: {
    marginBottom: 24,
  },
  docGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  docGroupTitle: {
    flex: 1,
    fontSize: 16,
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
  docDate: {
    fontSize: 12,
    color: '#888',
  },
  docDeleteBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  docViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 8,
  },
  docViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  docViewContent: {
    padding: 20,
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 12,
  },
});
