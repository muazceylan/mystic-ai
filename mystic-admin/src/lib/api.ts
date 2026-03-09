import axios from 'axios';
import type { IngestStatus } from '@/types';

// Requests go to Next.js rewrites (same origin) → proxied server-side → no CORS issues
const API_BASE = '';
const NAME_SOURCES_BASE = process.env.NEXT_PUBLIC_NAME_SOURCES_API_PREFIX || '/api/numerology/admin/name-sources';
const NAMES_BASE = process.env.NEXT_PUBLIC_NAMES_API_PREFIX || '/api/numerology/admin/names';
const NAME_ENRICHMENT_BASE = process.env.NEXT_PUBLIC_NAME_ENRICHMENT_API_PREFIX || '/api/numerology/admin/name-enrichment';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (typeof window !== 'undefined') {
    const rawUser = localStorage.getItem('admin_user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser) as { id?: number; email?: string; role?: string };
        if (user.id != null) config.headers['X-Admin-Id'] = String(user.id);
        if (user.email)    config.headers['X-Admin-Email'] = user.email;
        if (user.role)     config.headers['X-Admin-Role'] = user.role;
      } catch {
        // Ignore malformed local cache.
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; email: string; role: string; id: number }>(
      '/api/admin/v1/auth/login', { email, password }
    ),
  me: () => api.get<{ id: number; email: string; role: string }>('/api/admin/v1/auth/me'),
  logout: () => api.post('/api/admin/v1/auth/logout'),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get('/api/admin/v1/dashboard/summary'),
};

// ── Routes ────────────────────────────────────────────────
export const routesApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/routes', { params }),
  listActive: () => api.get('/api/admin/v1/routes/active'),
  get: (id: number) => api.get(`/api/admin/v1/routes/${id}`),
  getByKey: (key: string) => api.get(`/api/admin/v1/routes/key/${key}`),
  create: (data: unknown) => api.post('/api/admin/v1/routes', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/routes/${id}`, data),
  deactivate: (id: number) => api.post(`/api/admin/v1/routes/${id}/deactivate`),
  deprecate: (id: number) => api.post(`/api/admin/v1/routes/${id}/deprecate`),
};

// ── Notifications ─────────────────────────────────────────
export const notifApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/notifications', { params }),
  get: (id: number) => api.get(`/api/admin/v1/notifications/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/notifications', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/notifications/${id}`, data),
  testSend: (id: number, targetUserIds: number[]) =>
    Promise.all(
      targetUserIds.map((userId) =>
        api.post(`/api/admin/v1/notifications/${id}/test-send`, { targetUserId: userId })
      )
    ),
  schedule: (id: number, scheduledAt: string) =>
    api.post(`/api/admin/v1/notifications/${id}/schedule`, { scheduledAt }),
  cancel: (id: number) => api.post(`/api/admin/v1/notifications/${id}/cancel`),
  deactivate: (id: number) => api.post(`/api/admin/v1/notifications/${id}/deactivate`),
};

// ── Audit Logs ────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/audit-logs', { params }),
};

// ── Modules ───────────────────────────────────────────────
export const modulesApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/modules', { params }),
  listActive: () => api.get('/api/admin/v1/modules/active'),
  get: (id: number) => api.get(`/api/admin/v1/modules/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/modules', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/modules/${id}`, data),
  activate: (id: number) => api.post(`/api/admin/v1/modules/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/modules/${id}/deactivate`),
  maintenanceOn: (id: number) => api.post(`/api/admin/v1/modules/${id}/maintenance-enable`),
  maintenanceOff: (id: number) => api.post(`/api/admin/v1/modules/${id}/maintenance-disable`),
};

// ── Navigation ────────────────────────────────────────────
export const navigationApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/navigation', { params }),
  listVisible: () => api.get('/api/admin/v1/navigation/visible'),
  get: (id: number) => api.get(`/api/admin/v1/navigation/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/navigation', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/navigation/${id}`, data),
  show: (id: number) => api.post(`/api/admin/v1/navigation/${id}/show`),
  hide: (id: number) => api.post(`/api/admin/v1/navigation/${id}/hide`),
  reorder: (orderMap: Record<number, number>) => api.post('/api/admin/v1/navigation/reorder', orderMap),
};

// ── Admin Users ───────────────────────────────────────────
export const adminUsersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/admin-users', { params }),
  get: (id: number) => api.get(`/api/admin/v1/admin-users/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/admin-users', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/admin-users/${id}`, data),
  activate: (id: number) => api.post(`/api/admin/v1/admin-users/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/admin-users/${id}/deactivate`),
  resetPassword: (id: number) => api.post(`/api/admin/v1/admin-users/${id}/reset-password`),
};

