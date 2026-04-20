'use client';

import { TrackedLink } from '@/components/TrackedLink';

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
