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
      <p className="mt-2 text-sm text-zinc-500">Son guncelleme: 23 Nisan 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Toplanan Veriler</h2>
        <p>
          AstroGuru uygulamasi asagidaki verileri toplar:
        </p>
        <ul>
          <li>E-posta adresi, gorunen ad ve giris saglayicisi gibi hesap verileri</li>
          <li>Dogum tarihi, saati ve yeri gibi astroloji ve numeroloji hesaplama verileri</li>
          <li>Cinsiyet, medeni durum, dil ve profil fotografi gibi profil detaylari</li>
          <li>Ruya kayitlari ile bunlara ait ses kaydi veya transkript verileri</li>
          <li>Bildirim tercihleri, push token&apos;lari, odullu reklam olaylari, cuzdan/token hareketleri ve uygulama kullanim analitigi</li>
        </ul>

        <h2>2. Verilerin Kullanimi</h2>
        <p>
          Toplanan veriler asagidaki amaclarla kullanilir:
        </p>
        <ul>
          <li>Kisisel astroloji, numeroloji, ruya yorumu ve spirituel rehberlik ozelliklerini sunmak</li>
          <li>Uygulama deneyimini kisisellestirmek ve profili oturumlar arasinda korumak</li>
          <li>Acikca etkinlestirdiginiz bildirimleri gondermek ve baslattiginiz odullu-token akisini tamamlamak</li>
          <li>Hizmet kalitesini iyilestirmek, kotuye kullanimi azaltmak ve teknik sorunlari gidermek</li>
        </ul>

        <h2>3. Verilerin Paylasilmasi</h2>
        <p>
          Kisisel verileriniz ucuncu taraflarla pazarlama amaciyla paylasilmaz. Veriler
          yalnizca kimlik dogrulama, analitik, bildirim, depolama ve odullu reklam
          ozelliklerini sunmak icin gerekli teknik saglayicilar tarafindan islenebilir.
          Buna Apple ile Giris, Google ile Giris, Firebase Analytics, Expo bildirim
          altyapisi ve Google AdMob odullu reklamlari dahil olabilir.
        </p>

        <h2>4. Veri Guvenligi</h2>
        <p>
          Verileriniz sifreleme ve guvenlik protokolleri ile korunur. Sunucu tarafinda
          endüstri standardi guvenlik onlemleri uygulanir.
        </p>

        <h2>5. Veri Silme</h2>
        <p>
          Hesabinizi mobil uygulama icinde Profil → Hesabi Kalici Olarak Sil yoluyla
          istediginiz zaman silebilirsiniz. Uygulamaya erisemiyorsaniz{' '}
          <a href="mailto:support@astroguru.app">support@astroguru.app</a> adresine
          &quot;Hesap Silme Talebi&quot; konusuyla e-posta gonderebilirsiniz.
        </p>

        <h2>6. Cocuklar ve Hassas Konular</h2>
        <p>
          AstroGuru cocuklara yonelik tasarlanmamistir. Astroloji, numeroloji, ruya
          ve spirituel rehberlik icerikleri yalnizca bilgilendirme ve eglence amaciyla
          sunulur; tip, hukuk, finans veya ruh sagligi danismanliginin yerine gecmez.
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
