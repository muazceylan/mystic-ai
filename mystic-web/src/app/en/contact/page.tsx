import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with AstroGuru. Reach us for your questions, suggestions and support requests.',
  alternates: getMetadataAlternates('en', '/iletisim', '/en/contact'),
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        You can reach us for your questions, suggestions, review access, or support requests.
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Support</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            For technical issues, account operations and general questions:
          </p>
          <a
            href="mailto:support@astroguru.app"
            className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            support@astroguru.app
          </a>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Account Deletion</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You can delete your account inside the mobile app from Profile → Permanently
            Delete Account. If you cannot access the app, send an email with the subject
            &quot;Account Deletion Request&quot;:
          </p>
          <a
            href="mailto:support@astroguru.app?subject=Account%20Deletion%20Request"
            className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            Send Account Deletion Request
          </a>
        </div>
      </div>
    </div>
  );
}
