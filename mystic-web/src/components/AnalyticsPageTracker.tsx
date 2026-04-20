'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  buildTrackedUrl,
  getAnalyticsContextFromPath,
  trackPageView,
} from '@/lib/analytics';

export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackPageView(buildTrackedUrl(pathname, search), {
      ...getAnalyticsContextFromPath(pathname),
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}
