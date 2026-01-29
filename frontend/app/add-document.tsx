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
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

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
    setShowOptionsModal(true);
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
        quality: 0.8,
        base64: true,
      });

      if (photo?.base64) {
        setImageUri(`data:image/jpeg;base64,${photo.base64}`);
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
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
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImageUri(`data:image/jpeg;base64,${asset.base64}`);
      }
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
        // For images, we can display them
        if (asset.mimeType?.startsWith('image/')) {
          // Read the file and convert to base64
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setImageUri(base64);
          };
          reader.readAsDataURL(blob);
        } else {
          Alert.alert('PDF Selected', 'PDF documents will be stored. For best results, use an image.');
          // For PDFs, we could store the URI or show a placeholder
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
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
      const userId = await AsyncStorage.getItem('user_id');

      await axios.post(`${API_URL}/api/documents`, {
        user_id: userId,
        doc_type: selectedType,
        name: documentName.trim(),
        image_base64: imageUri,
      });

      Alert.alert('Success', 'Document saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Camera Scanner Modal
  const renderCameraModal = () => (
    <Modal
      visible={showCameraModal}
      animationType="slide"
      onRequestClose={() => setShowCameraModal(false)}
    >
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setShowCameraModal(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Scan Document</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Document Frame Guide */}
          <View style={styles.frameContainer}>
            <View style={styles.frameOverlay}>
              {/* Top overlay */}
              <View style={styles.overlayTop} />
              
              {/* Middle section with frame */}
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.documentFrame}>
                  {/* Corner guides */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                  
                  {/* Center crosshair */}
                  <View style={styles.crosshairH} />
                  <View style={styles.crosshairV} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              
              {/* Bottom overlay */}
              <View style={styles.overlayBottom} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionsBg}>
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.instructionsText}>
                Align document within the frame
              </Text>
            </View>
          </View>

          {/* Capture Button */}
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
              onPress={captureDocument}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#007AFF" size="large" />
              ) : (
                <View style={styles.captureBtnInner} />
              )}
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );

  // Options Modal
  const renderOptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowOptionsModal(false)}
      >
        <View style={styles.optionsModal}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Add Document</Text>
            <Text style={styles.optionsSubtitle}>
              {DOC_TYPES.find(t => t.id === selectedType)?.label}
            </Text>
          </View>

          <TouchableOpacity style={styles.optionItem} onPress={handleCameraCapture}>
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
              <Ionicons name="camera" size={28} color="#007AFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Scan with Camera</Text>
              <Text style={styles.optionDesc}>Use document scanner with guides</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={pickFromGallery}>
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
              <Ionicons name="images" size={28} color="#34C759" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Choose from Photos</Text>
              <Text style={styles.optionDesc}>Select image from gallery</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={pickDocument}>
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
              <Ionicons name="document" size={28} color="#FF9500" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Select Document</Text>
              <Text style={styles.optionDesc}>Choose from files</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowOptionsModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Document Type Selection */}
        <Text style={styles.sectionTitle}>Select Document Type</Text>
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
                color={selectedType === type.id ? '#007AFF' : '#888'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.id && styles.typeLabelSelected,
                ]}
                numberOfLines={2}
              >
                {type.label}
              </Text>
              {selectedType === type.id && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Document Name */}
        {selectedType && (
          <>
            <Text style={styles.sectionTitle}>Document Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Driver's License Front"
              placeholderTextColor="#666"
              value={documentName}
              onChangeText={setDocumentName}
            />
          </>
        )}

        {/* Image Preview */}
        {imageUri && (
          <>
            <Text style={styles.sectionTitle}>Document Preview</Text>
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={32} color="#FF3B30" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => setShowOptionsModal(true)}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Add Image Button (if no image) */}
        {selectedType && !imageUri && (
          <>
            <Text style={styles.sectionTitle}>Document Image</Text>
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={() => setShowOptionsModal(true)}
            >
              <Ionicons name="add-circle" size={48} color="#007AFF" />
              <Text style={styles.addImageText}>Tap to add document</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Ionicons name="bulb" size={16} color="#FF9500" />
          <Text style={styles.tipsText}>
            Tip: Ensure good lighting and that all text is clearly visible
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!selectedType || !imageUri || isLoading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!selectedType || !imageUri || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Document</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderOptionsModal()}
      {renderCameraModal()}
    </KeyboardAvoidingView>
  );
}

const FRAME_WIDTH = width * 0.85;
const FRAME_HEIGHT = FRAME_WIDTH * 0.63; // Standard card aspect ratio

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  typeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#007AFF',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addImageButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addImageText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retakeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 100,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9500',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: '#0f0f1a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Options Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  optionsHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  optionsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  // Camera Modal Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_HEIGHT,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  documentFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
    marginLeft: -15,
    marginTop: -1,
  },
  crosshairV: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 2,
    height: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
    marginLeft: -1,
    marginTop: -15,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionsBg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  captureContainer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
  },
});
