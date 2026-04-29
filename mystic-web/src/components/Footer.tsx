import Link from 'next/link';
import { TrackedLink } from '@/components/TrackedLink';

const featureLinks = [
  { href: '/astroloji', label: 'Astroloji', featureName: 'astrology' },
  { href: '/numeroloji', label: 'Numeroloji', featureName: 'numerology' },
  { href: '/ruya-yorumu', label: 'Ruya Yorumu', featureName: 'dream_interpretation' },
  { href: '/uyum-analizi', label: 'Uyum Analizi', featureName: 'compatibility_analysis' },
  { href: '/spirituel-rehberlik', label: 'Spirituel Rehberlik', featureName: 'spiritual_guidance' },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold">AstroGuru</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Kisisel astroloji, numeroloji ve spirituel rehberlik.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Ozellikler</h3>
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
            <h3 className="text-sm font-semibold">Icerik</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/blog" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Iletisim
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
            <h3 className="text-sm font-semibold">Yasal</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/gizlilik" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Gizlilik Politikasi
                </Link>
              </li>
              <li>
                <Link href="/kullanim-sartlari" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Kullanim Sartlari
                </Link>
              </li>
              <li>
                <Link href="/account-deletion" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Hesap Silme
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-200 pt-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          &copy; {currentYear} AstroGuru. Tum haklari saklidir.
        </div>
      </div>
    </footer>
  );
}
