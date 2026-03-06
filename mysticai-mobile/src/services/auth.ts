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

export const updateProfile = (payload: UpdateProfilePayload) =>
  api.put<AuthUser>(`${AUTH_BASE}/profile`, payload);
