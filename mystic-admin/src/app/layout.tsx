import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Mystic AI Admin',
  description: 'Admin Panel',
  other: {
    'google-adsense-account': 'ca-pub-2868466577339325',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
