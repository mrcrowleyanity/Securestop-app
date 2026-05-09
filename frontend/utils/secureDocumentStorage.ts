import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

const ENC_KEY_PREFIX = 'securestop_aes256_key_v1_';
const SECURE_FOLDER = `${FileSystem.documentDirectory}ss_vault/`;
const INDEX_FILE_NAME = '_index.json';

export interface LocalDocument {
  id: string;
  user_id: string;
  doc_type: string;
  name: string;
  image_base64: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Vault init
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

async function getOrCreateKey(userId: string): Promise<Uint8Array> {
  const storeKey = `${ENC_KEY_PREFIX}${userId}`;
  let hexKey = await SecureStore.getItemAsync(storeKey);
  if (!hexKey) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    hexKey = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(storeKey, hexKey);
  }
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
  }
  return keyBytes;
}

// ---------------------------------------------------------------------------
// Encryption / decryption
// ---------------------------------------------------------------------------

async function encryptAES(plaintext: string, key: Uint8Array): Promise<string> {
  // FIX: Crypto.getRandomBytesAsync returns Uint8Array. Use ivBytes directly —
  // aesjs.Counter accepts `number | Uint8Array`, NOT `number[]`, so the previous
  // Array.from() conversion caused TS2345 on every Counter construction.
  const ivBytes = await Crypto.getRandomBytesAsync(16);

  const textBytes = aesjs.utils.utf8.toBytes(plaintext);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(ivBytes));
  const encryptedBytes = aesCtr.encrypt(textBytes);

  // For hex serialisation we still need the values as numbers, but we produce
  // the hex string ourselves rather than handing the array to Counter.
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

  // FIX: Build a Uint8Array directly instead of number[] — same Counter type
  // constraint as in encryptAES. This also resolves the TS2345 on line 114.
  const iv = new Uint8Array(ivHex.length / 2);
  for (let i = 0; i < ivHex.length; i += 2) {
    iv[i / 2] = parseInt(ivHex.substring(i, i + 2), 16);
  }

  const encryptedBytes = aesjs.utils.hex.toBytes(cipherHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

function getIndexPath(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${SECURE_FOLDER}${INDEX_FILE_NAME}.${safeId}`;
}

async function readIndex(userId: string): Promise<string[]> {
  try {
    const indexPath = getIndexPath(userId);
    const info = await FileSystem.getInfoAsync(indexPath);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(indexPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, ids: string[]): Promise<void> {
  const indexPath = getIndexPath(userId);
  await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(ids), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
      encoding: FileSystem.EncodingType.UTF8,
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
          encoding: FileSystem.EncodingType.UTF8,
        });
        const plaintext = await decryptAES(ciphertext, key);
        docs.push(JSON.parse(plaintext) as LocalDocument);
      } catch (innerError) {
        console.warn(`[SecureVault] Failed to load doc ${id}:`, innerError);
      }
    }
    return docs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('[SecureVault] loadDocuments error:', error);
    throw error;
  }
}

/** Efficiently loads a single document without decrypting the entire vault. */
export async function loadDocumentById(
  userId: string,
  docId: string
): Promise<LocalDocument | null> {
  try {
    await ensureVault();
    const filePath = `${SECURE_FOLDER}${docId}.enc`;
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return null;
    const key = await getOrCreateKey(userId);
    const ciphertext = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const plaintext = await decryptAES(ciphertext, key);
    return JSON.parse(plaintext) as LocalDocument;
  } catch (error) {
    console.error(`[SecureVault] loadDocumentById(${docId}) error:`, error);
    return null;
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
    const updated = index.filter((id) => id !== docId);
    await writeIndex(userId, updated);
  } catch (error) {
    console.error(`[SecureVault] deleteDocument(${docId}) error:`, error);
    throw error;
  }
}

export async function deleteAllDocuments(userId: string): Promise<void> {
  try {
    const index = await readIndex(userId);
    for (const id of index) {
      const filePath = `${SECURE_FOLDER}${id}.enc`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
    await writeIndex(userId, []);
  } catch (error) {
    console.error('[SecureVault] deleteAllDocuments error:', error);
    throw error;
  }
}

export async function initVault(): Promise<void> {
  await ensureVault();
}
