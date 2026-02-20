import api from './api';

export interface DreamEntryResponse {
  id: number;
  userId: number;
  text: string;
  dreamDate: string;
  audioUrl?: string;
  title?: string;
  interpretation?: string;
  warnings: string[];
  opportunities: string[];
  recurringSymbols: string[];
  extractedSymbols: string[];
  correlationId: string;
  interpretationStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface DreamSymbol {
  id: number;
  symbolName: string;
  count: number;
  lastSeenDate: string;
  recurring: boolean;
}

export interface DreamSubmitRequest {
  userId: number;
  text: string;
  dreamDate?: string;
  audioUrl?: string;
  title?: string;
  locale?: string;
}

export interface SymbolInsight {
  symbolName: string;
  count: number;
  houseAssociation: string;
  aiMeaning: string | null;
  lastSeenDate: string;
  recurring: boolean;
}

export interface DreamAnalyticsResponse {
  userId: number;
  totalDreams: number;
  completedDreams: number;
  pendingDreams: number;
  symbolInsights: SymbolInsight[];
  dreamsByMonth: Record<string, number>;
  houseFrequency: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
}

export interface GlobalSymbolEntry {
  symbolName: string;
  count: number;
  emoji: string;
}

export interface CollectivePulseResponse {
  topSymbols: GlobalSymbolEntry[];
  astroReasoning: string;
  generatedAt: string;
}

export interface MonthlyStoryResponse {
  id: number | null;
  userId: number;
  yearMonth: string;
  story: string | null;
  dreamCount: number;
  dominantSymbols: string[];
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EMPTY';
  createdAt: string | null;
}

export interface SymbolMeaning {
  universal: string;
  psychological: string;
  personal: string;
}

export const dreamService = {
  submitDream: async (request: DreamSubmitRequest): Promise<DreamEntryResponse> => {
    // Longer timeout: backend calls AI orchestrator synchronously for symbol extraction
    const res = await api.post<DreamEntryResponse>('/api/v1/dreams', request, { timeout: 45000 });
    return res.data;
  },

  /** Transcribe audio → returns text only, does NOT create a dream entry. */
  transcribeAudio: async (audioUri: string, filename = 'recording.m4a'): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', { uri: audioUri, name: filename, type: 'audio/m4a' } as any);
    const res = await api.post<{ text: string }>('/api/v1/dreams/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return res.data.text;
  },

  /** Upload audio → transcribe → submit dream in one call (legacy). */
  submitDreamAudio: async (
    userId: number,
    audioUri: string,
    filename = 'recording.m4a'
  ): Promise<DreamEntryResponse> => {
    const formData = new FormData();
    formData.append('userId', String(userId));
    formData.append('audio', { uri: audioUri, name: filename, type: 'audio/m4a' } as any);
    const res = await api.post<DreamEntryResponse>('/api/v1/dreams/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    });
    return res.data;
  },

  getDreamsByUser: async (userId: number): Promise<DreamEntryResponse[]> => {
    const res = await api.get<DreamEntryResponse[]>(`/api/v1/dreams/user/${userId}`);
    return res.data;
  },

  getDreamById: async (dreamId: number): Promise<DreamEntryResponse> => {
    const res = await api.get<DreamEntryResponse>(`/api/v1/dreams/${dreamId}`);
    return res.data;
  },

  getSymbolsByUser: async (userId: number): Promise<DreamSymbol[]> => {
    const res = await api.get<DreamSymbol[]>(`/api/v1/dreams/symbols/${userId}`);
    return res.data;
  },

  deleteDream: async (dreamId: number): Promise<void> => {
    await api.delete(`/api/v1/dreams/${dreamId}`);
  },

  getAnalytics: async (userId: number): Promise<DreamAnalyticsResponse> => {
    const res = await api.get<DreamAnalyticsResponse>(`/api/v1/dreams/analytics/${userId}`);
    return res.data;
  },

  getCollectivePulse: async (): Promise<CollectivePulseResponse> => {
    const res = await api.get<CollectivePulseResponse>('/api/v1/dreams/collective-pulse');
    return res.data;
  },

  generateMonthlyStory: async (userId: number, year: number, month: number, force = false): Promise<MonthlyStoryResponse> => {
    const res = await api.post<MonthlyStoryResponse>(
      `/api/v1/dreams/monthly-story/${userId}?year=${year}&month=${month}&force=${force}`
    );
    return res.data;
  },

  getMonthlyStory: async (userId: number, year: number, month: number): Promise<MonthlyStoryResponse | null> => {
    try {
      const res = await api.get<MonthlyStoryResponse>(`/api/v1/dreams/monthly-story/${userId}/${year}/${month}`);
      return res.data;
    } catch {
      return null;
    }
  },

  registerPushToken: async (userId: number, token: string, platform: string): Promise<void> => {
    await api.post('/api/v1/dreams/push-token', { userId, token, platform });
  },
};
