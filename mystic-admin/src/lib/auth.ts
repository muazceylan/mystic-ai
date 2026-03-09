'use client';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function setToken(token: string) {
  localStorage.setItem('admin_token', token);
}

export function removeToken() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

export function getUser(): { id: number; email: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('admin_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: { id: number; email: string; role: string }) {
  localStorage.setItem('admin_user', JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PRODUCT_ADMIN: 'PRODUCT_ADMIN',
  NOTIFICATION_MANAGER: 'NOTIFICATION_MANAGER',
} as const;

export function hasRole(user: { role: string } | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function canViewAudit(user: { role: string } | null) {
  return hasRole(user, Role.SUPER_ADMIN, Role.PRODUCT_ADMIN);
}

export function canManageRoutes(user: { role: string } | null) {
  return hasRole(user, Role.SUPER_ADMIN, Role.PRODUCT_ADMIN);
}

export function canManageNameSources(user: { role: string } | null) {
  return hasRole(user, Role.SUPER_ADMIN, Role.PRODUCT_ADMIN);
}

export function canManageNotifications(user: { role: string } | null) {
  return hasRole(user, Role.SUPER_ADMIN, Role.NOTIFICATION_MANAGER);
}

export function isSuperAdmin(user: { role: string } | null) {
  return hasRole(user, Role.SUPER_ADMIN);
}
