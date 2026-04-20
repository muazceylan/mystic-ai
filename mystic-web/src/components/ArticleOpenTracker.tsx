'use client';

import { useEffect } from 'react';
import { trackArticleOpen } from '@/lib/analytics';
import type { BlogPost } from '@/lib/blog';
import type { Locale } from '@/lib/constants';

interface ArticleOpenTrackerProps {
  slug: string;
  title?: string;
  category?: BlogPost['category'];
  locale: Locale;
  translationGroup?: string;
}

export function ArticleOpenTracker({
  slug,
  title,
  category,
  locale,
  translationGroup,
}: ArticleOpenTrackerProps) {
  useEffect(() => {
    trackArticleOpen({
      slug,
      title,
      category,
      locale,
      page_type: 'blog_article',
      content_group: 'blog',
      translation_group: translationGroup,
    });
  }, [category, locale, slug, title, translationGroup]);

  return null;
}