// ── Weekly Horoscopes ─────────────────────────────────────
export const weeklyHoroscopeApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/weekly-horoscopes', { params }),
  get: (id: number) => api.get(`/api/admin/v1/weekly-horoscopes/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/weekly-horoscopes', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/weekly-horoscopes/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/weekly-horoscopes/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/weekly-horoscopes/${id}/archive`),
  ingest: (zodiacSign: string, weekStartDate: string, locale: string) =>
    api.post('/api/admin/v1/weekly-horoscopes/ingest', { zodiacSign, weekStartDate, locale }),
  ingestStatus: (locale = 'tr') =>
    api.get<IngestStatus>('/api/admin/v1/weekly-horoscopes/ingest-status', { params: { locale } }),
};

// ── Daily Horoscopes ──────────────────────────────────────
export const dailyHoroscopeApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/daily-horoscopes', { params }),
  get: (id: number) => api.get(`/api/admin/v1/daily-horoscopes/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/daily-horoscopes', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/daily-horoscopes/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/daily-horoscopes/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/daily-horoscopes/${id}/archive`),
  ingest: (zodiacSign: string, date: string, locale: string) =>
    api.post('/api/admin/v1/daily-horoscopes/ingest', { zodiacSign, date, locale }),
  ingestStatus: (locale = 'tr') =>
    api.get<IngestStatus>('/api/admin/v1/daily-horoscopes/ingest-status', { params: { locale } }),
};

// ── Prayers ───────────────────────────────────────────────
export const prayerApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/prayers', { params }),
  get: (id: number) => api.get(`/api/admin/v1/prayers/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/prayers', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/prayers/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/prayers/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/prayers/${id}/archive`),
  setFeatured: (id: number, featured: boolean) =>
    api.post(`/api/admin/v1/prayers/${id}/feature`, { featured }),
};

// ── Notification Catalog ──────────────────────────────────
export const notifCatalogApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/admin/v1/notification-catalog', { params }),
  get: (id: number) => api.get(`/api/admin/v1/notification-catalog/${id}`),
  update: (id: number, data: unknown) =>
    api.put(`/api/admin/v1/notification-catalog/${id}`, data),
  activate: (id: number) =>
    api.post(`/api/admin/v1/notification-catalog/${id}/activate`),
  deactivate: (id: number) =>
    api.post(`/api/admin/v1/notification-catalog/${id}/deactivate`),
};

// ── Notification Triggers ─────────────────────────────────
export const notifTriggerApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/admin/v1/notification-triggers', { params }),
  get: (id: number) => api.get(`/api/admin/v1/notification-triggers/${id}`),
  enable: (id: number) =>
    api.post(`/api/admin/v1/notification-triggers/${id}/enable`),
  disable: (id: number) =>
    api.post(`/api/admin/v1/notification-triggers/${id}/disable`),
};

// ── Notification History ──────────────────────────────────
export const notifHistoryApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/admin/v1/notification-history', { params }),
  get: (id: number) => api.get(`/api/admin/v1/notification-history/${id}`),
};


// ── Home Sections ─────────────────────────────────────────
export const homeSectionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/home-sections', { params }),
  get: (id: number) => api.get(`/api/admin/v1/home-sections/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/home-sections', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/home-sections/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/home-sections/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/home-sections/${id}/archive`),
  activate: (id: number) => api.post(`/api/admin/v1/home-sections/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/home-sections/${id}/deactivate`),
  reorder: (orderMap: Record<number, number>) => api.post('/api/admin/v1/home-sections/reorder', orderMap),
};

// ── Explore Categories ────────────────────────────────────
export const exploreCategoriesApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/explore-categories', { params }),
  get: (id: number) => api.get(`/api/admin/v1/explore-categories/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/explore-categories', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/explore-categories/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/explore-categories/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/explore-categories/${id}/archive`),
  activate: (id: number) => api.post(`/api/admin/v1/explore-categories/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/explore-categories/${id}/deactivate`),
  reorder: (orderMap: Record<number, number>) => api.post('/api/admin/v1/explore-categories/reorder', orderMap),
};

// ── Explore Cards ─────────────────────────────────────────
export const exploreCardsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/explore-cards', { params }),
  get: (id: number) => api.get(`/api/admin/v1/explore-cards/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/explore-cards', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/explore-cards/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/archive`),
  activate: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/deactivate`),
  feature: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/feature`),
  unfeature: (id: number) => api.post(`/api/admin/v1/explore-cards/${id}/unfeature`),
  reorder: (orderMap: Record<number, number>) => api.post('/api/admin/v1/explore-cards/reorder', orderMap),
};

