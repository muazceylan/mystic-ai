# `info.astroguru.app` Migration Runbook

Bu runbook, public SEO web yuzeyini `astroguru.app` root host'tan `info.astroguru.app` altina tasirken uygulanacak edge routing ve redirect kurallarini tanimlar.

## Hedef Mimari

- `astroguru.app` -> ana uygulama / mobile web shell
- `info.astroguru.app` -> `mystic-web` SEO/public web
- `api.astroguru.app` -> backend API
- `admin.astroguru.app` -> admin panel
- `www.astroguru.app` -> `https://astroguru.app`

## Redirect Kurallari

Asagidaki legacy SEO path'leri root host uzerinde kalici `301` ile `info.astroguru.app`'a gitmeli:

- `/astroloji`
- `/numeroloji`
- `/ruya-yorumu`
- `/uyum-analizi`
- `/spirituel-rehberlik`
- `/gizlilik`
- `/kullanim-sartlari`
- `/iletisim`
- `/blog`
- `/blog/*`
- `/en`
- `/en/*`
- `/robots.txt`
- `/sitemap.xml`
- `/ads.txt`
- `/opengraph-image`

## Ornek Caddy Konfigurasyonu

```caddy
{
        email astrolog.guru.app@gmail.com
}

http://api.astroguru.app {
        redir https://api.astroguru.app{uri}
}

https://api.astroguru.app {
        encode zstd gzip
        reverse_proxy 127.0.0.1:8080
}

http://admin.astroguru.app {
        redir https://admin.astroguru.app{uri}
}

https://admin.astroguru.app {
        encode zstd gzip
        reverse_proxy 127.0.0.1:3000
}

www.astroguru.app {
        redir https://astroguru.app{uri} permanent
}

http://info.astroguru.app {
        redir https://info.astroguru.app{uri}
}

https://info.astroguru.app {
        encode zstd gzip
        reverse_proxy 127.0.0.1:3002
}

astroguru.app {
        @legacySeoPaths path /astroloji /numeroloji /ruya-yorumu /uyum-analizi /spirituel-rehberlik /gizlilik /kullanim-sartlari /iletisim /robots.txt /sitemap.xml /ads.txt /opengraph-image
        @legacySeoNested path_regexp legacySeoNested ^/(blog|en)(/.*)?$

        redir @legacySeoPaths https://info.astroguru.app{uri} permanent
        redir @legacySeoNested https://info.astroguru.app{uri} permanent

        encode zstd gzip
        reverse_proxy 127.0.0.1:8090
}
```

Notlar:

- `127.0.0.1:3002` mevcut `mystic-web` SEO deployment port'u varsayimiyla yazildi.
- `127.0.0.1:8090` ornek mobile web shell port'udur; gercek prod port'una gore guncellenmeli.
- Root host'ta `robots.txt` ve `sitemap.xml` artik app shell tarafindan servis edilmemeli; bunlar `301` ile `info` host'una gitmeli.

## Deployment Sonrasi Kontroller

```bash
curl -I https://astroguru.app/astroloji
curl -I https://astroguru.app/blog/ornek-slug
curl -I https://astroguru.app/en
curl -I https://astroguru.app/robots.txt
curl -I https://astroguru.app/sitemap.xml
curl -I https://info.astroguru.app/
curl -I https://info.astroguru.app/robots.txt
curl -I https://info.astroguru.app/sitemap.xml
```

Beklenen:

- Root legacy SEO URL'leri `301` ile `info.astroguru.app`'a gider
- `https://info.astroguru.app/` ve SEO sayfalari `200` doner
- `robots.txt` ve `sitemap.xml` sadece `info` host'ta SEO icerigiyle doner
