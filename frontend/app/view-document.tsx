import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { loadDocumentById, LocalDocument } from '../utils/secureDocumentStorage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDocType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewDocumentScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<LocalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoc = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!documentId) {
        setError('No document ID provided.');
        return;
      }

      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        setError('User session not found. Please log in again.');
        return;
      }

      const loaded = await loadDocumentById(userId, documentId);
      if (!loaded) {
        setError('Document not found or could not be decrypted.');
        return;
      }

      setDoc(loaded);
    } catch (err) {
      console.error('[ViewDocument] Load error:', err);
      setError('Failed to load document.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Decrypting document…</Text>
      </View>
    );
  }

  // ---- Error state ---------------------------------------------------------
  if (error || !doc) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Load Document</Text>
        <Text style={styles.errorBody}>{error ?? 'Unknown error.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Document view -------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBackText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc.name}
        </Text>
        {/* Spacer to balance the back button */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document image */}
        {doc.image_base64 ? (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: doc.image_base64 }}
              style={styles.docImage}
              resizeMode="contain"
              accessibilityLabel={`Image of ${doc.name}`}
            />
          </View>
        ) : (
          <View style={[styles.imageCard, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No image available</Text>
          </View>
        )}

        {/* Details card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Document Details</Text>

          <DetailRow label="Name" value={doc.name} />
          <DetailRow label="Type" value={formatDocType(doc.doc_type)} />
          <DetailRow label="Added" value={formatDate(doc.created_at)} />
          <DetailRow label="Document ID" value={doc.id} mono />
        </View>

        {/* Security badge */}
        <View style={styles.securityBadge}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Stored with AES-256 encryption on this device only
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={mono ? 1 : undefined}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const colors = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  accent: '#007AFF',
  text: '#ffffff',
  subtext: '#8e8ea0',
  border: '#2a2a3e',
  separator: '#232336',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ---- Header --------------------------------------------------------------
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: {
    minWidth: 60,
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 17,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    minWidth: 60,
  },

  // ---- Scroll content ------------------------------------------------------
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // ---- Image ---------------------------------------------------------------
  imageCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  docImage: {
    width: '100%',
    height: 280,
  },
  imagePlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.subtext,
    fontSize: 15,
  },

  // ---- Details card --------------------------------------------------------
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsCardTitle: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: 12,
  },
  rowLabel: {
    color: colors.subtext,
    fontSize: 15,
    flexShrink: 0,
    width: 90,
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: colors.subtext,
  },

  // ---- Security badge ------------------------------------------------------
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    color: colors.subtext,
    fontSize: 13,
    flex: 1,
  },

  // ---- Loading / error states ----------------------------------------------
  loadingText: {
    color: colors.subtext,
    marginTop: 14,
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorBody: {
    color: colors.subtext,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
