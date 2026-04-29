import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { envConfig } from '../config/env';

const ADSENSE_CLIENT = 'ca-pub-2868466577339325';
const ROOT_SITE_URL = 'https://astroguru.app';
const INFO_SITE_URL = 'https://info.astroguru.app';
const PAGE_TITLE = 'AstroGuru | Astroloji, Numeroloji ve Ruhsal Rehberlik Uygulamasi';
const PAGE_DESCRIPTION =
  'AstroGuru ile gunluk astroloji, numeroloji, ruya yorumu ve spirituel rehberlik deneyimini kesfet.';

export default function RootHtml({ children }: PropsWithChildren) {
  const gtmContainerId = envConfig.gtm.webContainerId || 'GTM-P48FMPJB';

  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={ROOT_SITE_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>{PAGE_TITLE}</title>
        <link rel="canonical" href={ROOT_SITE_URL} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmContainerId}');`,
          }}
        />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
        <ScrollViewStyleReset />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
        <noscript>
          <main
            style={{
              maxWidth: 960,
              margin: '0 auto',
              padding: '32px 20px 48px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
              color: '#1f2937',
              background: '#f8fafc',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', color: '#7c3aed' }}>ASTROGURU</p>
            <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: '12px 0 16px' }}>
              Astroloji, numeroloji ve ruhsal rehberlik icin tek uygulama.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.7, margin: 0 }}>
              Gunluk yorumlar, uyum analizi, ruya yorumu ve daha fazlasi icin AstroGuru uygulamasini acin.
              Daha detayli bilgi icerikleri icin bilgi merkezimizi ziyaret edebilirsiniz.
            </p>
            <ul style={{ marginTop: 20, paddingLeft: 20, lineHeight: 1.8 }}>
              <li><a href={`${INFO_SITE_URL}/astroloji`}>Astroloji Rehberleri</a></li>
              <li><a href={`${INFO_SITE_URL}/numeroloji`}>Numeroloji Icerikleri</a></li>
              <li><a href={`${INFO_SITE_URL}/ruya-yorumu`}>Ruya Yorumu</a></li>
              <li><a href={`${INFO_SITE_URL}/uyum-analizi`}>Uyum Analizi</a></li>
              <li><a href={`${INFO_SITE_URL}/blog`}>AstroGuru Blog</a></li>
            </ul>
            <p style={{ marginTop: 24 }}>
              <a href="/(auth)/welcome">Uygulamayi Ac</a>
              {' · '}
              <a href="/dl">Indirme Sayfasina Git</a>
              {' · '}
              <a href={INFO_SITE_URL}>Bilgi Merkezini Ziyaret Et</a>
            </p>
          </main>
        </noscript>
      </body>
    </html>
  );
}
