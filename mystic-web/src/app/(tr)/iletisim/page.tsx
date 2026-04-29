import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Iletisim',
  description:
    'AstroGuru ile iletisime gecin. Sorulariniz, onerileriniz ve destek talepleriniz icin bize ulasin.',
  alternates: getMetadataAlternates('tr', '/iletisim', '/en/contact'),
};

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Iletisim</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Sorulariniz, onerileriniz, inceleme erisimi veya destek talepleriniz icin bize ulasabilirsiniz.
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Destek</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Teknik sorunlar, hesap islemleri ve genel sorular icin:
          </p>
          <a
            href="mailto:support@astroguru.app"
            className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            support@astroguru.app
          </a>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Hesap Silme</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Hesabinizi mobil uygulama icinde Profil → Hesabi Kalici Olarak Sil yoluyla
            silebilirsiniz. Uygulamaya erisemiyorsaniz &quot;Hesap Silme Talebi&quot;
            konusuyla e-posta gonderin:
          </p>
          <a
            href="mailto:support@astroguru.app?subject=Hesap%20Silme%20Talebi"
            className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            Hesap Silme Talebi Gonder
          </a>
        </div>
      </div>
    </div>
  );
}
