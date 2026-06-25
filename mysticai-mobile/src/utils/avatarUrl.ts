import { envConfig } from '../config/env';

const AUTH_AVATAR_PATH = '/api/v1/auth/profile/avatar/';

export function normalizeAvatarUri(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const apiBase = envConfig.apiBaseUrl?.replace(/\/+$/, '') ?? null;
  if (!apiBase) return raw;

  if (raw.startsWith('/')) {
    return `${apiBase}${raw}`;
  }

  try {
    const parsed = new URL(raw);
    if (!parsed.pathname.startsWith(AUTH_AVATAR_PATH)) {
      return raw;
    }
    return `${apiBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw;
  }
}

export function resolveAvatarUri(
  primary: string | null | undefined,
  secondary?: string | null,
): string | null {
  return normalizeAvatarUri(primary) ?? normalizeAvatarUri(secondary);
}
