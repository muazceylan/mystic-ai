'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsContextFromPath, trackPageView } from '@/lib/analytics';

export function AnalyticsPageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, {
      ...getAnalyticsContextFromPath(pathname),
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
