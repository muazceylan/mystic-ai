import { useCallback, useEffect, useState } from 'react';
import { getMatchTraits, type MatchTraitsResponse } from '../services/match.api';

export interface UseMatchTraitsResult {
  data: MatchTraitsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<MatchTraitsResponse | null>;
}

export function useMatchTraits(matchId: number | null | undefined): UseMatchTraitsResult {
  const [data, setData] = useState<MatchTraitsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!matchId) {
      setData(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getMatchTraits(matchId);
      setData(response.data);
      return response.data;
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? 'Eksen verileri yüklenemedi.';
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    if (!matchId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getMatchTraits(matchId)
      .then((response) => {
        if (cancelled) return;
        setData(response.data);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const message = e?.response?.data?.message ?? e?.message ?? 'Eksen verileri yüklenemedi.';
        setError(message);
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return { data, loading, error, refetch };
}

export default useMatchTraits;
