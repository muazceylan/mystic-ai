import { trackEvent } from '../../services/analytics';

/**
 * Analytics for the Haritam experience.
 *
 * Follows the repo's feature-prefixed snake_case convention. Birth data is deliberately absent
 * from every payload — sign names, house numbers and degrees are personal data, and an event
 * stream is not the place for them. Only structural facts travel: which card, which locale,
 * whether the interpretation came from the model or the deterministic path.
 */

export type NatalEntryPoint = 'tab' | 'deeplink' | 'home_widget' | 'notification' | 'unknown';

type Params = Record<string, string | number | boolean | null | undefined>;

function track(name: string, params?: Params): void {
  trackEvent(name, params);
}

export const natalAnalytics = {
  chartOpened(params: { entry_point: NatalEntryPoint; locale: string; has_birth_time: boolean }) {
    track('natal_chart_opened', params);
  },

  portraitLoaded(params: {
    locale: string;
    /** AI or FALLBACK — lets us watch how often users see the degraded path. */
    source: string;
    cached: boolean;
    load_time_ms: number;
  }) {
    track('natal_portrait_loaded', params);
  },

  portraitFailed(params: { locale: string; reason: string }) {
    track('natal_portrait_failed', params);
  },

  portraitRetried(params: { locale: string }) {
    track('natal_portrait_retry_tapped', params);
  },

  portraitOpened(params: { locale: string; source: string }) {
    track('natal_portrait_opened', params);
  },

  bigThreeOpened(params: { role: 'sun' | 'moon' | 'ascendant'; locale: string }) {
    track('big_three_detail_opened', params);
  },

  /** One event for every thematic card, in both "Beni Anlat" and "Hayatım". */
  topicOpened(params: { topic_id: string; group: 'about_me' | 'life_area'; locale: string }) {
    track('natal_topic_opened', params);
  },

  /** Fired when the user expands "Bu yorumu neden yaptık?" — our signal that evidence matters. */
  evidenceOpened(params: { context: string; evidence_count: number; locale: string }) {
    track('natal_evidence_opened', params);
  },

  learnOpened(params: { locale: string }) {
    track('natal_learn_opened', params);
  },

  advancedOpened(params: { section: string; locale: string }) {
    track('natal_advanced_opened', params);
  },

  askOpened(params: { locale: string }) {
    track('ask_chart_opened', params);
  },

  askSubmitted(params: { locale: string; source: 'suggestion' | 'freeform'; question_length: number }) {
    track('ask_chart_question_submitted', params);
  },

  askAnswered(params: { locale: string; answerable: boolean; evidence_count: number; load_time_ms: number }) {
    track('ask_chart_answer_received', params);
  },
};

export default natalAnalytics;
