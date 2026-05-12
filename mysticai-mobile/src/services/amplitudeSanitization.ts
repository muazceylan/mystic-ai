export type AmplitudePrimitive = string | number | boolean | null;
export type AmplitudeProperties = Record<string, AmplitudePrimitive | undefined>;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const TOKEN_ASSIGNMENT_PATTERN = /\b((?:access|refresh|id)?[_ -]?token\s*[:=]\s*)[A-Za-z0-9._~+/=-]+\b/gi;
const MAX_STRING_LENGTH = 240;

const BLOCKED_PROPERTY_KEYS = new Set([
  'email',
  'birth date',
  'birthdate',
  'full birth date',
  'raw birth date',
  'birth place',
  'birthplace',
  'raw birth place',
  'birth location',
  'birth city',
  'birth country',
  'token',
  'access token',
  'refresh token',
  'id token',
  'auth token',
  'authorization',
  'backend stacktrace',
  'stacktrace',
  'stack trace',
  'server stacktrace',
  'error stack',
]);

function normalizePropertyKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function shouldDropPropertyKey(key: string): boolean {
  const normalized = normalizePropertyKey(key);
  return !normalized || BLOCKED_PROPERTY_KEYS.has(normalized);
}

function sanitizeStringValue(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  const redacted = collapsed
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted-token]')
    .replace(TOKEN_ASSIGNMENT_PATTERN, '$1[redacted-token]')
    .replace(JWT_PATTERN, '[redacted-token]');

  if (redacted.length <= MAX_STRING_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_STRING_LENGTH - 3)}...`;
}

export function sanitizeAmplitudeErrorMessage(value: unknown): string {
  const firstLine = String(value ?? 'Unknown error').split(/\r?\n/, 1)[0] ?? '';
  const strippedFrame = firstLine.replace(/\s+at\s.+$/, '').trim();
  const sanitized = sanitizeStringValue(strippedFrame);
  return sanitized || 'Unknown error';
}

export function sanitizeAmplitudeContextPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'unknown';
  }

  try {
    const parsed = new URL(trimmed, 'https://astroguru.local');
    return sanitizeStringValue(parsed.pathname || '/');
  } catch {
    const withoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
    return sanitizeStringValue(withoutQuery || 'unknown');
  }
}

export function sanitizeAmplitudeProperties(
  properties?: AmplitudeProperties,
): Record<string, AmplitudePrimitive> | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitizedEntries: Array<[string, AmplitudePrimitive]> = [];

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || shouldDropPropertyKey(key)) {
      continue;
    }

    if (typeof value === 'string') {
      const sanitized =
        normalizePropertyKey(key) === 'error message'
          ? sanitizeAmplitudeErrorMessage(value)
          : sanitizeStringValue(value);
      sanitizedEntries.push([key, sanitized]);
      continue;
    }

    sanitizedEntries.push([key, value]);
  }

  if (sanitizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(sanitizedEntries);
}
