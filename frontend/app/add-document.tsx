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
import * as SecureStore from 'expo-secure-store';
import { saveDocument } from '../utils/secureDocumentStorage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
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

      let finalBase64 = imageUri;
      if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
        const base64Content = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        finalBase64 = `data:image/jpeg;base64,${base64Content}`;
      }

      await saveDocument(userId, {
        user_id: userId,
        doc_type: selectedType,
        name: documentName.trim(),
        image_base64: finalBase64,
      });

      Alert.alert('Success', 'Document saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save document. It might be too large.');
    } finally {
      setIsLoading(false);
    }
  };

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
