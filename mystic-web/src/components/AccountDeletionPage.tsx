import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { getAccountDeletionContent, getAccountDeletionUrl } from '@/lib/accountDeletionContent';
import { SUPPORT_EMAIL } from '@/lib/constants';
import type { Locale } from '@/lib/i18n';
import { faqJsonLd, featurePageJsonLd } from '@/lib/jsonLd';

function getSupportSubject(locale: Locale) {
  return locale === 'tr' ? 'Hesap Silme Talebi' : 'Account Deletion Request';
}

function getContactHref(locale: Locale) {
  return locale === 'tr' ? '/iletisim' : '/en/contact';
}

export function AccountDeletionPage({ locale }: { locale: Locale }) {
  const content = getAccountDeletionContent(locale);
  const pageUrl = getAccountDeletionUrl(locale);
  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(getSupportSubject(locale))}`;

  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          content.metadata.title,
          content.metadata.description,
          pageUrl,
        )}
      />
      <JsonLd data={faqJsonLd(content.faq)} />

      <article className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-purple-50 p-8 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-700 dark:text-purple-300">
              {content.hero.eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {content.hero.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {content.hero.description}
            </p>

            <div className="mt-6 rounded-2xl border border-purple-200/80 bg-white/80 p-5 backdrop-blur dark:border-purple-400/20 dark:bg-zinc-950/70">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {content.hero.instructionLabel}
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <code className="rounded bg-zinc-100 px-2 py-1 text-[0.95em] dark:bg-zinc-900">
                  {content.hero.instructionValue}
                </code>
              </p>
              {content.hero.localizedPathNote ? (
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {content.hero.localizedPathNote}
                </p>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#delete-steps"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {content.ctas.primary}
              </a>
              <Link
                href={getContactHref(locale)}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                {content.ctas.secondary}
              </Link>
            </div>
          </div>
        </section>

        <section id="delete-steps" className="mt-10 rounded-3xl border border-zinc-200 p-8 dark:border-zinc-800 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">{content.howToDelete.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {content.howToDelete.intro}
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {content.howToDelete.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {step.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-zinc-200 p-8 dark:border-zinc-800 sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight">{content.afterDeletion.title}</h2>
            <ul className="mt-6 space-y-4">
              {content.afterDeletion.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-purple-500 dark:bg-purple-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight">{content.reviewNote.title}</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              {content.reviewNote.body}
            </p>
          </aside>
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-200 p-8 dark:border-zinc-800 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">{content.help.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {content.help.intro}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">{content.help.supportCard.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {content.help.supportCard.body}
              </p>
              <a
                href={supportMailto}
                className="mt-5 inline-flex items-center text-sm font-medium text-purple-700 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200"
              >
                {content.help.supportCard.mailtoLabel}
              </a>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {content.help.supportCard.contactDescription}
              </p>
              <Link
                href={getContactHref(locale)}
                className="mt-5 inline-flex items-center text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-700 dark:hover:decoration-zinc-500"
              >
                {content.help.supportCard.contactLabel}
              </Link>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">{content.help.policyLinksTitle}</h3>
              <div className="mt-4 space-y-4">
                {content.help.policyLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                      {link.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {link.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
