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
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Document {
  id: string;
  doc_type: string;
  name: string;
  image_base64: string;
  created_at: string;
}

const DOC_CATEGORIES = [
  { id: 'id', label: "ID / Driver's License", icon: 'card', color: '#007AFF' },
  { id: 'vehicle_registration', label: 'Vehicle Registration', icon: 'car', color: '#34C759' },
  { id: 'gun_registration', label: 'Gun Registration', icon: 'shield-checkmark', color: '#FF9500' },
  { id: 'birth_certificate', label: 'Birth Certificate', icon: 'document', color: '#AF52DE' },
  { id: 'disability', label: 'Disability Paperwork', icon: 'medical', color: '#FF2D55' },
  { id: 'permit', label: 'Permits', icon: 'document-text', color: '#5856D6' },
  { id: 'job_badge', label: 'Job Badge', icon: 'briefcase', color: '#00C7BE' },
  { id: 'immigration', label: 'Immigration Papers', icon: 'airplane', color: '#FF3B30' },
  { id: 'social_security', label: 'Social Security', icon: 'shield', color: '#64D2FF' },
  { id: 'insurance', label: 'Insurance', icon: 'umbrella', color: '#BF5AF2' },
];

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Count documents per category
  const getCategoryCount = (categoryId: string) => {
    return documents.filter(doc => doc.doc_type === categoryId).length;
  };

  // Get documents for selected category
  const getCategoryDocuments = () => {
    if (!selectedCategory) return [];
    return documents.filter(doc => doc.doc_type === selectedCategory);
  };

  const getCategoryInfo = (categoryId: string) => {
    return DOC_CATEGORIES.find(c => c.id === categoryId);
  };

  // Document Viewer Modal
  const renderDocumentViewer = () => (
    <Modal
      visible={selectedDoc !== null}
      animationType="fade"
      onRequestClose={() => setSelectedDoc(null)}
    >
      <View style={styles.viewerContainer}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.viewerBackBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.viewerTitle} numberOfLines={1}>{selectedDoc?.name}</Text>
          <TouchableOpacity onPress={() => selectedDoc && handleDelete(selectedDoc)} style={styles.viewerDeleteBtn}>
            <Ionicons name="trash" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.viewerContent}>
          {selectedDoc && (
            <Image
              source={{ uri: selectedDoc.image_base64 }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Category Documents Modal
  const renderCategoryModal = () => {
    const categoryInfo = selectedCategory ? getCategoryInfo(selectedCategory) : null;
    const categoryDocs = getCategoryDocuments();

    return (
      <Modal
        visible={selectedCategory !== null && selectedDoc === null}
        animationType="slide"
        onRequestClose={() => setSelectedCategory(null)}
      >
        <View style={styles.categoryModalContainer}>
          {/* Header */}
          <View style={[styles.categoryModalHeader, { backgroundColor: categoryInfo?.color || '#007AFF' }]}>
            <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.categoryBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.categoryHeaderContent}>
              <Ionicons name={categoryInfo?.icon as any || 'folder'} size={28} color="#fff" />
              <Text style={styles.categoryModalTitle}>{categoryInfo?.label}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/add-document')} 
              style={styles.categoryAddBtn}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Documents List */}
          <ScrollView style={styles.categoryDocsList}>
            {categoryDocs.length === 0 ? (
              <View style={styles.emptyCategory}>
                <Ionicons name="folder-open-outline" size={64} color="#444" />
                <Text style={styles.emptyCategoryTitle}>No Documents</Text>
                <Text style={styles.emptyCategorySubtitle}>
                  Add your first {categoryInfo?.label} document
                </Text>
                <TouchableOpacity
                  style={[styles.addDocBtn, { backgroundColor: categoryInfo?.color || '#007AFF' }]}
                  onPress={() => router.push('/add-document')}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addDocBtnText}>Add Document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.docsGrid}>
                {categoryDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docCard}
                    onPress={() => setSelectedDoc(doc)}
                    onLongPress={() => handleDelete(doc)}
                  >
                    <View style={styles.docImageContainer}>
                      <Image
                        source={{ uri: doc.image_base64 }}
                        style={styles.docImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.docCardInfo}>
                      <Text style={styles.docCardName} numberOfLines={2}>{doc.name}</Text>
                      <Text style={styles.docCardDate}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.docCardDelete}
                      onPress={() => handleDelete(doc)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Main Categories View
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
        ) : (
          <View style={styles.categoriesContainer}>
            <Text style={styles.sectionTitle}>Document Categories</Text>
            <Text style={styles.sectionSubtitle}>Tap a category to view documents</Text>
            
            <View style={styles.categoriesGrid}>
              {DOC_CATEGORIES.map((category) => {
                const count = getCategoryCount(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconBg, { backgroundColor: `${category.color}20` }]}>
                      <Ionicons name={category.icon as any} size={32} color={category.color} />
                    </View>
                    <Text style={styles.categoryLabel} numberOfLines={2}>{category.label}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: count > 0 ? category.color : '#444' }]}>
                      <Text style={styles.categoryBadgeText}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{documents.length}</Text>
                <Text style={styles.summaryLabel}>Total Documents</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {DOC_CATEGORIES.filter(c => getCategoryCount(c.id) > 0).length}
                </Text>
                <Text style={styles.summaryLabel}>Categories Used</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-document')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderCategoryModal()}
      {renderDocumentViewer()}
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
  categoriesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  categoryIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    height: 36,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
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
  // Category Modal Styles
  categoryModalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  categoryBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryDocsList: {
    flex: 1,
    padding: 16,
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCategoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCategorySubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addDocBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  docsGrid: {
    gap: 12,
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  docImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  docCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  docCardDate: {
    fontSize: 12,
    color: '#888',
  },
  docCardDelete: {
    padding: 8,
  },
  // Document Viewer Styles
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a2e',
  },
  viewerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  viewerDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: width - 32,
    height: width * 1.4,
    borderRadius: 12,
  },
});
