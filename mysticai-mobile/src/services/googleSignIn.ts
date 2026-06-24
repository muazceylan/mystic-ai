import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('./googleSignIn.native');

let cachedModule: GoogleSignInModule | null = null;

function getGoogleSignInModule(): GoogleSignInModule {
  if (cachedModule) {
    return cachedModule;
  }

  const resolvedModule: GoogleSignInModule = Platform.OS === 'web'
    ? require('./googleSignIn.web')
    : require('./googleSignIn.native');

  cachedModule = resolvedModule;
  return resolvedModule;
}

export function warmNativeGoogleSigninConfig(): void {
  return getGoogleSignInModule().warmNativeGoogleSigninConfig();
}

export function signInWithNativeGoogle(): Promise<string | null> {
  return getGoogleSignInModule().signInWithNativeGoogle();
}

export function isNativeGoogleSigninAvailable(): boolean {
  return getGoogleSignInModule().isNativeGoogleSigninAvailable();
}

export function isNativeGoogleSigninConfigurationError(error: unknown): boolean {
  return getGoogleSignInModule().isNativeGoogleSigninConfigurationError(error);
}
