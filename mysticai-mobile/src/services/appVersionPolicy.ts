/**
 * Pure app-update policy types and comparison rules.
 *
 * Kept free of React Native, Expo, and network imports so the decision logic can be reasoned
 * about (and tested) on its own. The network/native layer lives in `appVersionCheck.ts`.
 */

export type AppUpdateStatus = 'UP_TO_DATE' | 'OPTIONAL_UPDATE' | 'FORCE_UPDATE';

export interface AppVersionResponse {
  platform: string;
  status?: AppUpdateStatus;
  latestVersion: string;
  latestBuild?: number;
  minimumSupportedVersion?: string;
  minimumSupportedBuild?: number;
  forceUpdateEnabled?: boolean;
  optionalUpdateEnabled?: boolean;
  storeUrl?: string | null;
  title?: string | null;
  message: string | null;
  // Legacy contract — still returned by the backend for app builds shipped before
  // the build-number policy, and used as the local fallback below.
  forceUpdate: boolean;
  minSupportedVersion: string;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  androidWebStoreUrl: string | null;
}

/** Compares two semantic version strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 *  Missing segments are treated as 0: "1.0" equals "1.0.0". Never compare them as strings —
 *  "1.10.0" sorts before "1.9.0" lexicographically but is the newer release. */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map((p) => parseInt(p, 10) || 0);
  const bParts = b.split('.').map((p) => parseInt(p, 10) || 0);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

/** True when `installed` is behind `target`, preferring build numbers over semantic versions. */
export function isOlderThan(
  installedVersion: string,
  installedBuild: number | null,
  targetVersion: string | undefined,
  targetBuild: number | undefined,
): boolean {
  if (installedBuild != null && installedBuild >= 0 && targetBuild != null && targetBuild > 0) {
    return installedBuild < targetBuild;
  }
  if (targetVersion) {
    return compareVersions(installedVersion, targetVersion) < 0;
  }
  return false;
}

/**
 * Defensive client-side evaluation of the same policy the backend applies.
 *
 * The backend is authoritative — this only runs when a response predates the `status` field,
 * so an older backend deployment still produces a correct decision.
 */
export function evaluateStatusLocally(
  versionInfo: AppVersionResponse,
  installedVersion: string,
  installedBuild: number | null,
): AppUpdateStatus {
  const forceEnabled = versionInfo.forceUpdateEnabled ?? versionInfo.forceUpdate;
  const minVersion = versionInfo.minimumSupportedVersion ?? versionInfo.minSupportedVersion;

  if (
    forceEnabled &&
    isOlderThan(installedVersion, installedBuild, minVersion, versionInfo.minimumSupportedBuild)
  ) {
    return 'FORCE_UPDATE';
  }
  if (
    (versionInfo.optionalUpdateEnabled ?? false) &&
    isOlderThan(installedVersion, installedBuild, versionInfo.latestVersion, versionInfo.latestBuild)
  ) {
    return 'OPTIONAL_UPDATE';
  }
  return 'UP_TO_DATE';
}

/** Resolves the effective status: the server's decision wins, local evaluation is the fallback. */
export function resolveUpdateStatus(
  versionInfo: AppVersionResponse,
  installedVersion: string,
  installedBuild: number | null,
): AppUpdateStatus {
  return versionInfo.status ?? evaluateStatusLocally(versionInfo, installedVersion, installedBuild);
}
