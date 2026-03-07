export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function isStrongPassword(value: string): boolean {
  return STRONG_PASSWORD_REGEX.test(value);
}
