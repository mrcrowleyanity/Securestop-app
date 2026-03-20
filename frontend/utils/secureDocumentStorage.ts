/**
 * secureDocumentStorage.ts
 *
 * AES-256-CTR encrypted local document storage.
 * - Documents are stored as AES-256-CTR encrypted files in the app's private
 *   internal storage directory (not accessible by other apps on Android).
 * - A unique 256-bit encryption key is generated once per user and stored
 *   in expo-secure-store (hardware-backed Android Keystore when available).
 * - The key NEVER leaves the device and cannot be extracted without root access.
 * - Each document file is encrypted with a unique random IV (nonce).
 * - Format: <16-byte-IV-hex>:<aes-ctr-ciphertext-hex>
 *
 * This is the SOLE document store. All saves, reads, and deletes go here.
 */

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** SecureStore key prefix for the per-user AES-256 encryption key */
const ENC_KEY_PREFIX = 'securestop_aes256_key_v1_';

/** SecureStore key prefix for the document index */
const INDEX_KEY_PREFIX = 'securestop_doc_index_v1_';

/**
 * The secure folder lives inside FileSystem.documentDirectory which is the
 * app's private internal storage on Android — inaccessible to other apps
 * without root. The folder name is intentionally non-descriptive.
 */
const SECURE_FOLDER = `${FileSystem.documentDirectory}.ss_vault/`;

// ─────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────

export interface LocalDocument {
  id: string;
  user_id: string;
  doc_type: string;
  name: string;
  image_base64: string; // data-URI or plain base64
  created_at: string;
}

// ─────────────────────────────────────────────
// Internal: folder bootstrap
// ─────────────────────────────────────────────

/** Create the encrypted vault directory if it does not exist. */
async function ensureVault(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SECURE_FOLDER);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SECURE_FOLDER, { intermediates: true });
  }
}

// ─────────────────────────────────────────────
// Internal: key management
// ─────────────────────────────────────────────

/**
 * Retrieve or generate the per-user AES-256 key.
 * The key is stored as a 64-char hex string in expo-secure-store.
 * On Android, expo-secure-store uses the Android Keystore system,
 * meaning the key is hardware-backed and bound to this app.
 */
async function getOrCreateKey(userId: string): Promise<Uint8Array> {
  const storeKey = `${ENC_KEY_PREFIX}${userId}`;
  let hexKey = await SecureStore.getItemAsync(storeKey);

  if (!hexKey) {
    // Generate 32 cryptographically random bytes (256 bits)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    hexKey = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(storeKey, hexKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  // Convert hex string -> Uint8Array
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
  }
  return keyBytes;
}

// ─────────────────────────────────────────────
// Internal: AES-256-CTR encrypt / decrypt
// ─────────────────────────────────────────────

/**
 * Encrypt plaintext string with AES-256-CTR.
 * Returns a string in the format:  <iv-hex>:<ciphertext-hex>
 * A fresh random 16-byte IV is generated for every call.
 */
