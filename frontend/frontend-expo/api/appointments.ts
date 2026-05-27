import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db, checkProcessingServiceHealth } from './firebase';
import { analyticsEvents } from './analytics';

const API_URL_PROCESSING = process.env.EXPO_PUBLIC_API_PROCESSING_URL;

// =============================================================================
// Safe date conversion — handles Firestore Timestamps, Dates, strings, and
// plain objects with seconds/nanoseconds (serialised Timestamps).
// =============================================================================

function safeToISOString(value: any): string {
  if (!value) return new Date().toISOString();

  // Firestore Timestamp (has .toDate())
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  // Already a Date object
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Serialised Timestamp: { seconds: number, nanoseconds: number }
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }

  // ISO string or any other string parseable by Date
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Number (epoch millis)
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

function safeToDate(value: any): Date {
  if (!value) return new Date();
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof value === 'number') return new Date(value);
  return new Date();
}

// =============================================================================
// Session ID — groups all requests from a single user-initiated flow
// =============================================================================

/**
 * Generate a new session ID (UUID v4).
 * Call this once per user-initiated action (e.g. starting a recording session,
 * uploading a file, etc.) and pass the returned value to every subsequent API
 * call in that flow so the backend can correlate them in Cloud Trace / Logging.
 */
export function generateSessionId(): string {
  // crypto.randomUUID() is available in modern environments
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Auth helpers (internal)
// =============================================================================

async function getAuthHeaders(sessionId?: string): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  return headers;
}

async function getAuthFormHeaders(sessionId?: string): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  return headers;
}

// =============================================================================
// Types — Schema v1.2 (legacy)
// =============================================================================

export interface ProcessedSummaryV12 {
  summary?: string;
  reason_for_visit?: Array<{
    reason: string;
    description: string;
  }>;
  diagnosis?: {
    details: Array<{
      title: string;
      description: string;
      severity?: 'high' | 'medium' | 'low';
    }>;
  };
  todos?: Array<{
    type: string;
    title: string;
    description: string;
    recommended: boolean;
    verified: boolean;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    timeframe?: string;
  }>;
  follow_up?: Array<{
    description: string;
    time_frame: string;
  }>;
  learnings?: Array<{
    title: string;
    description: string;
  }>;
}

// =============================================================================
// Types — Schema v1.3
// =============================================================================

