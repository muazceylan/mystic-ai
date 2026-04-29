import Link from 'next/link';
import { TrackedLink } from '@/components/TrackedLink';

const featureLinks = [
  { href: '/en/astrology', label: 'Astrology', featureName: 'astrology' },
  { href: '/en/numerology', label: 'Numerology', featureName: 'numerology' },
  { href: '/en/dream-interpretation', label: 'Dream Interpretation', featureName: 'dream_interpretation' },
  { href: '/en/compatibility-analysis', label: 'Compatibility', featureName: 'compatibility_analysis' },
  { href: '/en/spiritual-guidance', label: 'Spiritual Guidance', featureName: 'spiritual_guidance' },
] as const;

export function FooterEn() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold">AstroGuru</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Personal astrology, numerology and spiritual guidance.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {featureLinks.map((link) => (
                <li key={link.href}>
                  <TrackedLink
                    href={link.href}
                    analyticsEvent={{
                      type: 'feature_click',
                      params: {
                        feature_name: link.featureName,
                        source: 'footer_nav',
                      },
                    }}
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {link.label}
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Content</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/en/blog" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/en/contact" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:support@astroguru.app" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  support@astroguru.app
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/en/privacy" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/en/terms" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/en/account-deletion" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Account Deletion
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-200 pt-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          &copy; {currentYear} AstroGuru. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
