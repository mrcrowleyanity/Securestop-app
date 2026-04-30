import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { saveDocument } from '../utils/secureDocumentStorage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';


const DOC_TYPES = [
  { id: 'id', label: "ID / Driver's License", icon: 'card' },
  { id: 'vehicle_registration', label: 'Vehicle Registration', icon: 'car' },
  { id: 'gun_registration', label: 'Gun Registration', icon: 'shield-checkmark' },
  { id: 'birth_certificate', label: 'Birth Certificate', icon: 'document' },
  { id: 'disability', label: 'Disability Paperwork', icon: 'medical' },
  { id: 'permit', label: 'Permits', icon: 'document-text' },
  { id: 'job_badge', label: 'Job Badge', icon: 'briefcase' },
  { id: 'immigration', label: 'Immigration Papers', icon: 'airplane' },
  { id: 'social_security', label: 'Social Security', icon: 'shield' },
  { id: 'insurance', label: 'Insurance', icon: 'umbrella' },
];

export default function AddDocument() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const docType = DOC_TYPES.find(t => t.id === typeId);
    if (docType) {
      setDocumentName(docType.label);
    }
  };

  const pickFromGallery = async () => {
    setShowOptionsModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickDocument = async () => {
    setShowOptionsModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.mimeType?.startsWith('image/')) {
          setImageUri(asset.uri);
        } else {
          Alert.alert('PDF Selected', 'PDF documents will be stored. For best results, use an image.');
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleCameraCapture = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan documents');
        return;
      }
    }
    setShowOptionsModal(false);
    setShowCameraModal(true);
  };

  const captureDocument = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: false,
      });

      if (photo?.uri) {
        setImageUri(photo.uri);
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Required', 'Please select a document type');
      return;
    }
    if (!documentName.trim()) {
      Alert.alert('Required', 'Please enter a document name');
      return;
    }
    if (!imageUri) {
      Alert.alert('Required', 'Please add an image of your document');
      return;
    }

    setIsLoading(true);
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Read image content as base64
      const base64Content = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      const finalBase64 = `data:image/jpeg;base64,${base64Content}`;

      // Save using the secure vault utility
      await saveDocument(userId, {
        user_id: userId,
        doc_type: selectedType,
        name: documentName.trim(),
        image_base64: finalBase64,
      });

      Alert.alert('Success', 'Document saved securely in your vault', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Document</Text>
        </View>

        <Text style={styles.sectionLabel}>1. Select Document Type</Text>
        <View style={styles.typeGrid}>
          {DOC_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType === type.id && styles.typeCardSelected,
              ]}
              onPress={() => handleTypeSelect(type.id)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={selectedType === type.id ? '#fff' : '#4dabf7'} 
              />
              <Text style={[
                styles.typeLabel,
                selectedType === type.id && styles.typeLabelSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>2. Document Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. My Driver's License"
          placeholderTextColor="#888"
          value={documentName}
          onChangeText={setDocumentName}
        />

        <Text style={styles.sectionLabel}>3. Capture or Upload Document</Text>
        <TouchableOpacity 
          style={styles.uploadArea} 
          onPress={() => setShowOptionsModal(true)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.uploadPlaceholder}>
                        <Ionicons name="camera-outline" size={48} color="#4dabf7" />
              <Text style={styles.uploadText}>Tap to add document photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Save to Secure Vault</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Upload Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Document Photo</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handleCameraCapture}>
              <Ionicons name="camera" size={24} color="#4dabf7" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color="#4dabf7" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickDocument}>
              <Ionicons name="document-attach" size={24} color="#4dabf7" />
              <Text style={styles.modalOptionText}>Browse Documents</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]} 
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal
        visible={showCameraModal}
        animationType="fade"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera}>
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.cameraClose} 
                onPress={() => setShowCameraModal(false)}
              >
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.captureBtn} 
                onPress={captureDocument}
                disabled={isCapturing}
              >
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4dabf7',
    marginBottom: 15,
    marginTop: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  typeCardSelected: {
    backgroundColor: '#4dabf7',
    borderColor: '#4dabf7',
  },
  typeLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#333',
  },
  uploadArea: {
    width: '100%',
    height: 200,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#888',
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  saveButton: {
    backgroundColor: '#2b8a3e',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  cancelOption: {
    borderBottomWidth: 0,
    marginTop: 10,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#fa5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  cameraClose: {
    position: 'absolute',
    top: 40,
    left: 20,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
});
