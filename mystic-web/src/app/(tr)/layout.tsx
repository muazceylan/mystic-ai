import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SITE_URL, SITE_NAME } from '@/lib/constants';

const SITE_DESCRIPTION =
  'Kisisel astroloji, numeroloji, ruya yorumu ve spirituel rehberlik. Natal haritani kesfet, gunluk transitlerini takip et, hayatina yildizlarin isiginda yon ver.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Kisisel Astroloji ve Spirituel Rehberlik`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Kisisel Astroloji ve Spirituel Rehberlik`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Kisisel Astroloji ve Spirituel Rehberlik`,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'google-adsense-account': 'ca-pub-2868466577339325',
  },
};

export default function TrLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
