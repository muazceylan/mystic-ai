import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AnalyticsPageTracker } from '@/components/AnalyticsPageTracker';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { HtmlLanguageSync } from '@/components/HtmlLanguageSync';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  other: {
    'google-adsense-account': 'ca-pub-2868466577339325',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <HtmlLanguageSync />
        <GoogleAnalytics />
        <AnalyticsPageTracker />
        {children}
      </body>
    </html>
  );
}
