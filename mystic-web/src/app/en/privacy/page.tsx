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
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 23, 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Data We Collect</h2>
        <p>The AstroGuru application collects the following data:</p>
        <ul>
          <li>Account data such as email address, display name, and login provider</li>
          <li>Birth date, time, and place for astrology and numerology calculations</li>
          <li>Profile details such as gender, marital status, language, and profile photo</li>
          <li>User content such as dream entries and related voice recordings or transcripts</li>
          <li>Notification preferences, push tokens, rewarded ad events, wallet/token activity, and app usage analytics</li>
        </ul>

        <h2>2. How We Use Data</h2>
        <p>Collected data is used for the following purposes:</p>
        <ul>
          <li>Providing personal astrology, numerology, dream interpretation, and spiritual guidance features</li>
          <li>Personalizing the app experience and keeping your profile in sync across sessions</li>
          <li>Sending notifications you explicitly enable and granting rewarded-token flows you initiate</li>
          <li>Improving service quality, preventing abuse, and detecting or resolving technical issues</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>
          Your personal data is not shared with third parties for marketing purposes.
          Data may be processed by technical infrastructure and service providers only
          as needed to deliver authentication, analytics, notifications, storage,
          and rewarded advertising features. This can include Apple Sign In, Google
          Sign In, Firebase Analytics, Expo notification infrastructure, and Google
          AdMob rewarded ads.
        </p>

        <h2>4. Data Security</h2>
        <p>
          Your data is protected with encryption and security protocols. Industry-standard
          security measures are applied on the server side.
        </p>

        <h2>5. Data Deletion</h2>
        <p>
          You can delete your account inside the mobile app at any time from
          Profile → Permanently Delete Account. If you cannot access the app, you
          can send an email to <a href="mailto:support@astroguru.app">support@astroguru.app</a>{' '}
          with the subject &quot;Account Deletion Request&quot;.
        </p>

        <h2>6. Children and Sensitive Topics</h2>
        <p>
          AstroGuru is not designed for children. Astrology, numerology, dream, and
          spiritual guidance content is provided for informational and entertainment
          purposes only and does not replace medical, legal, financial, or mental
          health advice.
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
