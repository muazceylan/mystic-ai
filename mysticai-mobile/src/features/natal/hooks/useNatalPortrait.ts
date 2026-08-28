import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import natalPortraitService, {
  NatalChartMissingError,
  type NatalPortrait,
  type NatalPortraitResponse,
} from '../../../services/natalPortrait.service';
import natalAnalytics from '../analytics';

export function resolveNatalLocale(language?: string | null): 'tr' | 'en' {
  return (language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';
}

export function natalPortraitQueryKey(locale: string) {
  return ['natal-portrait', locale] as const;
}

/**
 * Loads the structured interpretation for the signed-in user.
 *
 * A natal chart never changes, so this is cached hard: the server already persists the generated
 * portrait, and re-fetching on focus would only add latency. The one thing that does invalidate it
 * is the interface language, which is why locale is part of the query key rather than a parameter.
 *
 * Generation can take a while on a first open. The screen must render the technical chart
 * immediately and show a skeleton only inside the interpretation area — never block on this.
 */
export function useNatalPortrait() {
  const { i18n } = useTranslation();
  const locale = resolveNatalLocale(i18n.resolvedLanguage ?? i18n.language);
  const queryClient = useQueryClient();
  const startedAt = useRef<number>(0);
  const loadedOnce = useRef(false);

  const query = useQuery<NatalPortraitResponse>({
    queryKey: natalPortraitQueryKey(locale),
    queryFn: () => {
      startedAt.current = Date.now();
      return natalPortraitService.getPortrait(locale);
    },
    // The interpretation is immutable for a given chart, so treat it as fresh for the session.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    // A missing chart is a setup state, not a transient failure — retrying cannot help.
    retry: (failureCount, error) =>
      !(error instanceof NatalChartMissingError) && failureCount < 2,
  });

  // Fires once per successful load, not on every re-render of the screen.
  useEffect(() => {
    if (!query.data || loadedOnce.current) return;
    loadedOnce.current = true;
    natalAnalytics.portraitLoaded({
      locale,
      source: query.data.portrait?.source ?? 'unknown',
      cached: query.data.cached,
      load_time_ms: startedAt.current ? Date.now() - startedAt.current : 0,
    });
  }, [query.data, locale]);

  useEffect(() => {
    if (!query.error) return;
    natalAnalytics.portraitFailed({
      locale,
      reason: query.error instanceof NatalChartMissingError ? 'no_chart' : 'request_failed',
    });
  }, [query.error, locale]);

  const regenerate = useMutation({
    mutationFn: () => natalPortraitService.regenerate(locale),
    onSuccess: (data) => {
      queryClient.setQueryData(natalPortraitQueryKey(locale), data);
    },
  });

  const retry = useCallback(() => {
    natalAnalytics.portraitRetried({ locale });
    loadedOnce.current = false;
    query.refetch();
  }, [locale, query]);

  const portrait: NatalPortrait | null = query.data?.portrait ?? null;

  return {
    portrait,
    locale,
    isLoading: query.isLoading,
    isError: query.isError,
    /** True when the user has not calculated a chart yet — route to birth-data entry. */
    chartMissing: query.error instanceof NatalChartMissingError,
    /** True when the interpretation was composed without the model; the UI labels this softly. */
    isFallback: portrait?.source === 'FALLBACK',
    retry,
    regenerate: regenerate.mutate,
    isRegenerating: regenerate.isPending,
  };
}

/** Factual chart context, loaded lazily because only "Haritamı Öğren" needs it. */
export function useNatalChartContext(enabled: boolean) {
  const { i18n } = useTranslation();
  const locale = resolveNatalLocale(i18n.resolvedLanguage ?? i18n.language);

  return useQuery({
    queryKey: ['natal-chart-context', locale],
    queryFn: () => natalPortraitService.getContext(locale),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error) =>
      !(error instanceof NatalChartMissingError) && failureCount < 2,
  });
}

/**
 * "Haritama Sor". Kept as a mutation rather than a query: each question is a discrete action,
 * and caching answers across questions would be misleading.
 */
export function useAskChart() {
  const { i18n } = useTranslation();
  const locale = resolveNatalLocale(i18n.resolvedLanguage ?? i18n.language);
  const startedAt = useRef(0);

  const mutation = useMutation({
    mutationFn: (question: string) => {
      startedAt.current = Date.now();
      return natalPortraitService.ask(question, locale);
    },
    onSuccess: (data) => {
      natalAnalytics.askAnswered({
        locale,
        answerable: data.answerable,
        evidence_count: data.evidence?.length ?? 0,
        load_time_ms: startedAt.current ? Date.now() - startedAt.current : 0,
      });
    },
  });

  const ask = useCallback(
    (question: string, source: 'suggestion' | 'freeform') => {
      natalAnalytics.askSubmitted({ locale, source, question_length: question.length });
      mutation.mutate(question);
    },
    [locale, mutation],
  );

  return useMemo(
    () => ({
      ask,
      answer: mutation.data ?? null,
      isPending: mutation.isPending,
      isError: mutation.isError,
      reset: mutation.reset,
    }),
    [ask, mutation.data, mutation.isPending, mutation.isError, mutation.reset],
  );
}
