import api from './api';
import { AuthUser } from '../store/useAuthStore';

const AUTH_BASE = '/api/auth';

export interface RegisterPayload {
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
}

export const register = (payload: RegisterPayload) =>
  api.post<AuthUser>(`${AUTH_BASE}/register`, payload);

export const login = (payload: { username: string; password: string }) =>
  api.post<LoginResponse>(`${AUTH_BASE}/login`, payload);

export const checkEmail = (email: string) =>
  api.post<CheckEmailResponse>(`${AUTH_BASE}/check-email`, { email });

export const socialLogin = (provider: string, idToken: string) =>
  api.post<SocialLoginResponse>(`${AUTH_BASE}/social-login`, { provider, idToken });

export const updateProfile = (payload: UpdateProfilePayload) =>
  api.put<AuthUser>(`${AUTH_BASE}/profile`, payload);
