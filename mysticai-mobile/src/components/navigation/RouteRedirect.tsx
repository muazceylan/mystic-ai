import { useEffect } from 'react';
import { router, type Href } from 'expo-router';

interface RouteRedirectProps {
  href: Href;
}

export function RouteRedirect({ href }: RouteRedirectProps) {
  useEffect(() => {
    router.replace(href);
  }, [href]);

  return null;
}
