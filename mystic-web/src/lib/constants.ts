const DEFAULT_SITE_URL = 'https://astroguru.app';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
export const SITE_NAME = 'AstroGuru';
export const SUPPORT_EMAIL = 'support@astroguru.app';
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || '#';
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || '#';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
export const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || '';

export const CMS_API_BASE_URL = process.env.CMS_API_BASE_URL || '';
export const CMS_API_TOKEN = process.env.CMS_API_TOKEN || '';

export const SUPPORTED_LOCALES = ['tr', 'en'] as const;
export const DEFAULT_LOCALE = 'tr' as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
