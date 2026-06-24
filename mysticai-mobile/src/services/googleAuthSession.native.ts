import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
const GOOGLE_ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
const GOOGLE_IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
const GOOGLE_IOS_REDIRECT_URI = buildIosRedirectUri(GOOGLE_IOS_CLIENT_ID);

export type GoogleAuthPromptResult = {
  type?: string;
  params?: Record<string, string | undefined>;
  authentication?: { idToken?: string | null } | null;
} | null;

type GooglePromptAsync = () => Promise<GoogleAuthPromptResult>;

function buildIosRedirectUri(clientId: string): string | undefined {
  const googleClientSuffix = '.apps.googleusercontent.com';
  if (!clientId.endsWith(googleClientSuffix)) return undefined;

  const reversedClientId = `com.googleusercontent.apps.${clientId.slice(0, -googleClientSuffix.length)}`;
  return `${reversedClientId}:/oauthredirect`;
}

export function isGoogleAuthSessionConfigured(): boolean {
  const nativeClientId = Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID;
  return Boolean(GOOGLE_WEB_CLIENT_ID && nativeClientId);
}

export function useGoogleIdTokenAuthRequest(): [GoogleAuthPromptResult, GooglePromptAsync] {
  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
    selectAccount: true,
  }, Platform.OS === 'ios' && GOOGLE_IOS_REDIRECT_URI ? { native: GOOGLE_IOS_REDIRECT_URI } : {});

  return [response as GoogleAuthPromptResult, promptAsync as GooglePromptAsync];
}
