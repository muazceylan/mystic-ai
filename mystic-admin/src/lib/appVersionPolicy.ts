import type { AppUpdateStatus, AppVersionPolicyPayload } from '@/types';

/** Accepts 1, 1.2 and 1.2.3 with an optional -rc1 / +build suffix — mirrors the backend rule. */
const SEMVER_PATTERN = /^\d+(\.\d+){0,2}([-+][0-9A-Za-z.-]+)?$/;

export function isValidSemanticVersion(version: string | null | undefined): boolean {
  return typeof version === 'string' && SEMVER_PATTERN.test(version.trim());
}

/**
 * Compares two semantic versions numerically. Never compare them as strings:
 * "1.10.0" sorts before "1.9.0" lexicographically but is the newer release.
 */
export function compareSemanticVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const core = value.trim().split(/[-+]/)[0];
    const parts = core.split('.').map((p) => Number.parseInt(p, 10));
    return [0, 1, 2].map((i) => (Number.isFinite(parts[i]) ? Math.max(0, parts[i]) : 0));
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

export type AppVersionFieldErrors = Partial<Record<keyof AppVersionPolicyPayload, string>>;

/**
 * Client-side guardrails for the policy form. The backend re-validates everything —
 * this exists so the admin sees the problem before a save that could lock users out.
 */
export function validateAppVersionPolicy(
  payload: AppVersionPolicyPayload,
): AppVersionFieldErrors {
  const errors: AppVersionFieldErrors = {};

  if (!isValidSemanticVersion(payload.latestVersion)) {
    errors.latestVersion = 'Geçerli bir sürüm girin (ör. 1.2.0).';
  }
  if (!isValidSemanticVersion(payload.minimumSupportedVersion)) {
    errors.minimumSupportedVersion = 'Geçerli bir sürüm girin (ör. 1.1.0).';
  }

  if (!Number.isInteger(payload.latestBuild) || payload.latestBuild < 0) {
    errors.latestBuild = 'Build numarası 0 veya daha büyük bir tam sayı olmalı.';
  }
  if (!Number.isInteger(payload.minimumSupportedBuild) || payload.minimumSupportedBuild < 0) {
    errors.minimumSupportedBuild = 'Build numarası 0 veya daha büyük bir tam sayı olmalı.';
  }

  if (
    !errors.latestBuild &&
    !errors.minimumSupportedBuild &&
    payload.minimumSupportedBuild > payload.latestBuild
  ) {
    errors.minimumSupportedBuild = `Minimum desteklenen build (${payload.minimumSupportedBuild}), en son build'den (${payload.latestBuild}) büyük olamaz.`;
  }

  if (
    !errors.latestVersion &&
    !errors.minimumSupportedVersion &&
    compareSemanticVersions(payload.minimumSupportedVersion, payload.latestVersion) > 0
  ) {
    errors.minimumSupportedVersion = `Minimum desteklenen sürüm (${payload.minimumSupportedVersion}), en son sürümden (${payload.latestVersion}) yeni olamaz.`;
  }

  if (payload.forceUpdateEnabled && !payload.storeUrl?.trim()) {
    errors.storeUrl = 'Zorunlu güncelleme açıkken mağaza bağlantısı gerekli.';
  }

  return errors;
}

export function hasErrors(errors: AppVersionFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface UpdateBand {
  status: AppUpdateStatus;
  /** Human-readable build range this status applies to, e.g. "25-26". */
  range: string;
}

/**
 * Mirrors the backend decision so the admin can see the effect before saving.
 * Preview only — the backend stays authoritative for the real decision.
 */
export function previewStatusForBuild(
  payload: AppVersionPolicyPayload,
  installedBuild: number,
): AppUpdateStatus {
  if (payload.forceUpdateEnabled && installedBuild < payload.minimumSupportedBuild) {
    return 'FORCE_UPDATE';
  }
  if (payload.optionalUpdateEnabled && installedBuild < payload.latestBuild) {
    return 'OPTIONAL_UPDATE';
  }
  return 'UP_TO_DATE';
}

/** Collapses the build axis into the contiguous bands the admin actually cares about. */
export function buildUpdateBands(payload: AppVersionPolicyPayload): UpdateBand[] {
  const { latestBuild, minimumSupportedBuild, forceUpdateEnabled, optionalUpdateEnabled } = payload;
  if (!Number.isInteger(latestBuild) || !Number.isInteger(minimumSupportedBuild)) return [];

  const bands: UpdateBand[] = [{ status: 'UP_TO_DATE', range: `Build ${latestBuild} ve üzeri` }];

  const forceCeiling = forceUpdateEnabled ? minimumSupportedBuild : 0;

  if (optionalUpdateEnabled && latestBuild > forceCeiling) {
    const low = forceCeiling;
    const high = latestBuild - 1;
    bands.push({
      status: 'OPTIONAL_UPDATE',
      range: low === high ? `Build ${low}` : `Build ${low}-${high}`,
    });
  }

  if (forceUpdateEnabled && minimumSupportedBuild > 0) {
    bands.push({
      status: 'FORCE_UPDATE',
      range: `Build ${minimumSupportedBuild - 1} ve altı`,
    });
  }

  return bands;
}
