import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ─── PREMIUM CHECK ────────────────────────────────────────────────────────────
export async function isPremium(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync('is_premium');
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setPremium(value: boolean): Promise<void> {
  await SecureStore.setItemAsync('is_premium', value ? 'true' : 'false');
}

// ─── CRYPTOGRAPHIC HASH ───────────────────────────────────────────────────────
export async function hashLogEntry(entry: object): Promise<string> {
  const str = JSON.stringify(entry);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    str
  );
  return hash;
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const RATE_LIMIT_KEY = 'badge_rate_limit';
const MAX_INTERACTIONS_PER_DAY = 3;

interface RateLimitRecord {
  badgeNumber: string;
  timestamps: string[];
}

export async function checkBadgeRateLimit(badgeNumber: string): Promise<{
  allowed: boolean;
  flagged: boolean;
  reason?: string;
}> {
  try {
    const raw = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    const records: RateLimitRecord[] = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const existing = records.find(r => r.badgeNumber === badgeNumber);

    if (!existing) {
      return { allowed: true, flagged: false };
    }

    // Filter to last 24 hours only
    const recentTimestamps = existing.timestamps.filter(
      t => new Date(t) > oneDayAgo
    );

    if (recentTimestamps.length >= MAX_INTERACTIONS_PER_DAY) {
      return {
        allowed: false,
        flagged: true,
        reason: `Badge ${badgeNumber} has been used ${recentTimestamps.length} times in the last 24 hours. This interaction has been flagged.`,
      };
    }

    return { allowed: true, flagged: false };
  } catch {
    return { allowed: true, flagged: false };
  }
}

export async function recordBadgeInteraction(badgeNumber: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    const records: RateLimitRecord[] = raw ? JSON.parse(raw) : [];

    const now = new Date().toISOString();
    const existing = records.find(r => r.badgeNumber === badgeNumber);

    if (existing) {
      existing.timestamps.push(now);
    } else {
      records.push({ badgeNumber, timestamps: [now] });
    }

    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Rate limit record error:', e);
  }
}

// ─── RECORDING LOCKOUT ────────────────────────────────────────────────────────
const RECORDING_LOCKOUT_KEY = 'recording_lockout';
const LOCKOUT_HOURS = 72;

export async function setRecordingLockout(interactionId: string): Promise<void> {
  const lockout = {
    interactionId,
    lockedUntil: new Date(
      Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000
    ).toISOString(),
  };
  await AsyncStorage.setItem(
    `${RECORDING_LOCKOUT_KEY}_${interactionId}`,
    JSON.stringify(lockout)
  );
}

export async function isRecordingLocked(interactionId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(
      `${RECORDING_LOCKOUT_KEY}_${interactionId}`
    );
    if (!raw) return false;
    const lockout = JSON.parse(raw);
    return new Date(lockout.lockedUntil) > new Date();
  } catch {
    return false;
  }
}
