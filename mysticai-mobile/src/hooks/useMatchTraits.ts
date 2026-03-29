import { useCallback, useEffect, useState } from 'react';
import {
  buildMockMatchDTO,
  getMatchTraits,
  normalizeMatchDTO,
  normalizeSynastryDTO,
} from '../services/match.api';
import { getSynastry } from '../services/synastry.service';
import type { MatchDTO, MatchSeedDTO } from '../types/match';

const ALLOW_MATCH_MOCK_FALLBACK =
  (process.env.EXPO_PUBLIC_MATCH_ALLOW_MOCK_FALLBACK ?? 'true').toLowerCase() !== 'false';

export interface UseMatchTraitsOptions {
  personAName?: string;
  personBName?: string;
  personASignLabel?: string;
  personBSignLabel?: string;
  overallScore?: number | null;
  summary?: string | null;
  relationshipType?: string | null;
}

export interface UseMatchTraitsResult {
  data: MatchDTO | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  refetch: () => Promise<MatchDTO | null>;
}

function buildSeed(matchId: number, options?: UseMatchTraitsOptions): MatchSeedDTO {
  return {
    matchId,
    personAName: options?.personAName,
    personBName: options?.personBName,
    personASignLabel: options?.personASignLabel,
    personBSignLabel: options?.personBSignLabel,
    overallScore: options?.overallScore ?? null,
    summary: options?.summary ?? null,
  };
}

export function useMatchTraits(
  matchId: number | null | undefined,
  options?: UseMatchTraitsOptions,
): UseMatchTraitsResult {
  const [data, setData] = useState<MatchDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const refetch = useCallback(async () => {
    if (!matchId) {
      setData(null);
      setError(null);
      setLoading(false);
      setIsMock(false);
      return null;
    }

    const seed = buildSeed(matchId, options);
    setLoading(true);
    setError(null);

    try {
      const response = await getMatchTraits(matchId, options?.relationshipType);
      const normalized = normalizeMatchDTO(response.data, seed);
      setData(normalized);
      setIsMock(normalized.source === 'mock');
      setError(null);
      return normalized;
    } catch (traitsError: any) {
      try {
        const synastryRes = await getSynastry(matchId);
        const normalized = normalizeSynastryDTO(synastryRes.data, seed);
        setData(normalized);
        setIsMock(false);
        setError(null);
        return normalized;
      } catch (synastryError: any) {
        const message =
          traitsError?.response?.data?.message ??
          synastryError?.response?.data?.message ??
          traitsError?.message ??
          synastryError?.message ??
          'Uyum verisi alınamadı.';
        setError(message);
        if (!ALLOW_MATCH_MOCK_FALLBACK) {
          setData(null);
          setIsMock(false);
          return null;
        }
        const mock = buildMockMatchDTO(seed);
        setData(mock);
        setIsMock(true);
        return mock;
      }
    } finally {
      setLoading(false);
    }
  }, [
    matchId,
    options?.overallScore,
    options?.personAName,
    options?.personASignLabel,
    options?.personBName,
    options?.personBSignLabel,
    options?.relationshipType,
    options?.summary,
  ]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, isMock, refetch };
}

export default useMatchTraits;
