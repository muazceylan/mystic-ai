import { createContext, useContext } from 'react';

const PagerReadyCtx = createContext(false);

export const PagerReadyProvider = PagerReadyCtx.Provider;

export function usePagerReady(): boolean {
  return useContext(PagerReadyCtx);
}
