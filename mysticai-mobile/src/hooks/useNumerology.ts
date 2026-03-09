import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { UserProfile } from '../store/useAuthStore';
import {
  detectPartialSections,
  fetchNumerology,
  getNumerologyProfileStatus,
  isNumerologyResponseFresh,
  normalizeGuidancePeriod,
  normalizeLocale,
  type NumerologyCacheStatus,
  type NumerologyEmptyVariant,
  type NumerologyGuidancePeriod,
  type NumerologyPartialSection,
  type NumerologyResponse,
} from '../services/numerology.service';

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveErrorType(error: unknown): string {
  const candidate = error as any;
  const status = candidate?.response?.status;
  if (status === 404) {
    return 'not_found';
  }
  if (status === 422) {
    return 'validation_error';
  }
  if (status === 500) {
    return 'server_error';
  }
  return 'network_error';
}

function findLatestCachedNumerology(
  queryClient: ReturnType<typeof useQueryClient>,
  name: string,
  birthDate: string,
): NumerologyResponse | null {
  const cacheEntries = queryClient.getQueriesData<NumerologyResponse>({
    queryKey: ['numerology', name, birthDate],
  });

  const ranked = cacheEntries
    .map(([queryKey, data]) => ({
      queryKey,
      data,
      updatedAt: queryClient.getQueryState(queryKey as QueryKey)?.dataUpdatedAt ?? 0,
    }))
    .filter((item): item is { queryKey: QueryKey; data: NumerologyResponse; updatedAt: number } => Boolean(item.data))
    .sort((left, right) => right.updatedAt - left.updatedAt);

  return ranked[0]?.data ?? null;
}

export interface UseNumerologyParams {
  user: UserProfile | null;
  locale?: string;
  effectiveDate?: string;
  guidancePeriod?: NumerologyGuidancePeriod;
  enabled?: boolean;
}

export interface UseNumerologyResult {
  data: NumerologyResponse | null;
  liveData: NumerologyResponse | null;
  cachedFallback: NumerologyResponse | null;
  fullName: string;
  birthDate: string;
  emptyVariant: NumerologyEmptyVariant;
  missingFields: Array<'name' | 'birthDate'>;
  hasRequiredProfile: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorType: string | null;
  cacheStatus: NumerologyCacheStatus;
  isPartial: boolean;
  partialSections: NumerologyPartialSection[];
  summaryFallbackUsed: boolean;
  hasStaleFallback: boolean;
  refetch: () => Promise<unknown>;
  effectiveDate: string;
  locale: string;
  guidancePeriod: NumerologyGuidancePeriod;
}

export function useNumerology({
  user,
  locale,
  effectiveDate,
  guidancePeriod,
  enabled = true,
}: UseNumerologyParams): UseNumerologyResult {
  const queryClient = useQueryClient();
  const profileStatus = useMemo(() => getNumerologyProfileStatus(user), [user]);
  const resolvedLocale = normalizeLocale(locale ?? user?.preferredLanguage ?? 'tr');
  const resolvedEffectiveDate = effectiveDate ?? getTodayKey();
  const resolvedGuidancePeriod = normalizeGuidancePeriod(guidancePeriod);
  const hasRequiredProfile = profileStatus.emptyVariant === 'none';

  const query = useQuery({
    queryKey: queryKeys.numerology(
      profileStatus.fullName,
      profileStatus.birthDate,
      resolvedEffectiveDate,
      resolvedLocale,
      resolvedGuidancePeriod,
    ),
    queryFn: () => fetchNumerology({
      name: profileStatus.fullName,
      birthDate: profileStatus.birthDate,
      effectiveDate: resolvedEffectiveDate,
      locale: resolvedLocale,
      guidancePeriod: resolvedGuidancePeriod,
    }),
    enabled: enabled && hasRequiredProfile,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const cachedFallback = useMemo(
    () => (
      hasRequiredProfile
        ? findLatestCachedNumerology(queryClient, profileStatus.fullName, profileStatus.birthDate)
        : null
    ),
    [queryClient, hasRequiredProfile, profileStatus.birthDate, profileStatus.fullName, query.dataUpdatedAt],
  );

  const displayData = query.data ?? cachedFallback;
  const cacheStatus: NumerologyCacheStatus = !displayData
    ? 'none'
    : query.data && isNumerologyResponseFresh(query.data, resolvedEffectiveDate, resolvedGuidancePeriod)
      ? 'fresh'
      : 'stale';
  const partialSections = detectPartialSections(displayData);

  return {
    data: displayData,
    liveData: query.data ?? null,
    cachedFallback,
    fullName: profileStatus.fullName,
    birthDate: profileStatus.birthDate,
    emptyVariant: profileStatus.emptyVariant,
    missingFields: profileStatus.missingFields,
    hasRequiredProfile,
    isLoading: query.isLoading && !displayData,
    isFetching: query.isFetching,
    isError: query.isError && !displayData,
    errorType: query.error ? resolveErrorType(query.error) : null,
    cacheStatus,
    isPartial: partialSections.length > 0,
    partialSections,
    summaryFallbackUsed: partialSections.length > 0 && Boolean(displayData?.summary?.trim()),
    hasStaleFallback: cacheStatus === 'stale' && Boolean(displayData),
    refetch: query.refetch,
    effectiveDate: resolvedEffectiveDate,
    locale: resolvedLocale,
    guidancePeriod: resolvedGuidancePeriod,
  };
}

export default useNumerology;
