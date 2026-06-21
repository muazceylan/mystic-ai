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
      <p className="mt-2 text-sm text-zinc-500">Son güncelleme: 21 Haziran 2026</p>

      <div className="prose prose-zinc mt-8 dark:prose-invert max-w-none">
        <h2>1. Toplanan Veriler</h2>
        <p>
          AstroGuru uygulamasi asagidaki verileri toplar:
        </p>
        <ul>
          <li>E-posta adresi, gorunen ad ve giris saglayicisi gibi hesap verileri</li>
          <li>Dogum tarihi, saati ve yeri gibi astroloji ve numeroloji hesaplama verileri</li>
          <li>Cinsiyet, medeni durum, dil ve profil fotografi gibi profil detaylari</li>
          <li>Rüya kayıtları ile bunlara ait ses kaydı veya transkript verileri</li>
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
          Kişisel verileriniz satılmaz. Veriler yalnızca uygulama işlevlerini sağlamak,
          kimlik doğrulama, analitik, bildirim, depolama, güvenlik ve reklam özelliklerini
          sunmak için gerekli teknik hizmet sağlayıcılar tarafından işlenebilir. Buna Apple
          ile Giriş, Google ile Giriş, Firebase Analytics, Expo bildirim altyapısı ve Google
          AdMob ödüllü reklamları dahil olabilir.
        </p>

        <h2>4. Veri Guvenligi</h2>
        <p>
          Verileriniz sifreleme ve guvenlik protokolleri ile korunur. Sunucu tarafinda
          endüstri standardi guvenlik onlemleri uygulanir.
        </p>

        <h2>5. Veri Silme</h2>
        <p>
          AstroGuru hesabınızı ve hesabınızla ilişkili kişisel verileri mobil uygulama
          içinde Profil → Hesabı Kalıcı Olarak Sil yoluyla silebilirsiniz.
        </p>
        <p>
          Uygulamaya erişemiyorsanız,{' '}
          <a href="https://astroguru.app/account-deletion">
            https://astroguru.app/account-deletion
          </a>{' '}
          sayfasındaki adımları takip ederek veya{' '}
          <a href="mailto:support@astroguru.app?subject=AstroGuru%20Hesap%20Silme%20Talebi">
            support@astroguru.app
          </a>{' '}
          adresine &quot;AstroGuru Hesap Silme Talebi&quot; konusu ile e-posta göndererek
          hesap ve veri silme talebinde bulunabilirsiniz.
        </p>
        <p>
          Hesap silme işleminde hesap bilgileriniz, e-posta adresiniz, giriş sağlayıcı
          bilgileriniz, profil detaylarınız, doğum tarihi/saati/yeri, astroloji ve
          numeroloji analiz verileriniz, uyum analizi verileriniz, rüya kayıtlarınız,
          bildirim token&apos;larınız ve uygulama tercihleriniz silinir veya anonimleştirilir.
        </p>
        <p>
          Hesap silme işleminden sonra hesabınız aktif kullanıcı hesabı olarak kullanılamaz.
          Güvenlik, kötüye kullanım önleme, yasal yükümlülükler veya denetim kayıtları gibi
          zorunlu durumlarda minimum teknik kayıtlar sınırlı süreyle saklanabilir. Bu
          kayıtlar aktif kullanıcı hesabı olarak kullanılmaz.
        </p>
        <p>
          Hesap silme talepleri genellikle 7 gün içinde işleme alınır. Yasal veya teknik
          gereklilikler nedeniyle bazı kayıtlar daha uzun süre saklanabilir.
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
