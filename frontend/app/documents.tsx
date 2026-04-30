import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { loadDocuments, deleteDocument, LocalDocument } from '../utils/secureDocumentStorage';

export default function Documents() {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please log in again.');
        router.replace('/setup');
        return;
      }

      const docs = await loadDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserDocuments();
  };

  const handleDeleteDocument = async (docId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to permanently delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await SecureStore.getItemAsync('user_id');
              if (userId) {
                await deleteDocument(userId, docId);
                await loadUserDocuments();
                Alert.alert('Success', 'Document deleted');
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

  const handleViewDocument = (doc: LocalDocument) => {
    router.push({
      pathname: '/view-document',
      params: { documentId: doc.id },
    });
  };

  const getDocTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      id: "ID / Driver's License",
      vehicle_registration: 'Vehicle Registration',
      gun_registration: 'Gun Registration',
      birth_certificate: 'Birth Certificate',
      disability: 'Disability Paperwork',
      permit: 'Permits',
      job_badge: 'Job Badge',
      immigration: 'Immigration Papers',
      social_security: 'Social Security',
      insurance: 'Insurance',
    };
    return labels[type] || type;
  };

  const getDocTypeIcon = (type: string) => {
    const icons: { [key: string]: any } = {
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
  const groupedDocs = documents.reduce((acc: { [key: string]: LocalDocument[] }, doc: LocalDocument) => {
    if (!acc[doc.doc_type]) {
      acc[doc.doc_type] = [];
    }
    acc[doc.doc_type].push(doc);
    return acc;
  }, {} as { [key: string]: LocalDocument[] });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Documents</Text>
        <TouchableOpacity onPress={() => router.push('/add-document')} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
      >
        {Object.keys(groupedDocs).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first document to get started</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/add-document')}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedDocs).map(([type, docs]: [string, LocalDocument[]]) => (
            <View key={type} style={styles.docGroup}>
              <View style={styles.docGroupHeader}>
                <Ionicons name={getDocTypeIcon(type)} size={18} color="#007AFF" />
                <Text style={styles.docGroupTitle}>{getDocTypeLabel(type)}</Text>
                <Text style={styles.docCount}>{docs.length}</Text>
              </View>
              {docs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.docItem}
                  onPress={() => handleViewDocument(doc)}
                  onLongPress={() => handleDeleteDocument(doc.id)}
                >
                  <View style={styles.docThumbnail}>
                    <Image
                      source={{ uri: doc.image_base64 }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={styles.docDate}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  docDate: {
    fontSize: 12,
    color: '#888',
  },
  bottomPadding: {
    height: 40,
  },
});
