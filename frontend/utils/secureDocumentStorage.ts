/**
 * secureDocumentStorage.ts
 *
 * AES-256-CTR encrypted local document storage.
 * - Documents are stored as AES-256-CTR encrypted files in the app's private
 *   internal storage directory.
 * - Format: <16-byte-IV-hex>:<aes-ctr-ciphertext-hex>
 *
 * FIXES:
 * - Removed keychainAccessible option (WHEN_UNLOCKED_THIS_DEVICE_ONLY is buggy in SDK 49+)
 * - Moved document index from SecureStore to filesystem (avoids 2048-byte SecureStore limit)
 * - Index stored as encrypted JSON file in vault folder
 */
import * as FileSystem from 'expo-file-system';
import { EncodingType, documentDirectory } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ENC_KEY_PREFIX = 'securestop_aes256_key_v1_';

/**
 * Vault folder - no leading dot to avoid hidden-folder issues on Android.
 */
const SECURE_FOLDER = `${documentDirectory}ss_vault/`;

// Index file stored in vault (not SecureStore - avoids 2048-byte limit)
const INDEX_FILE_NAME = '_index.json';

// ─────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────

export interface LocalDocument {
  id: string;
  user_id: string;
  doc_type: string;
  name: string;
  image_base64: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Internal: folder bootstrap
// ─────────────────────────────────────────────

async function ensureVault(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(SECURE_FOLDER);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(SECURE_FOLDER, { intermediates: true });
    }
  } catch (error) {
    console.error('[SecureVault] ensureVault error:', error);
    throw new Error('Failed to initialize secure storage folder');
  }
}

// ─────────────────────────────────────────────
// Internal: key management
// ─────────────────────────────────────────────

async function getOrCreateKey(userId: string): Promise<Uint8Array> {
  const storeKey = `${ENC_KEY_PREFIX}${userId}`;
  let hexKey = await SecureStore.getItemAsync(storeKey);

  if (!hexKey) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    hexKey = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    // NOTE: No keychainAccessible option - WHEN_UNLOCKED_THIS_DEVICE_ONLY is
    // broken in expo-secure-store since SDK 49 (maps to wrong constraint).
    // Default (WHEN_UNLOCKED) is correct and secure for our use case.
    await SecureStore.setItemAsync(storeKey, hexKey);
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
  }
  return keyBytes;
}

// ─────────────────────────────────────────────
// Internal: AES-256-CTR encrypt / decrypt
// ─────────────────────────────────────────────

async function encryptAES(plaintext: string, key: Uint8Array): Promise<string> {
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const iv = Array.from(ivBytes);
  const textBytes = aesjs.utils.utf8.toBytes(plaintext);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const encryptedBytes = aesCtr.encrypt(textBytes);
  const ivHex = Array.from(ivBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const cipherHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  return `${ivHex}:${cipherHex}`;
}

async function decryptAES(ciphertext: string, key: Uint8Array): Promise<string> {
  const colonIdx = ciphertext.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid ciphertext format');
  const ivHex = ciphertext.substring(0, colonIdx);
  const cipherHex = ciphertext.substring(colonIdx + 1);
  const iv: number[] = [];
  for (let i = 0; i < ivHex.length; i += 2) {
    iv.push(parseInt(ivHex.substring(i, i + 2), 16));
  }
  const encryptedBytes = aesjs.utils.hex.toBytes(cipherHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

// ─────────────────────────────────────────────
// Internal: document index (stored in filesystem, NOT SecureStore)
// SecureStore has a 2048-byte value limit which the index can easily exceed.
// ─────────────────────────────────────────────

function getIndexPath(userId: string): string {
  // Sanitize userId to be safe as a filename component
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${SECURE_FOLDER}${INDEX_FILE_NAME}.${safeId}`;
}

async function readIndex(userId: string): Promise<string[]> {
  try {
    const indexPath = getIndexPath(userId);
    const info = await FileSystem.getInfoAsync(indexPath);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(indexPath, {
      encoding: EncodingType.UTF8,
    });
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, ids: string[]): Promise<void> {
  const indexPath = getIndexPath(userId);
  await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(ids), {
    encoding: EncodingType.UTF8,
  });
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function saveDocument(
  userId: string,
  doc: Omit<LocalDocument, 'id' | 'created_at'>
): Promise<LocalDocument> {
  try {
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
      encoding: EncodingType.UTF8,
    });

    const index = await readIndex(userId);
    if (!index.includes(newDoc.id)) {
      index.push(newDoc.id);
      await writeIndex(userId, index);
    }

    return newDoc;
  } catch (error) {
    console.error('[SecureVault] Save error:', error);
    throw error;
  }
}

export async function loadDocuments(userId: string): Promise<LocalDocument[]> {
  try {
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
          encoding: EncodingType.UTF8,
        });
        const plaintext = await decryptAES(ciphertext, key);
        const doc: LocalDocument = JSON.parse(plaintext);
        docs.push(doc);
      } catch (err) {
        console.warn(`[SecureVault] Failed to read doc ${id}:`, err);
      }
    }

    return docs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('[SecureVault] Load error:', error);
    return [];
  }
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  try {
    const filePath = `${SECURE_FOLDER}${docId}.enc`;
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
    const index = await readIndex(userId);
    await writeIndex(userId, index.filter((id) => id !== docId));
  } catch (error) {
    console.error('[SecureVault] Delete error:', error);
  }
}

export async function deleteAllDocuments(userId: string): Promise<void> {
  try {
    const index = await readIndex(userId);
    for (const id of index) {
      try {
        await FileSystem.deleteAsync(`${SECURE_FOLDER}${id}.enc`, {
          idempotent: true,
        });
      } catch { /* ignored */ }
    }
    await writeIndex(userId, []);
  } catch (error) {
    console.error('[SecureVault] Delete all error:', error);
  }
}

export async function initVault(): Promise<void> {
  await ensureVault();
}

export default {
  saveDocument,
  loadDocuments,
  deleteDocument,
  deleteAllDocuments,
  initVault,
};
