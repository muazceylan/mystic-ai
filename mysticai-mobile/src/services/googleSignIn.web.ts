export function warmNativeGoogleSigninConfig(): void {
  // Web keeps using the existing AuthSession-based Google OAuth flow.
}

export async function signInWithNativeGoogle(): Promise<string | null> {
  return null;
}

export function isNativeGoogleSigninAvailable(): boolean {
  return false;
}

export function isNativeGoogleSigninConfigurationError(_error: unknown): boolean {
  return false;
}
