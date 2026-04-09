const PUBLIC_WEB_BASE_URL = 'https://astroguru.app';

function withHttps(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : `https://${value}`;
}

export function normalizePublicWebUrl(value?: string | null, fallback = PUBLIC_WEB_BASE_URL): string {
  const raw = (value ?? '').trim();
  const candidate = raw || fallback;

  try {
    const parsed = new URL(withHttps(candidate));
    const fallbackUrl = new URL(PUBLIC_WEB_BASE_URL);

    if (/(^|\.)mysticai\.app$/i.test(parsed.hostname)) {
      fallbackUrl.pathname = parsed.pathname;
      fallbackUrl.search = parsed.search;
      fallbackUrl.hash = parsed.hash;
      return fallbackUrl.toString();
    }

    return parsed.toString();
  } catch {
    return candidate.replace(/mysticai\.app/gi, 'astroguru.app');
  }
}

export function getPublicWebBaseUrl() {
  return normalizePublicWebUrl(process.env.EXPO_PUBLIC_PUBLIC_BASE_URL, PUBLIC_WEB_BASE_URL).replace(/\/+$/, '');
}

export function getUniversalDownloadUrl(path = '/dl') {
  const defaultUrl = `${PUBLIC_WEB_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return normalizePublicWebUrl(process.env.EXPO_PUBLIC_UNIVERSAL_DOWNLOAD_URL, defaultUrl);
}

