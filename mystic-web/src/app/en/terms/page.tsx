import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'AstroGuru terms of use and conditions. Information about our service usage rules.',
  alternates: getMetadataAlternates('en', '/kullanim-sartlari', '/en/terms'),
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 17, 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Service Description</h2>
        <p>
          AstroGuru is a mobile application and web platform offering personal astrology,
          numerology, dream interpretation and spiritual guidance services. The content
          provided is prepared for entertainment and personal development purposes.
        </p>

        <h2>2. Acceptance and Consent</h2>
        <p>
          By using AstroGuru services, you are deemed to have accepted these terms of use.
          If you do not accept the terms, please do not use our services.
        </p>

        <h2>3. Usage Conditions</h2>
        <ul>
          <li>You may only use our services in compliance with the law.</li>
          <li>You are responsible for the security of your account.</li>
          <li>Automated data collection or scraping is prohibited.</li>
          <li>Behavior that negatively affects other users&apos; experience is prohibited.</li>
        </ul>

        <h2>4. Content and Liability</h2>
        <p>
          Astrology, numerology and spiritual content provided by AstroGuru is prepared
          for informational and entertainment purposes. This content does not replace
          professional medical, legal, financial or psychological counseling.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          All content, design, logos and software on the AstroGuru platform are protected
          by copyright. Unauthorized copying, distribution or commercial use is prohibited.
        </p>

        <h2>6. Account Termination</h2>
        <p>
          In case of violation of the terms of use, your account may be suspended or
          terminated without notice.
        </p>

        <h2>7. Changes</h2>
        <p>
          These terms of use may be updated without prior notice. Updated terms take
          effect on the date of publication.
        </p>

        <h2>8. Contact</h2>
        <p>
          For questions about the terms of use, you can reach us at{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a>.
        </p>
      </div>
    </article>
  );
}
