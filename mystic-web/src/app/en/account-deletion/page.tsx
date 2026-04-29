import type { Metadata } from 'next';
import { AccountDeletionPage } from '@/components/AccountDeletionPage';
import { getAccountDeletionContent } from '@/lib/accountDeletionContent';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

const content = getAccountDeletionContent('en');

export const metadata: Metadata = {
  title: content.metadata.title,
  description: content.metadata.description,
  alternates: getMetadataAlternates('en', '/account-deletion', '/en/account-deletion'),
  openGraph: {
    title: content.metadata.openGraphTitle,
    description: content.metadata.description,
    url: `${SITE_URL}/en/account-deletion`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

export default function AccountDeletionEnPage() {
  return <AccountDeletionPage locale="en" />;
}
