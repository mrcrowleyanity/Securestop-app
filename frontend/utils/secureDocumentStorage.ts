/**
 * secureDocumentStorage.ts
 *
 * Encrypted local document storage using expo-file-system + expo-secure-store.
 * Documents are stored as encrypted JSON in a private app directory.
 * The encryption key is stored in expo-secure-store (hardware-backed on Android).
 *
 * This is the PRIMARY document store. The backend API is used as a secondary
 * sync/backup when available.
 */

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const DOCS_INDEX_KEY = 'secure_docs_index';          // SecureStore key for document index
const SECURE_FOLDER  = `${FileSystem.documentDirectory}secure_docs/`; // Private FS folder

export interface LocalDocument {
  id: string;
  user_id: string;
  doc_type: string;
  name: string;
  image_base64: string;  // data-URI or plain base64
  created_at: string;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Ensure the secure_docs directory exists. */
async function ensureFolder(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SECURE_FOLDER);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SECURE_FOLDER, { intermediates: true });
  }
}

/** XOR-based obfuscation cipher using a key string. */
function xorObfuscate(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/** Encode binary string to base64 (React Native compatible). */
function toBase64(str: string): string {
  // btoa is available in React Native's Hermes/JSC
  return btoa(unescape(encodeURIComponent(str)));
}

/** Decode base64 to string. */
function fromBase64(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

/** Retrieve or generate the per-user encryption key from SecureStore. */
async function getOrCreateEncryptionKey(userId: string): Promise<string> {
  const storeKey = `doc_enc_key_${userId}`;
  let encKey = await SecureStore.getItemAsync(storeKey);
  if (!encKey) {
    // Generate a random 32-char key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await SecureStore.setItemAsync(storeKey, key);
    encKey = key;
  }
  return encKey;
}

/** Encrypt a plaintext string for a given user. */
async function encrypt(plaintext: string, userId: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(userId);
  const obfuscated = xorObfuscate(plaintext, key);
  return toBase64(obfuscated);
}

/** Decrypt a ciphertext string for a given user. */
async function decrypt(ciphertext: string, userId: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(userId);
  const obfuscated = fromBase64(ciphertext);
  return xorObfuscate(obfuscated, key);
}

/** Read the document index (array of doc IDs) from SecureStore. */
async function readIndex(userId: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(`${DOCS_INDEX_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Write the document index to SecureStore. */
async function writeIndex(userId: string, ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(
    `${DOCS_INDEX_KEY}_${userId}`,
    JSON.stringify(ids)
  );
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Save a document to the encrypted local folder.
 * Generates a unique ID if not provided.
 */
export async function saveDocument(
  userId: string,
  doc: Omit<LocalDocument, 'id' | 'created_at'>
): Promise<LocalDocument> {
  await ensureFolder();

  const newDoc: LocalDocument = {
    ...doc,
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
  };

  // Encrypt and write the document file
  const plaintext = JSON.stringify(newDoc);
  const ciphertext = await encrypt(plaintext, userId);
  const filePath = `${SECURE_FOLDER}${newDoc.id}.enc`;
  await FileSystem.writeAsStringAsync(filePath, ciphertext, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Update the index
  const index = await readIndex(userId);
  index.push(newDoc.id);
  await writeIndex(userId, index);

  return newDoc;
}

/**
 * Load all documents for a user from the encrypted local folder.
 */
export async function loadDocuments(userId: string): Promise<LocalDocument[]> {
  await ensureFolder();

  const index = await readIndex(userId);
  if (index.length === 0) return [];

  const docs: LocalDocument[] = [];
  for (const id of index) {
    try {
      const filePath = `${SECURE_FOLDER}${id}.enc`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) continue;

      const ciphertext = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const plaintext = await decrypt(ciphertext, userId);
      const doc: LocalDocument = JSON.parse(plaintext);
      docs.push(doc);
    } catch (err) {
      console.warn(`Failed to read doc ${id}:`, err);
    }
  }

  // Sort newest first
  docs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return docs;
}

/**
 * Delete a single document by ID.
 */
export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const filePath = `${SECURE_FOLDER}${docId}.enc`;
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }

  // Remove from index
  const index = await readIndex(userId);
  const updated = index.filter((id) => id !== docId);
  await writeIndex(userId, updated);
}

/**
 * Delete ALL documents for a user (e.g. on account delete).
 */
export async function deleteAllDocuments(userId: string): Promise<void> {
  const index = await readIndex(userId);
  for (const id of index) {
    try {
      await FileSystem.deleteAsync(`${SECURE_FOLDER}${id}.enc`, { idempotent: true });
    } catch {}
  }
  await writeIndex(userId, []);
}

/**
 * Load documents from backend API and cache them locally.
 * Call this on app start to sync remote docs into local store.
 */
export async function syncFromBackend(
  userId: string,
  apiUrl: string
): Promise<LocalDocument[]> {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${apiUrl}/api/documents/${userId}`, {
      timeout: 10000,
    });
    const remoteDocs: LocalDocument[] = response.data || [];

    // Load existing local index to avoid duplicates
    const existingDocs = await loadDocuments(userId);
    const existingIds = new Set(existingDocs.map((d) => d.id));

    for (const doc of remoteDocs) {
      if (!existingIds.has(doc.id)) {
        // Save remote doc locally (it already has an id)
        await ensureFolder();
        const plaintext = JSON.stringify(doc);
        const ciphertext = await encrypt(plaintext, userId);
        const filePath = `${SECURE_FOLDER}${doc.id}.enc`;
        await FileSystem.writeAsStringAsync(filePath, ciphertext, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const index = await readIndex(userId);
        if (!index.includes(doc.id)) {
          index.push(doc.id);
          await writeIndex(userId, index);
        }
      }
    }

    return await loadDocuments(userId);
  } catch (err) {
    console.warn('Backend sync failed, using local docs only:', err);
    return await loadDocuments(userId);
  }
}
