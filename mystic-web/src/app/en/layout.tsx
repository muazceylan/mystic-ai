import type { Metadata } from 'next';
import { HeaderEn } from '@/components/HeaderEn';
import { FooterEn } from '@/components/FooterEn';
import { SITE_URL, SITE_NAME } from '@/lib/constants';

const SITE_DESCRIPTION_EN =
  'Personal astrology, numerology, dream interpretation and spiritual guidance. Discover your natal chart, track daily transits, and find cosmic direction.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Personal Astrology & Spiritual Guidance`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION_EN,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${SITE_URL}/en`,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Personal Astrology & Spiritual Guidance`,
    description: SITE_DESCRIPTION_EN,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Personal Astrology & Spiritual Guidance`,
    description: SITE_DESCRIPTION_EN,
  },
  other: {
    'google-adsense-account': 'ca-pub-2868466577339325',
  },
};

export default function EnLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <HeaderEn />
      <main className="flex-1">{children}</main>
      <FooterEn />
    </>
  );
}
