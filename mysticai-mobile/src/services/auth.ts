import api from './api';
import { AuthUser } from '../store/useAuthStore';

const AUTH_BASE = '/api/v1/auth';

export interface OnboardingRegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string;
  birthCountry?: string;
  birthCity?: string;
  birthTimeUnknown?: boolean;
  timezone?: string;
  gender?: string;
  maritalStatus?: string;
  focusPoint?: string;
  zodiacSign?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterResponse {
  status: 'PENDING_VERIFICATION' | string;
}

export interface CheckEmailResponse {
  available: boolean;
  message?: string;
}

export interface SocialLoginResponse extends LoginResponse {
  isNewUser: boolean;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string;
  birthCountry?: string;
  birthCity?: string;
  birthTimeUnknown?: boolean;
  timezone?: string;
  gender?: string;
  maritalStatus?: string;
  focusPoint?: string;
  zodiacSign?: string;
  preferredLanguage?: string;
}

export const register = (email: string, password: string, name?: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const nameParts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = nameParts.length > 0 ? nameParts[0] : undefined;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

  return api.post<RegisterResponse>(`${AUTH_BASE}/register`, {
    username: normalizedEmail,
    email: normalizedEmail,
    password,
    firstName,
    lastName,
  });
};

export const registerOnboarding = (payload: OnboardingRegisterPayload) =>
  api.post<RegisterResponse>(`${AUTH_BASE}/register`, payload);

export const login = (payload: { username: string; password: string }) =>
  api.post<LoginResponse>(`${AUTH_BASE}/login`, payload);

export const checkEmail = (email: string) =>
  api.post<CheckEmailResponse>(`${AUTH_BASE}/check-email`, { email });

export const checkEmailGet = (email: string) =>
  api.get<CheckEmailResponse>(`${AUTH_BASE}/check-email`, { params: { email } });

export const socialLogin = (provider: string, idToken: string) =>
  api.post<SocialLoginResponse>(`${AUTH_BASE}/social-login`, { provider, idToken });

export const resendVerification = (email: string) =>
  api.post<{ ok: boolean }>(`${AUTH_BASE}/verification/resend`, { email: email.trim().toLowerCase() });

export const forgotPassword = (email: string) =>
  api.post<{ ok: boolean }>(`${AUTH_BASE}/password/forgot`, { email: email.trim().toLowerCase() });

export const updateProfile = (payload: UpdateProfilePayload) =>
  api.put<AuthUser>(`${AUTH_BASE}/profile`, payload);

function guessImageMimeType(fileName?: string, fallback = 'image/jpeg'): string {
  if (!fileName) return fallback;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}

export const uploadProfileAvatar = (
  avatarUri: string,
  fileName = 'avatar.jpg',
  mimeType?: string | null,
) => {
  const formData = new FormData();
  const resolvedFileName = fileName.trim() || 'avatar.jpg';
  const resolvedMimeType = (mimeType ?? '').trim() || guessImageMimeType(resolvedFileName);

  formData.append('avatar', {
    uri: avatarUri,
    name: resolvedFileName,
    type: resolvedMimeType,
  } as any);

  return api.post<AuthUser>(`${AUTH_BASE}/profile/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const removeProfileAvatar = () =>
  api.delete<AuthUser>(`${AUTH_BASE}/profile/avatar`);

export interface SetPasswordPayload {
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const setPassword = (payload: SetPasswordPayload) =>
  api.post<AuthUser>(`${AUTH_BASE}/set-password`, payload);

export const changePassword = (payload: ChangePasswordPayload) =>
  api.post<AuthUser>(`${AUTH_BASE}/change-password`, payload);

// ─── Quick Start (Guest Session) ─────────────────────────────────────────────

/** Creates a temporary anonymous guest session. No credentials needed. */
export const quickStart = () =>
  api.post<LoginResponse>(`${AUTH_BASE}/quick-start`);

// ─── Account Linking (Guest → Registered) ────────────────────────────────────

export interface LinkAccountSocialPayload {
  provider: string;
  idToken: string;
}

export interface LinkAccountEmailPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LinkAccountVerifyOtpPayload {
  email: string;
  code: string;
}

/** Links a guest account to a social provider (Google / Apple). Returns refreshed tokens. */
export const linkAccountWithSocial = (payload: LinkAccountSocialPayload) =>
  api.post<LoginResponse>(`${AUTH_BASE}/link-account/social`, payload);

/** Step 1: sends OTP to email. Returns { ok: true } on success. */
export const linkAccountWithEmail = (payload: LinkAccountEmailPayload) =>
  api.post<{ ok: boolean }>(`${AUTH_BASE}/link-account/email`, payload);

/** Step 2: verifies the OTP and upgrades the account. Returns refreshed tokens. */
export const verifyLinkAccountOtp = (payload: LinkAccountVerifyOtpPayload) =>
  api.post<LoginResponse>(`${AUTH_BASE}/link-account/email/verify-otp`, payload);

// ─── Email Registration OTP ───────────────────────────────────────────────────

export interface VerifyEmailOtpPayload {
  email: string;
  code: string;
}

/**
 * Verifies the 6-digit OTP sent during registration.
 * On success returns full login tokens and the activated user.
 */
export const verifyEmailOtp = (payload: VerifyEmailOtpPayload) =>
  api.post<LoginResponse>(`${AUTH_BASE}/verify-email-otp`, payload);
