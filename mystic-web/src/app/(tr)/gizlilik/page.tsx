import type { Metadata } from 'next';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Gizlilik Politikasi',
  description:
    'AstroGuru gizlilik politikasi. Kisisel verilerinizin nasil toplandigi, kullanildigi ve korundugu hakkinda bilgi.',
  alternates: getMetadataAlternates('tr', '/gizlilik', '/en/privacy'),
};

export default function GizlilikPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Gizlilik Politikasi</h1>
      <p className="mt-2 text-sm text-zinc-500">Son guncelleme: 17 Nisan 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Toplanan Veriler</h2>
        <p>
          AstroGuru uygulamasi asagidaki verileri toplar:
        </p>
        <ul>
          <li>E-posta adresi (hesap olusturma ve iletisim)</li>
          <li>Dogum tarihi, saati ve yeri (astroloji ve numeroloji hesaplamalari)</li>
          <li>Cinsiyet ve medeni durum (kisisellestirilmis icerik)</li>
          <li>Ruya metinleri (ruya yorumlama hizmeti)</li>
          <li>Uygulama kullanim verileri (hizmet iyilestirme)</li>
        </ul>

        <h2>2. Verilerin Kullanimi</h2>
        <p>
          Toplanan veriler asagidaki amaclarla kullanilir:
        </p>
        <ul>
          <li>Kisisel astroloji, numeroloji ve ruya yorumu hizmetleri sunmak</li>
          <li>Uygulama deneyimini kisisellestirmek</li>
          <li>Hizmet kalitesini iyilestirmek</li>
          <li>Teknik sorunlari tespit edip gidermek</li>
        </ul>

        <h2>3. Verilerin Paylasilmasi</h2>
        <p>
          Kisisel verileriniz ucuncu taraflarla pazarlama amaciyla paylasilmaz. Veriler
          yalnizca hizmet sunumu icin gerekli olan teknik altyapi saglayicilari ile
          paylasılabilir.
        </p>

        <h2>4. Veri Guvenligi</h2>
        <p>
          Verileriniz sifreleme ve guvenlik protokolleri ile korunur. Sunucu tarafinda
          endüstri standardi guvenlik onlemleri uygulanir.
        </p>

        <h2>5. Veri Silme</h2>
        <p>
          Hesabinizi ve tum verilerinizi istediginiz zaman silebilirsiniz. Veri silme
          talepleriniz icin{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a> adresine
          &quot;Hesap Silme Talebi&quot; konusuyla e-posta gonderebilirsiniz.
        </p>

        <h2>6. Cerezler</h2>
        <p>
          Web sitemiz temel islevsellik icin cerez kullanabilir. Ucuncu taraf reklam
          cerezleri hakkinda bilgi Google AdSense politikalari cercevesindedir.
        </p>

        <h2>7. Iletisim</h2>
        <p>
          Gizlilik politikasi hakkinda sorulariniz icin{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a> adresinden
          bize ulasabilirsiniz.
        </p>
      </div>
    </article>
  );
}
