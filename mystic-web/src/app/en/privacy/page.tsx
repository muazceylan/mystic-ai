import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'AstroGuru privacy policy. Information about how your personal data is collected, used and protected.',
  alternates: getMetadataAlternates('en', '/gizlilik', '/en/privacy'),
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 17, 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Data We Collect</h2>
        <p>The AstroGuru application collects the following data:</p>
        <ul>
          <li>Email address (account creation and communication)</li>
          <li>Birth date, time and place (astrology and numerology calculations)</li>
          <li>Gender and marital status (personalized content)</li>
          <li>Dream texts (dream interpretation service)</li>
          <li>App usage data (service improvement)</li>
        </ul>

        <h2>2. How We Use Data</h2>
        <p>Collected data is used for the following purposes:</p>
        <ul>
          <li>Providing personal astrology, numerology and dream interpretation services</li>
          <li>Personalizing the app experience</li>
          <li>Improving service quality</li>
          <li>Detecting and resolving technical issues</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>
          Your personal data is not shared with third parties for marketing purposes.
          Data may only be shared with technical infrastructure providers necessary
          for service delivery.
        </p>

        <h2>4. Data Security</h2>
        <p>
          Your data is protected with encryption and security protocols. Industry-standard
          security measures are applied on the server side.
        </p>

        <h2>5. Data Deletion</h2>
        <p>
          You can delete your account and all your data at any time. For data deletion
          requests, you can send an email to{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a> with the
          subject &quot;Account Deletion Request&quot;.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Our website may use cookies for essential functionality. Information about
          third-party advertising cookies is governed by Google AdSense policies.
        </p>

        <h2>7. Contact</h2>
        <p>
          For questions about the privacy policy, you can reach us at{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a>.
        </p>
      </div>
    </article>
  );
}
