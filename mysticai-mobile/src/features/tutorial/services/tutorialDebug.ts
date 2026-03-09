export function tutorialDebugLog(message: string, payload?: Record<string, unknown>): void {
  if (!__DEV__) {
    return;
  }

  if (payload) {
    console.debug(`[tutorial] ${message}`, payload);
    return;
  }

  console.debug(`[tutorial] ${message}`);
}
