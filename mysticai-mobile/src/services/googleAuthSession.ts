import { Platform } from 'react-native';

export type { GoogleAuthPromptResult } from './googleAuthSession.native';

type GoogleAuthSessionModule = typeof import('./googleAuthSession.native');

let cachedModule: GoogleAuthSessionModule | null = null;

function getGoogleAuthSessionModule(): GoogleAuthSessionModule {
  if (cachedModule) {
    return cachedModule;
  }

  const resolvedModule: GoogleAuthSessionModule = Platform.OS === 'web'
    ? require('./googleAuthSession.web')
    : require('./googleAuthSession.native');

  cachedModule = resolvedModule;
  return resolvedModule;
}

export function isGoogleAuthSessionConfigured(): boolean {
  return getGoogleAuthSessionModule().isGoogleAuthSessionConfigured();
}

export function useGoogleIdTokenAuthRequest(): ReturnType<GoogleAuthSessionModule['useGoogleIdTokenAuthRequest']> {
  return getGoogleAuthSessionModule().useGoogleIdTokenAuthRequest();
}
