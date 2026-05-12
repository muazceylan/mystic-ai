type Primitive = string | number | boolean | null;
type Properties = Record<string, Primitive | undefined>;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const TOKEN_ASSIGNMENT_PATTERN = /\b((?:access|refresh|id)?[_ -]?token\s*[:=]\s*)[A-Za-z0-9._~+/=-]+\b/gi;
const MAX_STRING_LENGTH = 240;

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

export function sanitizeAmplitudeProperties(
  properties?: Properties,
): Record<string, Primitive> | undefined {
  if (!properties) {
    return undefined;
  }

  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, typeof value === 'string' ? sanitizeStringValue(value) : value]),
  ) as Record<string, Primitive>;
}
