/**
 * Recording Engine - Secure Stop Protect
 * Coordinates encounter recording: audio (expo-av), single officer photo
 * (expo-camera), both encrypted into the vault. Attorney calls pause audio
 * and write a timestamped privilege-gap marker (never call content).
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { saveDocument } from './secureDocumentStorage';
import { checkRecordingCompliance, RecordingLawResult } from './recordingLaws';

export interface PrivilegeGap {
  type: 'privilege_pause';
  pausedAt: string;
  resumedAt: string | null;
}

export interface EncounterSession {
  recordingActive: boolean;
  lawResult: RecordingLawResult | null;
  startedAt: string | null;
  gaps: PrivilegeGap[];
}

let recording: Audio.Recording | null = null;
let session: EncounterSession = {
  recordingActive: false,
  lawResult: null,
  startedAt: null,
  gaps: [],
};

export function resetSession(): void {
  recording = null;
  session = { recordingActive: false, lawResult: null, startedAt: null, gaps: [] };
}

export function getSession(): EncounterSession {
  return session;
}

export async function startEncounterRecording(
  latitude: number | null,
  longitude: number | null
): Promise<RecordingLawResult> {
  const lawResult = await checkRecordingCompliance(latitude, longitude);
  session.lawResult = lawResult;
  session.startedAt = new Date().toISOString();
  if (!lawResult.canRecord) {
    session.recordingActive = false;
    return lawResult;
  }
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      session.recordingActive = false;
      return lawResult;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;
    session.recordingActive = true;
  } catch (e) {
    console.error('[RecordingEngine] start error:', e);
    session.recordingActive = false;
  }
  return lawResult;
}

export async function captureOfficerPhoto(userId: string, cameraRef: any): Promise<boolean> {
  try {
    if (!cameraRef?.current) return false;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.base64) return false;
    await saveDocument(userId, {
      user_id: userId,
      doc_type: 'officer_photo',
      name: `Officer Photo ${new Date().toISOString()}`,
      image_base64: photo.base64,
    });
    return true;
  } catch (e) {
    console.error('[RecordingEngine] photo error:', e);
    return false;
  }
}

export async function pauseForPrivilegedCall(): Promise<void> {
  try {
    if (recording && session.recordingActive) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
  } catch (e) {
    console.error('[RecordingEngine] pause error:', e);
  } finally {
    session.recordingActive = false;
    session.gaps.push({ type: 'privilege_pause', pausedAt: new Date().toISOString(), resumedAt: null });
  }
}

export async function resumeAfterCall(): Promise<void> {
  const openGap = [...session.gaps].reverse().find((g) => g.resumedAt === null);
  if (openGap) openGap.resumedAt = new Date().toISOString();
  if (!session.lawResult?.canRecord) return;
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;
    session.recordingActive = true;
  } catch (e) {
    console.error('[RecordingEngine] resume error:', e);
  }
}

export async function stopAndSaveEncounter(
  userId: string
): Promise<{ saved: boolean; gaps: PrivilegeGap[]; lawStatus: string | null }> {
  let saved = false;
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recording = null;
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await saveDocument(userId, {
          user_id: userId,
          doc_type: 'encounter_audio',
          name: `Encounter Audio ${session.startedAt || new Date().toISOString()}`,
          image_base64: base64,
        });
        saved = true;
      }
    }
  } catch (e) {
    console.error('[RecordingEngine] stop/save error:', e);
  } finally {
    session.recordingActive = false;
  }
  return { saved, gaps: session.gaps, lawStatus: session.lawResult?.status || null };
}
