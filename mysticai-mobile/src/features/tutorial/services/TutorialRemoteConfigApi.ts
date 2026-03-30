import api from '../../../services/api';
import type { TutorialConfigListResponse } from '../domain/tutorial.contracts';
import type { TutorialPlatform } from '../domain/tutorial.types';
import type { TutorialRemoteClient } from '../sources/TutorialRemoteSource';

export class TutorialRemoteConfigApi implements TutorialRemoteClient {
  async fetchTutorialConfig(platform: TutorialPlatform, locale: string): Promise<TutorialConfigListResponse | null> {
    try {
      const response = await api.get<TutorialConfigListResponse>('/api/v1/tutorial-configs', {
        params: {
          platform,
          locale,
          onlyActive: true,
          publishedOnly: true,
        },
      });

      const payload = response.data;
      if (!payload || !Array.isArray(payload.tutorials)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
