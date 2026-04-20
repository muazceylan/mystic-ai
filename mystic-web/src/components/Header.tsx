import { Suspense } from 'react';
import Link from 'next/link';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { TrackedLink } from '@/components/TrackedLink';

const featureLinks = [
  { href: '/astroloji', label: 'Astroloji', featureName: 'astrology' },
  { href: '/numeroloji', label: 'Numeroloji', featureName: 'numerology' },
  { href: '/ruya-yorumu', label: 'Ruya Yorumu', featureName: 'dream_interpretation' },
  { href: '/uyum-analizi', label: 'Uyum Analizi', featureName: 'compatibility_analysis' },
  { href: '/spirituel-rehberlik', label: 'Spirituel', featureName: 'spiritual_guidance' },
] as const;

export function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
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
            href="/blog"
            className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Blog
          </Link>
          <Suspense fallback={null}><LocaleSwitcher /></Suspense>
          <DownloadCtaLink
            href="/#indir"
            label="Indir"
            source="header_nav"
            placement="header"
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          />
        </nav>
        <div className="flex items-center gap-4 md:hidden">
          <Suspense fallback={null}><LocaleSwitcher /></Suspense>
          <DownloadCtaLink
            href="/#indir"
            label="Indir"
            source="header_mobile"
            placement="header"
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          />
        </div>
      </div>
    </header>
  );
}
