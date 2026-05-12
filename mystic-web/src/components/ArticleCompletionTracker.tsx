'use client';

import { useEffect, useRef } from 'react';
import { trackArticleCompleted } from '@/lib/amplitude';

interface ArticleCompletionTrackerProps {
  slug: string;
  category?: string;
}

export function ArticleCompletionTracker({
  slug,
  category,
}: ArticleCompletionTrackerProps) {
  const startedAtRef = useRef(Date.now());
  const maxDepthRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (completedRef.current) {
        return;
      }

      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const depth = Math.min(100, Math.round(((scrollTop + viewportHeight) / Math.max(1, fullHeight)) * 100));

      maxDepthRef.current = Math.max(maxDepthRef.current, depth);
      if (maxDepthRef.current < 90) {
        return;
      }

      completedRef.current = true;
      trackArticleCompleted({
        contentId: slug,
        contentCategory: category,
        readTimeSeconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        scrollDepthPercent: maxDepthRef.current,
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [category, slug]);

  return null;
}