// ── Banners ───────────────────────────────────────────────
export const bannersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/admin/v1/banners', { params }),
  get: (id: number) => api.get(`/api/admin/v1/banners/${id}`),
  create: (data: unknown) => api.post('/api/admin/v1/banners', data),
  update: (id: number, data: unknown) => api.put(`/api/admin/v1/banners/${id}`, data),
  publish: (id: number) => api.post(`/api/admin/v1/banners/${id}/publish`),
  archive: (id: number) => api.post(`/api/admin/v1/banners/${id}/archive`),
  activate: (id: number) => api.post(`/api/admin/v1/banners/${id}/activate`),
  deactivate: (id: number) => api.post(`/api/admin/v1/banners/${id}/deactivate`),
  reorder: (priorityMap: Record<number, number>) => api.post('/api/admin/v1/banners/reorder', priorityMap),
};

// ── Route Sync ────────────────────────────────────────────
export const routeSyncApi = {
  dryRun: (manifest: unknown[]) => api.post('/api/admin/v1/routes/sync/dry-run', manifest),
  apply: (manifest: unknown[]) => api.post('/api/admin/v1/routes/sync/apply', manifest),
  discovered: () => api.get('/api/admin/v1/routes/discovered'),
  stale: () => api.get('/api/admin/v1/routes/stale'),
};

// ── Name Source Review Queue ─────────────────────────────
export const nameSourcesApi = {
  listRaw: (params?: Record<string, unknown>) => api.get(`${NAME_SOURCES_BASE}/raw`, { params }),
  listParsed: (params?: Record<string, unknown>) => api.get(`${NAME_SOURCES_BASE}/parsed`, { params }),
  listGroupedQueue: (params?: Record<string, unknown>) => api.get(`${NAME_SOURCES_BASE}/merge-queue/grouped`, { params }),
  approve: (id: number, data?: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/${id}/approve`, data),
  reject: (id: number, data?: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/${id}/reject`, data),
  skip: (id: number, data?: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/${id}/skip`, data),
  merge: (id: number, data?: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/${id}/merge`, data),
  updateNote: (id: number, data: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/${id}/note`, data),
  bulkApprove: (data: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/bulk/approve`, data),
  bulkReject: (data: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/bulk/reject`, data),
  autoMerge: (data?: unknown) => api.post(`${NAME_SOURCES_BASE}/merge-queue/auto-merge`, data),
  run: (source?: string) => api.post(`${NAME_SOURCES_BASE}/run`, null, { params: { source } }),
  reparse: (rawId: number) => api.post(`${NAME_SOURCES_BASE}/reparse/${rawId}`),
};

export const namesApi = {
  list: (params?: Record<string, unknown>) => api.get(NAMES_BASE, { params }),
  get: (id: number) => api.get(`${NAMES_BASE}/${id}`),
  search: (params?: Record<string, unknown>) => api.get(`${NAMES_BASE}/search`, { params }),
  update: (id: number, data: unknown) => api.put(`${NAMES_BASE}/${id}`, data),
  listTags: (id: number) => api.get(`${NAMES_BASE}/${id}/tags`),
  addTag: (id: number, data: unknown) => api.post(`${NAMES_BASE}/${id}/tags`, data),
  deleteTag: (id: number, tagId: number) => api.delete(`${NAMES_BASE}/${id}/tags/${tagId}`),
  listAliases: (id: number, params?: Record<string, unknown>) => api.get(`${NAMES_BASE}/${id}/aliases`, { params }),
  addAlias: (id: number, data: unknown) => api.post(`${NAMES_BASE}/${id}/aliases`, data),
  deleteAlias: (id: number, aliasId: number) => api.delete(`${NAMES_BASE}/${id}/aliases/${aliasId}`),
};

export const nameEnrichmentApi = {
  listRuns: (params?: Record<string, unknown>) => api.get(`${NAME_ENRICHMENT_BASE}/runs`, { params }),
  runBatch: () => api.post(`${NAME_ENRICHMENT_BASE}/run`),
  recompute: (nameId: number) => api.post(`${NAME_ENRICHMENT_BASE}/recompute/${nameId}`),
  listTags: (nameId: number) => api.get(`${NAME_ENRICHMENT_BASE}/tags/${nameId}`),
  taxonomy: () => api.get(`${NAME_ENRICHMENT_BASE}/taxonomy`),
};

// ── Users (from auth-service via Next.js rewrite) ─────────
export const usersApi = {
  search: (q: string, page = 0, size = 30) =>
    axios.get<{ content: UserSummary[]; totalElements: number }>(
      `/api/auth/admin/users`,
      { params: { q, page, size } }
    ),
};

export interface UserSummary {
  id: number;
  email: string;
  name: string;
}
