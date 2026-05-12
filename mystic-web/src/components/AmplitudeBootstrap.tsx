'use client';

import { useEffect } from 'react';
import { initializeAmplitude } from '@/lib/amplitude';

export function AmplitudeBootstrap() {
  useEffect(() => {
    void initializeAmplitude();
  }, []);

  return null;
}
