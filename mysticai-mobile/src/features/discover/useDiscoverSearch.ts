import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DISCOVER_MODULES } from './discoverModules';
import type { DiscoverModule, DiscoverSection } from './types';

export type GroupedModules = Record<DiscoverSection, DiscoverModule[]>;

export function useDiscoverSearch(query: string): GroupedModules {
  const { t } = useTranslation();

  return useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = q
      ? DISCOVER_MODULES.filter((m) => {
          const title = t(m.titleKey).toLowerCase();
          const desc = t(m.descriptionKey).toLowerCase();
          return (
            title.includes(q) ||
            desc.includes(q) ||
            m.keywords.some((kw) => kw.includes(q))
          );
        })
      : DISCOVER_MODULES;

    const grouped: GroupedModules = {
      cosmicFlow: [],
      tools: [],
      wisdom: [],
    };

    for (const m of filtered) {
      grouped[m.section].push(m);
    }

    return grouped;
  }, [query, t]);
}
