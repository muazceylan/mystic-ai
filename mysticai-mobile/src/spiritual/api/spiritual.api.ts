import api from '../../services/api';
import { enqueuePendingSpiritualLog, flushPendingSpiritualLogQueue } from '../offline/pendingLogQueue';
import type {
  AsmaDetail,
  AsmaListItem,
  ContentReportResponse,
  CreateContentReportInput,
  DailyAsmaResponse,
  DailyMeditationResponse,
  DailyPrayerSetResponse,
  DhikrLogResponse,
  FavoriteStatusResponse,
  MeditationLogResponse,
  Mood,
  PagedResponse,
  PrayerDetail,
  WeeklyStatsResponse,
  ShortPrayerItem,
  UpdateUserPreferencesInput,
  UserPreferences,
} from '../types';

export const spiritualApi = {
  getDailyPrayers: async (date?: string): Promise<DailyPrayerSetResponse> => {
    const res = await api.get<DailyPrayerSetResponse>('/api/v1/spiritual/daily/prayers', { params: { date } });
    void flushPendingSpiritualLogQueue();
    return res.data;
  },

  getPrayerDetail: async (id: number): Promise<PrayerDetail> => {
    const res = await api.get<PrayerDetail>(`/api/v1/spiritual/prayers/${id}`);
    return res.data;
  },

  favoritePrayer: async (id: number): Promise<FavoriteStatusResponse> => {
    const res = await api.post<FavoriteStatusResponse>(`/api/v1/spiritual/prayers/${id}/favorite`);
    return res.data;
  },

  unfavoritePrayer: async (id: number): Promise<FavoriteStatusResponse> => {
    const res = await api.delete<FavoriteStatusResponse>(`/api/v1/spiritual/prayers/${id}/favorite`);
    return res.data;
  },

  getShortPrayers: async (params?: {
    category?: string;
    limit?: number;
  }): Promise<ShortPrayerItem[]> => {
    const res = await api.get<ShortPrayerItem[]>('/api/v1/spiritual/prayers/short', { params });
    return res.data;
  },

  logPrayer: async (payload: {
    date: string;
    prayerId: number;
    count: number;
    note?: string;
    mood?: Mood;
  }): Promise<DhikrLogResponse> => {
    try {
      const res = await api.post<DhikrLogResponse>('/api/v1/spiritual/log/prayer', payload);
      return res.data;
    } catch (error: any) {
      if (!error?.response) {
        await enqueuePendingSpiritualLog({
          kind: 'PRAYER_LOG',
          endpoint: '/api/v1/spiritual/log/prayer',
          payload: payload as unknown as Record<string, unknown>,
        });
        return {
          id: -Date.now(),
          userId: 0,
          date: payload.date,
          entryType: 'PRAYER',
          prayerId: payload.prayerId,
          asmaId: null,
          totalRepeatCount: payload.count,
          sessionCount: 1,
          mood: payload.mood ?? null,
          note: payload.note ?? null,
          updatedAt: new Date().toISOString(),
          queuedOffline: true,
        };
      }
      throw error;
    }
  },

  getPrayerLogs: async (params: {
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedResponse<DhikrLogResponse>> => {
    const res = await api.get<PagedResponse<DhikrLogResponse>>('/api/v1/spiritual/log/prayer', { params });
    return res.data;
  },

  getDailyAsma: async (date?: string): Promise<DailyAsmaResponse> => {
    const res = await api.get<DailyAsmaResponse>('/api/v1/spiritual/daily/asma', { params: { date } });
    return res.data;
  },

  getAsmaList: async (params?: {
    search?: string;
    theme?: string;
    sort?: 'order' | 'alpha';
    page?: number;
    pageSize?: number;
  }): Promise<PagedResponse<AsmaListItem>> => {
    const res = await api.get<PagedResponse<AsmaListItem>>('/api/v1/spiritual/asma', { params });
    return res.data;
  },

  getAsmaDetail: async (id: number): Promise<AsmaDetail> => {
    const res = await api.get<AsmaDetail>(`/api/v1/spiritual/asma/${id}`);
    return res.data;
  },

  logAsma: async (payload: {
    date: string;
    asmaId: number;
    count: number;
    note?: string;
    mood?: Mood;
  }): Promise<DhikrLogResponse> => {
    try {
      const res = await api.post<DhikrLogResponse>('/api/v1/spiritual/log/asma', payload);
      return res.data;
    } catch (error: any) {
      if (!error?.response) {
        await enqueuePendingSpiritualLog({
          kind: 'ASMA_LOG',
          endpoint: '/api/v1/spiritual/log/asma',
          payload: payload as unknown as Record<string, unknown>,
        });
        return {
          id: -Date.now(),
          userId: 0,
          date: payload.date,
          entryType: 'ASMA',
          prayerId: null,
          asmaId: payload.asmaId,
          totalRepeatCount: payload.count,
          sessionCount: 1,
          mood: payload.mood ?? null,
          note: payload.note ?? null,
          updatedAt: new Date().toISOString(),
          queuedOffline: true,
        };
      }
      throw error;
    }
  },

  getDailyMeditation: async (date?: string): Promise<DailyMeditationResponse> => {
    const res = await api.get<DailyMeditationResponse>('/api/v1/spiritual/daily/meditation', { params: { date } });
    return res.data;
  },

  logMeditation: async (payload: {
    date: string;
    exerciseId: number;
    durationSec: number;
    completedCycles?: number;
    moodBefore?: Mood;
    moodAfter?: Mood;
    note?: string;
  }): Promise<MeditationLogResponse> => {
    try {
      const res = await api.post<MeditationLogResponse>('/api/v1/spiritual/log/meditation', payload);
      return res.data;
    } catch (error: any) {
      if (!error?.response) {
        await enqueuePendingSpiritualLog({
          kind: 'MEDITATION_LOG',
          endpoint: '/api/v1/spiritual/log/meditation',
          payload: payload as unknown as Record<string, unknown>,
        });
        return {
          id: -Date.now(),
          userId: 0,
          date: payload.date,
          exerciseId: payload.exerciseId,
          targetDurationSec: payload.durationSec,
          actualDurationSec: payload.durationSec,
          completedCycles: payload.completedCycles ?? null,
          moodBefore: payload.moodBefore ?? null,
          moodAfter: payload.moodAfter ?? null,
          status: 'QUEUED_OFFLINE',
          createdAt: new Date().toISOString(),
          queuedOffline: true,
        };
      }
      throw error;
    }
  },

  getWeeklyStats: async (week: string): Promise<WeeklyStatsResponse> => {
    const res = await api.get<WeeklyStatsResponse>('/api/v1/spiritual/stats/weekly', { params: { week } });
    return res.data;
  },

  getPreferences: async (): Promise<UserPreferences> => {
    const res = await api.get<UserPreferences>('/api/v1/spiritual/preferences');
    return res.data;
  },

  updatePreferences: async (payload: UpdateUserPreferencesInput): Promise<UserPreferences> => {
    const res = await api.put<UserPreferences>('/api/v1/spiritual/preferences', payload);
    return res.data;
  },

  reportContent: async (payload: CreateContentReportInput): Promise<ContentReportResponse> => {
    const res = await api.post<ContentReportResponse>('/api/v1/spiritual/content/report', payload);
    return res.data;
  },
};

export { flushPendingSpiritualLogQueue };