export interface ProcessedSummaryV13 {
  version: '1.3';
  summary?: string;
  reason_for_visit?: Array<{
    reason: string;
    description: string;
  }>;
  diagnosis?: {
    details: Array<{
      title: string;
      description: string;
      severity?: 'high' | 'medium' | 'low';
    }>;
  };
  tests?: Array<{
    title: string;
    description: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  medications?: Array<{
    title: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
    importance: 'high' | 'low';
    source?: string;
    change?: boolean;
  }>;
  procedures?: Array<{
    title: string;
    description: string;
    timeframe?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  other?: Array<{
    title: string;
    description: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  follow_up?: Array<{
    description: string;
    time_frame: string;
  }>;
  why_recommended?: string;
  risks_side_effects?: Array<{
    title: string;
    description: string;
    source?: string;
    importance: 'high' | 'low';
  }>;
  action_todo?: Array<{
    title: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
}

// =============================================================================
// Types — Schema v1.4
// =============================================================================

export interface ProcessedSummaryV14 {
  version: '1.4';
  summary?: string;
  reason_for_visit?: Array<{
    reason: string;
    description: string;
  }>;
  diagnosis?: {
    details: Array<{
      title: string;
      description: string;
      severity?: 'high' | 'medium' | 'low';
    }>;
  };
  tests?: Array<{
    title: string;
    description: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  medications?: Array<{
    title: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
    importance: 'high' | 'low';
    source?: string;
    change?: boolean;
  }>;
  procedures?: Array<{
    title: string;
    description: string;
    timeframe?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  other?: Array<{
    title: string;
    description: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  follow_up?: Array<{
    description: string;
    time_frame: string;
  }>;
  why_recommended?: string;
  risks_side_effects?: Array<{
    title: string;
    description: string;
    source?: string;
    importance: 'high' | 'low';
  }>;
  action_todo?: Array<{
    title: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  questions?: Array<{
    question1?: string;
    question2?: string;
    question3?: string;
  }>;
}

// =============================================================================
// Combined types
// =============================================================================

export type ProcessedSummary = ProcessedSummaryV12 | ProcessedSummaryV13 | ProcessedSummaryV14;

/** Type guard: returns true when the summary follows the v1.3 schema. */
export function isV13Summary(ps: ProcessedSummary | undefined | null): ps is ProcessedSummaryV13 {
  return !!ps && (ps as ProcessedSummaryV13).version === '1.3';
}

/** Type guard: returns true when the summary follows the v1.4 schema. */
export function isV14Summary(ps: ProcessedSummary | undefined | null): ps is ProcessedSummaryV14 {
  return !!ps && (ps as ProcessedSummaryV14).version === '1.4';
}

export interface Appointment {
  status: 'InProgress' | 'Completed' | 'Error';
  appointmentDate: string;
  title?: string;
  doctor?: string;
  location?: string;
  processedSummary?: ProcessedSummary;
  rawTranscript?: string;
  recordingLink?: string;
  error?: string;
}

export interface AppointmentWithId extends Appointment {
  appointmentId: string;
}

// =============================================================================
// Appointments API
// =============================================================================

export async function startAppointment(): Promise<{ appointmentId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    const appointmentsRef = collection(db, 'users', user.uid, 'appointments');
    const appointmentRef = doc(appointmentsRef);
    const appointmentId = appointmentRef.id;

    await setDoc(appointmentRef, {
      status: 'InProgress' as const,
      appointmentDate: Timestamp.fromDate(new Date()),
      createdDate: Timestamp.fromDate(new Date()),
    });

    return { appointmentId };
  } catch (error) {
    console.error('Failed to create appointment:', error);
    throw new Error('Failed to start appointment');
  }
}

/**
 * Helper: append an audio file to FormData from a URI string or Blob.
 * On web, blob: URLs are fetched to obtain an actual Blob.
 * On native (React Native), the { uri, type, name } convention is used.
 */
async function appendAudioToFormData(
  formData: FormData,
  fieldName: string,
  audio: string | Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (audio instanceof Blob) {
    formData.append(fieldName, audio, fileName);
  } else if (Platform.OS === 'web' && audio.startsWith('blob:')) {
    // Web: blob URL → fetch actual Blob
    const resp = await fetch(audio);
    const blob = await resp.blob();
    formData.append(fieldName, blob, fileName);
  } else {
    // React Native file URI
    formData.append(fieldName, {
      uri: audio,
      type: mimeType,
      name: fileName,
    } as any);
  }
}

/**
 * Upload an audio chunk.
 * Accepts a file URI string (React Native), a blob URL (web), or a Blob.
 */
export async function uploadAudioChunk(
  appointmentId: string,
  audioChunk: string | Blob,
  sessionId?: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');

  const isHealthy = await checkProcessingServiceHealth();
  if (!isHealthy) {
    throw new Error('Service is currently unavailable. Please try again later.');
  }

  try {
    const token = await user.getIdToken();
    const formData = new FormData();

    // Choose extension/mime based on platform
    const isWeb = Platform.OS === 'web';
    const chunkName = isWeb ? 'chunk.webm' : 'chunk.m4a';
    const chunkMime = isWeb ? 'audio/webm' : 'audio/m4a';

    await appendAudioToFormData(formData, 'audioChunk', audioChunk, chunkName, chunkMime);

    const fetchHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (sessionId) fetchHeaders['X-Session-Id'] = sessionId;

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/audio-chunks`,
      {
        method: 'POST',
        headers: fetchHeaders,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload audio chunk error:', errorText);
      throw new Error(`Failed to upload audio chunk: ${response.statusText}`);
    }
  } catch (err) {
    console.error('❌ Failed to upload audio chunk:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to upload audio chunk');
  }
}

export async function generateQuestions(
  appointmentId: string,
  sessionId?: string,
): Promise<{ questions: string[] }> {
  const isHealthy = await checkProcessingServiceHealth();
  if (!isHealthy) {
    throw new Error('Service is currently unavailable. Please try again later.');
  }

  const headers = await getAuthHeaders(sessionId);
  const response = await fetch(
    `${API_URL_PROCESSING}/appointments/${appointmentId}/generate-questions`,
    { method: 'POST', headers },
  );

  if (!response.ok) {
    // Try to extract the actual error message from the backend response
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch (_) {
      // Ignore JSON parse errors; fall back to statusText
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function finalizeAppointment(
  appointmentId: string,
  fullAudioUri: string | null,
): Promise<{ soapNotes: any }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');

  try {
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      try {
        const ref = doc(db, 'users', user.uid, 'appointments', appointmentId);
        await updateDoc(ref, { status: 'Error', error: 'Service unavailable' });
      } catch (_) {}
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    const token = await user.getIdToken();
    const formData = new FormData();

    if (fullAudioUri) {
      const isWeb = Platform.OS === 'web';
      const audioName = isWeb ? 'recording.webm' : 'recording.m4a';
      const audioMime = isWeb ? 'audio/webm' : 'audio/m4a';
      await appendAudioToFormData(formData, 'fullAudio', fullAudioUri, audioName, audioMime);
    }

    analyticsEvents.finalizeAppointment(appointmentId);

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/finalize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.json().catch(() => response.statusText);
      const errorMessage =
        errorText && typeof errorText === 'object' && 'error' in errorText
          ? errorText.error
          : response.statusText;
      throw new Error(`Failed to finalize appointment: ${errorMessage}`);
    }

    return response.json();
  } catch (err) {
    console.error('❌ Failed to finalize appointment:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to finalize recording';

    try {
      const ref = doc(db, 'users', user.uid, 'appointments', appointmentId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.status !== 'Error') {
        await updateDoc(ref, { status: 'Error', error: errorMsg });
      }
    } catch (_) {}

    throw new Error(errorMsg);
  }
}

// =============================================================================
// Fetch / Query helpers
// =============================================================================

/** Fetch all appointments for the current user from Firestore. */
export async function fetchAppointments(): Promise<AppointmentWithId[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    const appointmentsRef = collection(db, 'users', user.uid, 'appointments');
    const querySnapshot = await getDocs(appointmentsRef);
    const appointments: AppointmentWithId[] = [];
    const currentTime = new Date();

    querySnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data();

        if (!data.appointmentDate) {
          console.warn(`⚠️ Skipping appointment ${docSnap.id} - missing required fields`);
          return;
        }

        // Mark stale InProgress appointments as Error
        if (data.status === 'InProgress' && data.createdDate) {
          const createdDate = safeToDate(data.createdDate);
          const timeDifferenceMs = currentTime.getTime() - createdDate.getTime();
          const oneHourInMs = 60 * 60 * 1000;

          if (timeDifferenceMs > oneHourInMs) {
            const appointmentRef = doc(db, 'users', user.uid, 'appointments', docSnap.id);
            updateDoc(appointmentRef, {
              status: 'Error',
              error: 'Appointment exceeded 1 hour in InProgress state',
            }).catch((updateErr) => {
              console.error(`❌ Failed to update appointment ${docSnap.id} to Error:`, updateErr);
            });

            appointments.push({
              appointmentId: docSnap.id,
              status: 'Error',
              appointmentDate: safeToISOString(data.appointmentDate),
              title: data.title,
              doctor: data.doctor,
              location: data.location,
              processedSummary: data.processedSummary,
              rawTranscript: data.rawTranscript,
              recordingLink: data.recordingLink,
              error: data.error || 'Appointment exceeded 1 hour in InProgress state',
            });
            return;
          }
        }

        appointments.push({
          appointmentId: docSnap.id,
          status: data.status || 'InProgress',
          appointmentDate: safeToISOString(data.appointmentDate),
          title: data.title,
          doctor: data.doctor,
          location: data.location,
          processedSummary: data.processedSummary,
          rawTranscript: data.rawTranscript,
          recordingLink: data.recordingLink,
          error: data.error,
        });
      } catch (docErr) {
        console.error(`❌ Failed to process appointment ${docSnap.id}:`, docErr);
      }
    });

    appointments.sort(
      (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime(),
    );

    return appointments;
  } catch (err) {
    console.error('❌ Failed to fetch appointments:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to load appointments');
  }
}

/** Get a single appointment by ID from Firestore. */
export async function getSingleAppointment(
  appointmentId: string,
): Promise<AppointmentWithId | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');

  try {
    const appointmentRef = doc(db, 'users', user.uid, 'appointments', appointmentId);
    const docSnap = await getDoc(appointmentRef);

    if (!docSnap.exists()) {
      console.warn(`⚠️ Appointment ${appointmentId} not found`);
      return null;
    }

    const data = docSnap.data();

    if (!data.appointmentDate) {
      throw new Error('Appointment data is incomplete');
    }

    return {
      appointmentId,
      status: data.status || 'InProgress',
      appointmentDate: safeToISOString(data.appointmentDate),
      title: data.title,
      doctor: data.doctor,
      location: data.location,
      processedSummary: data.processedSummary,
      rawTranscript: data.rawTranscript,
      recordingLink: data.recordingLink,
      error: data.error,
    };
  } catch (err) {
    console.error('❌ Failed to fetch appointment:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to load appointment');
  }
}

/** Delete an appointment from Firestore and the processing backend. */
export async function deleteAppointment(appointmentId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    const appointmentRef = doc(db, 'users', user.uid, 'appointments', appointmentId);
    const docSnap = await getDoc(appointmentRef);

    if (!docSnap.exists()) {
      throw new Error('Appointment not found');
    }

    await deleteDoc(appointmentRef);

    // Best-effort delete from processing backend
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL_PROCESSING}/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {
      // Ignore backend errors – Firestore doc is already deleted
    }
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    throw new Error('Failed to delete appointment');
  }
}

/** Update appointment metadata (title, doctor, location, date). */
export async function updateAppointmentMetadata(
  appointmentId: string,
  metadata: {
    title?: string;
    doctor?: string;
    location?: string;
    appointmentDate?: Date;
  },
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    const appointmentRef = doc(db, 'users', user.uid, 'appointments', appointmentId);
    const docSnap = await getDoc(appointmentRef);

    if (!docSnap.exists()) {
      throw new Error('Appointment not found');
    }

    const updates: any = {};
    if (metadata.title !== undefined) updates.title = metadata.title;
    if (metadata.doctor !== undefined) updates.doctor = metadata.doctor;
    if (metadata.location !== undefined) updates.location = metadata.location;
    if (metadata.appointmentDate) {
      updates.appointmentDate = Timestamp.fromDate(metadata.appointmentDate);
    }

    await updateDoc(appointmentRef, updates);
  } catch (error) {
    console.error('Failed to update appointment metadata:', error);
    throw new Error('Failed to update appointment metadata');
  }
}

/** Upload a recording file to GCS only (no processing). For explain-my-appointment flow. */
export async function uploadRecordingNew(
  appointmentId: string,
  file: { uri: string; name: string; mimeType?: string; size?: number },
  sessionId?: string,
): Promise<{ recordingGcsUri: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');
  if (!file || !file.uri) throw new Error('Invalid recording file');

  try {
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    const token = await user.getIdToken();
    const formData = new FormData();

    const isWebBlob = file.uri.startsWith('blob:');
    if (isWebBlob) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('recording', blob, file.name);
    } else {
      const mimeType = file.mimeType || 'audio/m4a';
      formData.append('recording', {
        uri: file.uri,
        name: file.name,
        type: mimeType,
      } as any);
    }

    analyticsEvents.uploadRecording(appointmentId, file.size);

    const uploadHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (sessionId) uploadHeaders['X-Session-Id'] = sessionId;

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/upload-recording-new`,
      {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload recording (new) error:', errorText);
      throw new Error(`Failed to upload recording: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    console.error('❌ Failed to upload recording (new):', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to upload recording');
  }
}

/** Upload a pre-recorded audio file for processing. */
export async function uploadRecording(
  appointmentId: string,
  file: { uri: string; name: string; mimeType?: string; size?: number },
): Promise<{ status: string; soapNotes: any; recordingLink: string }> {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error('User not authenticated');
    console.error('❌ Failed to upload recording:', error);
    throw error;
  }

  if (!appointmentId) {
    const error = new Error('Invalid appointment ID');
    console.error('❌ Failed to upload recording:', error);
    throw error;
  }

  if (!file || !file.uri) {
    const error = new Error('Invalid recording file');
    console.error('❌ Failed to upload recording:', error);
    throw error;
  }

  try {
    // Check service health before uploading recording
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      const error = new Error('Service is currently unavailable. Please try again later.');
      console.error('❌ Failed to upload recording:', error);
      
      // Set appointment status to error in Firestore
      try {
        const appointmentRef = doc(db, 'users', user.uid, 'appointments', appointmentId);
        await updateDoc(appointmentRef, {
          status: 'Error',
          error: 'Service unavailable'
        });
      } catch (updateErr) {
        console.error('❌ Failed to update appointment status to Error:', updateErr);
      }
      
      throw error;
    }

    const token = await user.getIdToken();
    const formData = new FormData();

    // Check if running on web (blob: URL) or native (file:// URI)
    const isWebBlob = file.uri.startsWith('blob:');
    
    if (isWebBlob) {
      // Web platform: fetch the blob and append as File
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('recording', blob, file.name);
    } else {
      // React Native: use { uri, name, type } format
      const mimeType = file.mimeType || 'audio/m4a';
      formData.append('recording', {
        uri: file.uri,
        name: file.name,
        type: mimeType,
      } as any);
    }

    // Log analytics event for uploading recording
    analyticsEvents.uploadRecording(appointmentId, file.size);

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/upload-recording`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload recording error:', errorText);
      throw new Error(`Failed to upload recording: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    console.error('❌ Failed to upload recording:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to upload recording';

    // Set appointment status to error in Firestore if not already done
    try {
      const appointmentRef = doc(db, 'users', user.uid, 'appointments', appointmentId);
      const docSnap = await getDoc(appointmentRef);
      
      // Only update if status is not already Error
      if (docSnap.exists() && docSnap.data()?.status !== 'Error') {
        await updateDoc(appointmentRef, {
          status: 'Error',
          error: errorMsg
        });
      }
    } catch (updateErr) {
      console.error('❌ Failed to update appointment status to Error:', updateErr);
    }

    throw new Error(errorMsg);
  }
}

/** Upload a document (PDF) for processing. */
export async function uploadDocument(
  appointmentId: string,
  file: { uri: string; name: string; mimeType?: string; size?: number },
  sessionId?: string,
): Promise<{ documentGcsUri: string; documentCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');
  if (!file || !file.uri) throw new Error('Invalid document file');

  try {
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    const token = await user.getIdToken();
    const formData = new FormData();

    const isWebBlob = file.uri.startsWith('blob:');
    if (isWebBlob) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('document', blob, file.name);
    } else {
      const mimeType = file.mimeType || 'application/pdf';
      formData.append('document', {
        uri: file.uri,
        name: file.name,
        type: mimeType,
      } as any);
    }

    const docHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (sessionId) docHeaders['X-Session-Id'] = sessionId;

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/upload-document`,
      {
        method: 'POST',
        headers: docHeaders,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload document error:', errorText);
      throw new Error(`Failed to upload document: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    console.error('❌ Failed to upload document:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to upload document');
  }
}

/** Upload plain text notes to an appointment. */
export async function uploadNotes(
  appointmentId: string,
  notes: string,
  sessionId?: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');
  if (!notes.trim()) throw new Error('No notes provided');

  try {
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('notes', notes.trim());

    const notesHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (sessionId) notesHeaders['X-Session-Id'] = sessionId;

    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/upload-notes`,
      {
        method: 'POST',
        headers: notesHeaders,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload notes error:', errorText);
      throw new Error(`Failed to upload notes: ${response.statusText}`);
    }
  } catch (err) {
    console.error('❌ Failed to upload notes:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to upload notes');
  }
}

/** Process an appointment (transcribe + extract + SOAP). */
export async function processAppointment(
  appointmentId: string,
  sessionId?: string,
): Promise<{ soapNotes: any; status: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  if (!appointmentId) throw new Error('Invalid appointment ID');

  try {
    const isHealthy = await checkProcessingServiceHealth();
    if (!isHealthy) {
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    const headers = await getAuthHeaders(sessionId);
    const response = await fetch(
      `${API_URL_PROCESSING}/appointments/${appointmentId}/process`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Process appointment error:', errorText);
      throw new Error(`Failed to process appointment: ${response.statusText}`);
    }

    return response.json();
  } catch (err) {
    console.error('❌ Failed to process appointment:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to process appointment';

    try {
      const ref = doc(db, 'users', user.uid, 'appointments', appointmentId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.status !== 'Error') {
        await updateDoc(ref, { status: 'Error', error: errorMsg });
      }
    } catch (_) {}

    throw new Error(errorMsg);
  }
}

/** Listen to InProgress appointments in real-time via Firestore onSnapshot. */
export function listenToInProgressAppointments(
  onUpdate: (appointments: AppointmentWithId[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error('User not authenticated');
    if (onError) onError(error);
    return () => {};
  }

  try {
    const appointmentsRef = collection(db, 'users', user.uid, 'appointments');
    const q = query(appointmentsRef, where('status', '==', 'InProgress'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointments: AppointmentWithId[] = [];

        snapshot.forEach((docSnap) => {
          try {
            const data = docSnap.data();
            if (!data.appointmentDate) return;

            appointments.push({
              appointmentId: docSnap.id,
              status: data.status || 'InProgress',
              appointmentDate: safeToISOString(data.appointmentDate),
              title: data.title,
              doctor: data.doctor,
              location: data.location,
              processedSummary: data.processedSummary,
              rawTranscript: data.rawTranscript,
              recordingLink: data.recordingLink,
              error: data.error,
            });
          } catch (docErr) {
            console.error(`❌ Failed to process appointment ${docSnap.id}:`, docErr);
          }
        });

        appointments.sort(
          (a, b) =>
            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime(),
        );

        onUpdate(appointments);
      },
      (error) => {
        console.error('❌ Listener error:', error);
        if (onError) onError(error as Error);
      },
    );

    return unsubscribe;
  } catch (err) {
    console.error('❌ Failed to setup listener:', err);
    if (onError) onError(err instanceof Error ? err : new Error('Failed to setup listener'));
    return () => {};
  }
}
