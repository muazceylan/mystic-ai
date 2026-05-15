import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
const GOOGLE_ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
const GOOGLE_IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();

export type GoogleAuthPromptResult = {
  type?: string;
  params?: Record<string, string | undefined>;
  authentication?: { idToken?: string | null } | null;
} | null;

type GooglePromptAsync = () => Promise<GoogleAuthPromptResult>;

export function isGoogleAuthSessionConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}

export function useGoogleIdTokenAuthRequest(): [GoogleAuthPromptResult, GooglePromptAsync] {
  if (!isGoogleAuthSessionConfigured()) {
    return [null, async () => null];
  }

  const redirectUri = makeRedirectUri({
    path: 'oauth2/callback',
    scheme: 'mystic-ai',
  });

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  return [
    response as GoogleAuthPromptResult,
    async () => (await promptAsync()) as GoogleAuthPromptResult,
  ];
}
