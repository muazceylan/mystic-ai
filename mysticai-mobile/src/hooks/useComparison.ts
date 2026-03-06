import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComparisonResponseDTO, RelationshipType } from '../types/compare';
import { fetchComparison } from '../services/compare.service';

export interface UseComparisonOptions {
  matchId: number | null;
  relationshipType: RelationshipType;
  leftName?: string;
  rightName?: string;
  enabled?: boolean;
}

export interface UseComparisonResult {
  data: ComparisonResponseDTO | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  refetch: () => Promise<ComparisonResponseDTO | null>;
}

export function useComparison(options: UseComparisonOptions): UseComparisonResult {
  const [data, setData] = useState<ComparisonResponseDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const previousRequestKeyRef = useRef<string>('');
  const latestRequestIdRef = useRef(0);

  const requestKey = useMemo(
    () =>
      [
        options.matchId ?? 'none',
        options.relationshipType,
        options.leftName ?? '',
        options.rightName ?? '',
        options.enabled ? '1' : '0',
      ].join('|'),
    [options.enabled, options.leftName, options.matchId, options.relationshipType, options.rightName],
  );

  const refetch = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;

    if (previousRequestKeyRef.current !== requestKey) {
      previousRequestKeyRef.current = requestKey;
      setData(null);
      setError(null);
      setIsMock(false);
    }

    if (!options.matchId || !options.enabled) {
      setLoading(false);
      setError(null);
      setData(null);
      setIsMock(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchComparison({
        matchId: options.matchId,
        relationshipType: options.relationshipType,
        leftName: options.leftName,
        rightName: options.rightName,
      });

      if (requestId !== latestRequestIdRef.current || previousRequestKeyRef.current !== requestKey) {
        return null;
      }

      setData(result.data);
      setIsMock(result.isMock);
      setError(null);
      return result.data;
    } catch (requestError: any) {
      if (requestId !== latestRequestIdRef.current || previousRequestKeyRef.current !== requestKey) {
        return null;
      }

      const message =
        requestError?.message ??
        requestError?.response?.data?.message ??
        'Uyum verisi yüklenemedi.';
      setError(message);
      setData(null);
      setIsMock(false);
      return null;
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    requestKey,
    options.enabled,
    options.leftName,
    options.matchId,
    options.relationshipType,
    options.rightName,
  ]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    isMock,
    refetch,
  };
}

export default useComparison;
