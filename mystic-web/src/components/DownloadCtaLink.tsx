'use client';

import { TrackedLink } from '@/components/TrackedLink';
import { trackAppEntryStarted } from '@/lib/amplitude';

interface DownloadCtaLinkProps {
  href: string;
  label: string;
  source: string;
  placement?: string;
  className?: string;
}

export function DownloadCtaLink({
  href,
  label,
  source,
  placement = 'download_cta',
  className,
}: DownloadCtaLinkProps) {
  return (
    <TrackedLink
      href={href}
      onClick={() => {
        trackAppEntryStarted({
          entryPoint: source,
          ctaLabel: label,
          destinationPath: href,
        });
      }}
      analyticsEvent={{
        type: 'cta_click',
        params: {
          cta_label: 'download_free',
          placement,
          source,
        },
      }}
      className={className}
    >
      {label}
    </TrackedLink>
  );
}
