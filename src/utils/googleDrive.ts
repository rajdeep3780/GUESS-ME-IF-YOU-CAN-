import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely to prevent duplicate initialization error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Track active listeners
const listeners = new Set<(user: User | null, token: string | null) => void>();

// Auth state observer
onAuthStateChanged(auth, async (user: User | null) => {
  if (!user) {
    cachedAccessToken = null;
  }
  // Notify all active listeners
  listeners.forEach(cb => cb(user, cachedAccessToken));
});

export const subscribeToAuth = (cb: (user: User | null, token: string | null) => void) => {
  listeners.add(cb);
  // Call immediately with current state
  cb(auth.currentUser, cachedAccessToken);
  return () => {
    listeners.delete(cb);
  };
};

export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from credentials.');
    }
    cachedAccessToken = credential.accessToken;
    
    // Notify subscribers
    listeners.forEach(cb => cb(result.user, cachedAccessToken));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive authentication failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  listeners.forEach(cb => cb(null, null));
};

export const getCachedToken = () => cachedAccessToken;

// --- GOOGLE DRIVE API CALLS ---

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

/**
 * Fetch files from the authenticated user's Google Drive
 */
export async function listDriveFiles(token: string): Promise<DriveFile[]> {
  try {
    const url = 'https://www.googleapis.com/drive/v3/files?pageSize=40&fields=files(id,name,mimeType,createdTime,size)&q=trashed=false';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Failed to list Drive files: ${response.status}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error('Error fetching Google Drive files:', err);
    throw err;
  }
}

/**
 * Save a match summary or scorecard to the user's Google Drive as a text file.
 * Uses a multipart upload to send both metadata and body text in a single request.
 */
export async function saveGameReportToDrive(
  token: string, 
  fileName: string, 
  content: string
): Promise<{ id: string; name: string }> {
  try {
    const metadata = {
      name: fileName,
      mimeType: 'text/plain',
      description: 'Game Report exported from Guess Me If You Can game app.'
    };

    const boundary = 'GUESS_ME_MULTIPART_BOUNDARY';
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      content,
      `--${boundary}--`
    ].join('\r\n');

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Failed to export game report: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error uploading file to Google Drive:', err);
    throw err;
  }
}
