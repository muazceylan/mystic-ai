import { NativeModules, Platform, TurboModuleRegistry, type TurboModule } from 'react-native';

const NATIVE_MODULE_NAME = 'RNGoogleSignin';
const GOOGLE_SIGNIN_SCOPES = ['profile', 'email'];
const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

type GoogleSigninResponse =
  | { type: 'success'; data: { idToken?: string | null } }
  | { type: 'cancelled'; data: null };

type GoogleSigninRuntimeModule = {
  GoogleSignin: {
    configure(options: {
      webClientId: string;
      offlineAccess: boolean;
      scopes: string[];
    }): void;
    hasPlayServices(options: { showPlayServicesUpdateDialog: boolean }): Promise<boolean>;
    signIn(): Promise<GoogleSigninResponse>;
    getTokens(): Promise<{ idToken: string; accessToken: string }>;
  };
  isCancelledResponse(response: GoogleSigninResponse): response is { type: 'cancelled'; data: null };
  isErrorWithCode(error: unknown): error is { code: string };
  statusCodes: {
    SIGN_IN_CANCELLED?: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
    NULL_PRESENTER?: string;
  };
};

class NativeGoogleSignInError extends Error {
  constructor(
    public readonly code: 'GOOGLE_SIGNIN_CONFIG_MISSING' | 'GOOGLE_SIGNIN_NATIVE_MODULE_UNAVAILABLE' | 'GOOGLE_SIGNIN_NO_ID_TOKEN',
    message: string,
  ) {
    super(message);
    this.name = 'NativeGoogleSignInError';
  }
}

let didConfigure = false;
let cachedModule: GoogleSigninRuntimeModule | null | undefined;
let didWarnUnavailable = false;

function warnUnavailable(reason: string, error?: unknown): void {
  if (!__DEV__ || didWarnUnavailable) return;
  didWarnUnavailable = true;

  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'unknown error';

  console.warn(
    `[Google Sign-In] Native module unavailable during ${reason}. ` +
      'Expo Go or a stale native build will trigger this fallback. ' +
      'Rebuild the native app with Expo prebuild/run or EAS before testing Google Sign-In.',
    detail,
  );
}

function hasNativeGoogleSigninModule(): boolean {
  const nativeModule =
    TurboModuleRegistry.get<TurboModule>(NATIVE_MODULE_NAME)
    ?? (NativeModules as Record<string, unknown>)[NATIVE_MODULE_NAME];

  return Boolean(nativeModule);
}

function loadGoogleSigninModule(reason = 'runtime access'): GoogleSigninRuntimeModule {
  if (cachedModule) {
    return cachedModule;
  }

  if (!hasNativeGoogleSigninModule()) {
    warnUnavailable(reason, `${NATIVE_MODULE_NAME} native module missing`);
    cachedModule = null;
    throw new NativeGoogleSignInError(
      'GOOGLE_SIGNIN_NATIVE_MODULE_UNAVAILABLE',
      'Google Sign-In native module is unavailable.',
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSigninRuntimeModule;
  } catch (error) {
    warnUnavailable(reason, error);
    cachedModule = null;
    throw new NativeGoogleSignInError(
      'GOOGLE_SIGNIN_NATIVE_MODULE_UNAVAILABLE',
      'Google Sign-In package could not be loaded.',
    );
  }

  return cachedModule;
}

function ensureGoogleSigninConfigured(): void {
  if (didConfigure) {
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new NativeGoogleSignInError(
      'GOOGLE_SIGNIN_CONFIG_MISSING',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured.',
    );
  }

  const { GoogleSignin } = loadGoogleSigninModule('configuration');
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: [...GOOGLE_SIGNIN_SCOPES],
  });
  didConfigure = true;
}

export function warmNativeGoogleSigninConfig(): void {
  try {
    ensureGoogleSigninConfigured();
  } catch (error) {
    if (
      __DEV__
      && error instanceof NativeGoogleSignInError
      && error.code === 'GOOGLE_SIGNIN_CONFIG_MISSING'
    ) {
      console.warn('[Google Sign-In] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }
  }
}

export async function signInWithNativeGoogle(): Promise<string | null> {
  try {
    ensureGoogleSigninConfigured();
    const { GoogleSignin, isCancelledResponse } = loadGoogleSigninModule('sign-in');

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const signInResult = await GoogleSignin.signIn();
    if (isCancelledResponse(signInResult)) {
      return null;
    }

    const tokens = await GoogleSignin.getTokens();
    const idToken = (tokens.idToken ?? signInResult.data.idToken ?? '').trim();

    if (!idToken) {
      throw new NativeGoogleSignInError(
        'GOOGLE_SIGNIN_NO_ID_TOKEN',
        'Google Sign-In completed without an ID token.',
      );
    }

    return idToken;
  } catch (error) {
    const googleSigninModule = cachedModule;

    if (
      googleSigninModule?.isErrorWithCode(error)
      && (
        error.code === googleSigninModule.statusCodes.SIGN_IN_CANCELLED
        || error.code === googleSigninModule.statusCodes.IN_PROGRESS
      )
    ) {
      return null;
    }

    throw error;
  }
}

export function isNativeGoogleSigninConfigurationError(error: unknown): boolean {
  return (
    error instanceof NativeGoogleSignInError
    && (
      error.code === 'GOOGLE_SIGNIN_CONFIG_MISSING'
      || error.code === 'GOOGLE_SIGNIN_NATIVE_MODULE_UNAVAILABLE'
    )
  );
}
