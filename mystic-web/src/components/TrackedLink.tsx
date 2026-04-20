'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ComponentPropsWithoutRef } from 'react';
import {
  type AnalyticsInteractionEvent,
  dispatchAnalyticsInteraction,
} from '@/lib/analytics';

type NextLinkProps = ComponentProps<typeof Link>;

interface TrackedLinkProps extends NextLinkProps {
  analyticsEvent?: AnalyticsInteractionEvent;
}

export function TrackedLink({
  analyticsEvent,
  onClick,
  ...props
}: TrackedLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && analyticsEvent && pathname) {
          dispatchAnalyticsInteraction(analyticsEvent, pathname);
        }
      }}
    />
  );
}

interface TrackedAnchorProps extends ComponentPropsWithoutRef<'a'> {
  analyticsEvent?: AnalyticsInteractionEvent;
}

export function TrackedAnchor({
  analyticsEvent,
  onClick,
  ...props
}: TrackedAnchorProps) {
  const pathname = usePathname();

  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && analyticsEvent && pathname) {
          dispatchAnalyticsInteraction(analyticsEvent, pathname);
        }
      }}
    />
  );
}