async function encryptAES(plaintext: string, key: Uint8Array): Promise<string> {
  // Generate a random 16-byte IV for this document
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const iv = Array.from(ivBytes);

  // Convert plaintext to bytes
  const textBytes = aesjs.utils.utf8.toBytes(plaintext);

  // AES-256-CTR encrypt
  const aesCtr = new aesjs.ModeOfOperation.ctr(Array.from(key), new aesjs.Counter(iv));
  const encryptedBytes = aesCtr.encrypt(textBytes);

  // Encode IV and ciphertext as hex
  const ivHex = Array.from(ivBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const cipherHex = aesjs.utils.hex.fromBytes(encryptedBytes);

  return `${ivHex}:${cipherHex}`;
}

/**
 * Decrypt an AES-256-CTR ciphertext string produced by encryptAES.
 */
async function decryptAES(ciphertext: string, key: Uint8Array): Promise<string> {
  const colonIdx = ciphertext.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid ciphertext format');

  const ivHex = ciphertext.substring(0, colonIdx);
  const cipherHex = ciphertext.substring(colonIdx + 1);

  // Decode IV
  const iv: number[] = [];
  for (let i = 0; i < ivHex.length; i += 2) {
    iv.push(parseInt(ivHex.substring(i, i + 2), 16));
  }

  // Decode ciphertext bytes
  const encryptedBytes = aesjs.utils.hex.toBytes(cipherHex);

  // AES-256-CTR decrypt (CTR mode: encrypt = decrypt)
  const aesCtr = new aesjs.ModeOfOperation.ctr(Array.from(key), new aesjs.Counter(iv));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);

  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

// ─────────────────────────────────────────────
// Internal: document index
// ─────────────────────────────────────────────

async function readIndex(userId: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(`${INDEX_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(
    `${INDEX_KEY_PREFIX}${userId}`,
    JSON.stringify(ids)
  );
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Save a document to the encrypted vault.
 * The document JSON is AES-256-CTR encrypted and written as a .enc file
 * inside the app's private internal storage folder.
 * Returns the saved document (with generated id and created_at).
 */
export async function saveDocument(
  userId: string,
  doc: Omit<LocalDocument, 'id' | 'created_at'>
): Promise<LocalDocument> {
  await ensureVault();

  const newDoc: LocalDocument = {
    ...doc,
    id: `ss_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    created_at: new Date().toISOString(),
  };

  const key = await getOrCreateKey(userId);
  const plaintext = JSON.stringify(newDoc);
  const ciphertext = await encryptAES(plaintext, key);

  const filePath = `${SECURE_FOLDER}${newDoc.id}.enc`;
  await FileSystem.writeAsStringAsync(filePath, ciphertext, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Update index
  const index = await readIndex(userId);
  if (!index.includes(newDoc.id)) {
    index.push(newDoc.id);
    await writeIndex(userId, index);
  }

  return newDoc;
}

/**
 * Load all documents for a user from the encrypted vault.
 * Returns documents sorted newest-first.
 */
export async function loadDocuments(userId: string): Promise<LocalDocument[]> {
  await ensureVault();

  const index = await readIndex(userId);
  if (index.length === 0) return [];

  const key = await getOrCreateKey(userId);
  const docs: LocalDocument[] = [];

  for (const id of index) {
    try {
      const filePath = `${SECURE_FOLDER}${id}.enc`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) continue;

      const ciphertext = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const plaintext = await decryptAES(ciphertext, key);
      const doc: LocalDocument = JSON.parse(plaintext);
      docs.push(doc);
    } catch (err) {
      console.warn(`[SecureVault] Failed to read doc ${id}:`, err);
    }
  }

  return docs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Delete a single document by ID from the encrypted vault.
 */
export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const filePath = `${SECURE_FOLDER}${docId}.enc`;
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }

  const index = await readIndex(userId);
  await writeIndex(userId, index.filter((id) => id !== docId));
}

/**
 * Permanently wipe ALL documents for a user.
 * Used on account deletion / full data reset.
 */
export async function deleteAllDocuments(userId: string): Promise<void> {
  const index = await readIndex(userId);
  for (const id of index) {
    try {
      await FileSystem.deleteAsync(`${SECURE_FOLDER}${id}.enc`, { idempotent: true });
    } catch { /* best-effort */ }
  }
  await writeIndex(userId, []);
}

/**
 * Sync documents from the backend API and cache them into the encrypted vault.
 * Skips documents that already exist locally (by ID).
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

    const existing = await loadDocuments(userId);
    const existingIds = new Set(existing.map((d) => d.id));

    for (const doc of remoteDocs) {
      if (!existingIds.has(doc.id)) {
        // Write the remote doc into the encrypted vault directly
        await ensureVault();
        const key = await getOrCreateKey(userId);
        const plaintext = JSON.stringify(doc);
        const ciphertext = await encryptAES(plaintext, key);
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
    console.warn('[SecureVault] Backend sync failed, using local vault only:', err);
    return await loadDocuments(userId);
  }
}
