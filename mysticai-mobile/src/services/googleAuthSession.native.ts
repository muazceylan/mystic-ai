export type GoogleAuthPromptResult = null;

type GooglePromptAsync = () => Promise<GoogleAuthPromptResult>;

export function isGoogleAuthSessionConfigured(): boolean {
  return false;
}

export function useGoogleIdTokenAuthRequest(): [GoogleAuthPromptResult, GooglePromptAsync] {
  return [null, async () => null];
}
