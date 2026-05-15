import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const FIREBASE_API_KEY = (process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '').trim();
const FIREBASE_AUTH_DOMAIN = (process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '').trim();
const FIREBASE_PROJECT_ID = (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
const FIREBASE_APP_ID = (process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '').trim();

export type GoogleAuthPromptResult = {
  type?: string;
  params?: Record<string, string | undefined>;
  authentication?: { idToken?: string | null } | null;
} | null;

type GooglePromptAsync = () => Promise<GoogleAuthPromptResult>;

function getFirebaseAuth() {
  const existing = getApps().find(app => app.name === '[DEFAULT]');
  const app = existing ?? initializeApp({
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    appId: FIREBASE_APP_ID,
  });
  return getAuth(app);
}

export function isGoogleAuthSessionConfigured(): boolean {
  return Boolean(FIREBASE_API_KEY && FIREBASE_AUTH_DOMAIN && FIREBASE_PROJECT_ID && FIREBASE_APP_ID);
}

export function useGoogleIdTokenAuthRequest(): [GoogleAuthPromptResult, GooglePromptAsync] {
  const promptAsync: GooglePromptAsync = async () => {
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      if (__DEV__) {
        console.log('[GoogleAuth] signInWithPopup result:', {
          userId: result.user?.uid,
          email: result.user?.email,
          credentialPresent: !!credential,
          idTokenPresent: !!idToken,
          idTokenAudience: idToken ? JSON.parse(atob(idToken.split('.')[1]))?.aud : null,
        });
      }

      if (!idToken) {
        throw new Error('Google Sign-In completed but no ID token received from credential.');
      }

      return {
        type: 'success',
        params: { id_token: idToken },
        authentication: { idToken },
      };
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        return { type: 'cancel' };
      }
      throw error;
    }
  };

  return [null, promptAsync];
}
