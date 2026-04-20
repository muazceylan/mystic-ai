import Link from 'next/link';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { TrackedLink } from '@/components/TrackedLink';

const featureLinks = [
  { href: '/en/astrology', label: 'Astrology', featureName: 'astrology' },
  { href: '/en/numerology', label: 'Numerology', featureName: 'numerology' },
  { href: '/en/dream-interpretation', label: 'Dreams', featureName: 'dream_interpretation' },
  { href: '/en/compatibility-analysis', label: 'Compatibility', featureName: 'compatibility_analysis' },
  { href: '/en/spiritual-guidance', label: 'Spiritual', featureName: 'spiritual_guidance' },
] as const;

export function HeaderEn() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/en" className="text-xl font-bold tracking-tight">
          AstroGuru
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {featureLinks.map((link) => (
            <TrackedLink
              key={link.href}
              href={link.href}
              analyticsEvent={{
                type: 'feature_click',
                params: {
                  feature_name: link.featureName,
                  source: 'header_nav',
                },
              }}
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {link.label}
            </TrackedLink>
          ))}
          <Link
            href="/en/blog"
            className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Blog
          </Link>
          <LocaleSwitcher />
          <DownloadCtaLink
            href="/en#download"
            label="Download"
            source="header_nav"
            placement="header"
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          />
        </nav>
        <div className="flex items-center gap-4 md:hidden">
          <LocaleSwitcher />
          <DownloadCtaLink
            href="/en#download"
            label="Download"
            source="header_mobile"
            placement="header"
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          />
        </div>
      </div>
    </header>
  );
}
