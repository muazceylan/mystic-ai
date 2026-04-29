import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Kullanim Sartlari',
  description:
    'AstroGuru kullanim sartlari ve kosullari. Hizmet kullanim kurallarimiz hakkinda bilgi.',
  alternates: getMetadataAlternates('tr', '/kullanim-sartlari', '/en/terms'),
};

export default function KullanimSartlariPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Kullanim Sartlari</h1>
      <p className="mt-2 text-sm text-zinc-500">Son guncelleme: 23 Nisan 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Hizmet Tanimi</h2>
        <p>
          AstroGuru, kisisel astroloji, numeroloji, ruya yorumu ve spirituel rehberlik
          hizmetleri sunan bir mobil uygulama ve web platformudur. Sunulan icerikler
          eglence ve kisisel gelisim amaciyla hazirlanmistir.
        </p>

        <h2>2. Kabul ve Onay</h2>
        <p>
          AstroGuru hizmetlerini kullanarak bu kullanim sartlarini kabul etmis
          sayilirsiniz. Sartlari kabul etmiyorsaniz hizmetlerimizi kullanmayiniz.
        </p>

        <h2>3. Kullanim Kosullari</h2>
        <ul>
          <li>Hizmetlerimizi yalnizca yasalara uygun sekilde kullanabilirsiniz.</li>
          <li>Hesabinizin guvenliginden siz sorumlusunuz.</li>
          <li>Otomatik veri toplama veya scraping yasaklanmistir.</li>
          <li>Diger kullanicilarin deneyimini olumsuz etkileyen davranislar yasaklanmistir.</li>
        </ul>

        <h2>4. Icerik ve Sorumluluk</h2>
        <p>
          AstroGuru tarafindan sunulan astroloji, numeroloji ve spirituel icerikler
          bilgilendirme ve eglence amaciyla hazirlanmistir. Bu icerikler profesyonel
          tip, hukuk, finans veya psikoloji danismanligi yerine gecmez.
        </p>

        <h2>5. Fikri Mulkiyet</h2>
        <p>
          AstroGuru platformundaki tum icerik, tasarim, logo ve yazilimlar telif hakki
          ile korunmaktadir. Izinsiz kopyalama, dagitma veya ticari kullanim
          yasaklanmistir.
        </p>

        <h2>6. Hesap Sonlandirma</h2>
        <p>
          Kullanim sartlarinin ihlali durumunda hesabiniz uyari yapilmaksizin
          askiya alinabilir veya sonlandirilabilir.
        </p>

        <h2>7. Yas ve Icerik Uyarisi</h2>
        <p>
          AstroGuru cocuk uygulamasi olarak konumlandirilmamistir. Astroloji, numeroloji,
          ruya ve spirituel rehberlik icerikleri yalnizca bilgilendirme ve eglence
          amaciyla sunulur; tip, hukuk, finans veya ruh sagligi desteginin yerine gecmez.
        </p>

        <h2>8. Degisiklikler</h2>
        <p>
          Bu kullanim sartlari onceden bildirimde bulunmaksizin guncellenebilir.
          Guncellenmis sartlar yayinlandigi tarihte yururluge girer.
        </p>

        <h2>9. Iletisim</h2>
        <p>
          Kullanim sartlari hakkinda sorulariniz icin{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a> adresinden
          bize ulasabilirsiniz.
        </p>
      </div>
    </article>
  );
}
