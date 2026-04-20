'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function getDocumentLanguage(pathname: string) {
  return pathname.startsWith('/en') ? 'en' : 'tr';
}

export function HtmlLanguageSync() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = getDocumentLanguage(pathname);
  }, [pathname]);

  return null;
}
