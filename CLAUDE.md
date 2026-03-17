# CLAUDE.md

Bu dosya, `mystic-ai` reposunda calisan AI coding agent'lar icin ilk okunacak operasyon rehberidir. Bu repo tek bir uygulama degil; React Native mobil istemci, Next.js admin paneli, Spring Boot microservice grubu, gateway, service registry, AI orchestration, CMS/config/navigation temeli ve operasyon dokumanlarindan olusan bir monorepodur. Bu nedenle "hemen kod yaz" refleksi bu repoda yanlis yere mudahale etme riski tasir.

Kod yazmadan once bu dosyayi, sonra ilgili bounded context'i okuyun. Tum repoyu bastan sona taramak yerine dogru giris noktasini secmek bu projede kalite, hiz ve tutarlilik farkini belirler.

## 0. README'siz Ilk Kurulum (Local Dev Bootstrap)

Bu bolum, projeyi ilk kez ayağa kaldirmak isteyen kisi icin en kisa ve guvenli akistir.
`README.md` acmadan da lokal ortam kurulabilir.

### 0.1 Gereksinimler

- Java 21
- Maven 3.9+
- Node.js 20+
- pnpm 8+ (admin panel icin)
- Docker + Docker Compose
- Yerel araclar: `curl`, `lsof`, `pkill`

### 0.2 Ilk Kurulum Komutlari

Repo root'unda:

```bash
# 1) Env dosyalarini hazirla
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env

# 2) Altyapiyi baslat (PostgreSQL, RabbitMQ, Redis, MailHog)
make infra

# 3) Tum backend servislerini derle + baslat
chmod +x start-services.sh
./start-services.sh
```

Ayri terminallerde:

```bash
# 4) Admin panel
cd mystic-admin
pnpm install
pnpm dev
# http://localhost:3001
```

```bash
# 5) Mobile (Expo)
cd mysticai-mobile
npm install
npm run start
```

### 0.3 Hizli Dogrulama

Backend ayakta mi?

```bash
curl -sS http://localhost:8080/actuator/health
curl -sS "http://localhost:8080/api/v1/auth/check-email?email=startup-check@mystic.ai"
```

Yardimci paneller:

- Eureka: `http://localhost:8761`
- Gateway Swagger: `http://localhost:8080/swagger-ui.html`
- RabbitMQ UI: `http://localhost:15672`
- MailHog: `http://localhost:8025`

### 0.4 Ilk Kurulumda Sik Takilan Noktalar

- `503` / auth route hatasi: once `make infra`, sonra `./start-services.sh` tekrar calistir.
- `8081 already in use`: `lsof -ti :8081 | xargs kill -9`, sonra script'i tekrar calistir.
- Admin icin `pnpm` yoksa: `corepack enable && corepack prepare pnpm@latest --activate`.

## Read This First

### Source Of Truth Order

Bu repoda kaynak onceligi sirasi:

1. Ilgili bounded context icindeki calisan kod
2. O akisin config, route, DTO, test ve migration dosyalari
3. O modula ait runbook / QA checklist / analytics dokumanlari
4. Root README ve servis README'leri
5. Eski veya stale dokumanlar, sadece ek baglam

### Repo Reality Notes

- Gozlem: `mysticai-mobile/README.md` aktif React Native/Expo yapisini degil, eski Flutter izlerini tasiyor. Mobil icin source of truth kodun kendisidir.
- Gozlem: `dream-service` ayri bir servis olarak hala duruyor, ancak mobil uygulamanin aktif rüya akisi `astrology-service` altindaki `/api/v1/dreams/**` endpoint'lerini kullaniyor. Dream degisikliginde once aktif owner'i dogrulayın.
- Gozlem: `notification-service` route registry, navigation config, app-config, CMS content ve tutorial config omurgasini tasiyor. Bunlar UI'da hardcode edilmemeli.
- Gozlem: schema disiplininde karisik bir durum var. `auth-service`, `astrology-service`, `spiritual-service`, `numerology-service` Flyway kullanirken, `notification-service` halen agirlikli olarak `ddl-auto: update` ve startup runner'lari ile calisiyor.
- Verify if changed: gateway Java filter'indeki public path listesi ile `application.yml`/dokumanlarda public gorunen bazi endpoint'ler birebir ortusmeyebilir. Public/private varsayimini refactor ile bozmadan once gercek davranisi dogrulayin.
- Verify if changed: `spiritual-service` config'inde `permit-all` kolaylastirmasi mevcut. Bunu production standardi olarak kabul etmeyin.
- Verify if changed: admin portu dokumanlarda tutarsiz. Root dokumanlar `3001`, Next varsayimi ve bazi admin notlari `3000` diyor. Calisma seansinda gercek portu environment'a gore dogrulayin.
- Verify if changed: premium ekran var, fakat in-app purchase entegrasyonu halen placeholder/TODO seviyesinde gorunuyor. Unlock mantigini bu eksik akis etrafinda acele kalicilastirmayin.
- Verify if changed: Home icin `src/screens/HomeScreen.tsx` aktif route implementasyonu; `src/components/HomeV2` de repoda mevcut. Home refactor'unda aktif surface'i once route uzerinden teyit edin.

### Status Labels Used In This Document

- `Gozlem`: Kodda fiilen gorulen durum
- `Inferred convention`: Kod tabaninda baskin gorulen, fakat her yerde birebir zorlanmamis pattern
- `Target standard`: Mevcut karisiklik olsa da bundan sonra izlenmesi gereken tercih
- `Verify if changed`: Tarihsel/legacy veya environment'a bagli olabilir; degisiklikten once tekrar bak

## 1. Project Overview

Bu proje, astroloji, numeroloji, rüya yorumu, spirituel pratikler, bildirim ve tutorial akislari etrafinda kurgulanmis bir urun ailesidir. Repo ayni anda:

- Son kullaniciya donuk mobil uygulamayi (`mysticai-mobile`)
- Operasyon ve icerik yonetimi icin admin panelini (`mystic-admin`)
- Domain ayrimli backend servislerini
- API gateway ve service discovery katmanini
- AI destekli yorum/orchestrator akisini
- CMS, route registry, navigation config ve app-config altyapisini
- QA, analytics ve go-live runbook'larini

barindirir.

Ana product/domain alanlari:

- Kimlik dogrulama ve onboarding
- Home/oracle/daily guidance
- Natal chart ve astroloji hesaplamalari
- Daily transits, cosmic planner, decision compass
- Compatibility / compare / star mate
- Dreams
- Numerology ve name analysis
- Spiritual practice / prayer / meditation
- Notification, tutorial, remote config, CMS
- Admin operasyonlari ve route sync
- Internal AI orchestration ve vision

Bu dokumanin amaci:

- AI agent'in degisiklikten once dogru bounded context'i secmesini saglamak
- Mevcut foundation'i bozmayi azaltmak
- Parallel state / parallel config / parallel route / parallel analytics sistemleri olusmasini onlemek
- Domain ownership, kalite beklentisi ve degisiklik disiplini konusunda ortak zemin saglamak

AI agent neden bunu once okumali:

- Cunku bu repoda bir ekran degisikligi sadece UI degisikligi olmayabilir; route registry, app-config, tutorial, analytics, gateway, admin ve servis kontrati etkilenebilir.
- Cunku ayni domain icin legacy ve yeniye yakin yapilar bir arada bulunuyor.
- Cunku "benzer feature var mi?" sorusu bu repoda soyut bir prensip degil, somut bir maliyet azaltma aracidir.

## 2. Core Working Rules For AI Agents

### 2.1 Baslamadan Once

Kod yazmadan once asagidaki sorulari cevaplayin:

1. Bu degisiklik hangi bounded context'e ait?
2. Bu akis icin aktif owner hangi servis veya UI modulu?
3. Bu akis route, app-config, navigation veya tutorial tarafindan yonetiliyor mu?
4. Bu degisiklik analytics, auth header, DTO veya gateway rewrite etkiliyor mu?
5. Benzer feature zaten var mi?

### 2.2 Hangi Dosyalar Once Okunmali

Kural: Once en yakin giris noktasi, sonra sadece gerekli komsular.

Genel baslangic dosyalari:

- Root: `pom.xml`, `README.md`, `start-services.sh`, `docker-compose.yml`
- Mobil: `mysticai-mobile/src/app/_layout.tsx`, `mysticai-mobile/src/app/(tabs)/_layout.tsx`, `mysticai-mobile/src/services/api.ts`, `mysticai-mobile/src/config/env.ts`
- Admin: `mystic-admin/src/app/layout.tsx`, `mystic-admin/src/app/providers.tsx`, `mystic-admin/src/lib/api.ts`
- Gateway: `api-gateway/src/main/java/com/mysticai/gateway/config/GatewayConfig.java`
- Config backbone: `notification-service` altindaki app-config / navigation / route registry kodlari

Tum repoyu ancak su durumlarda tarayin:

- Cross-cutting bir degisiklik varsa
- Gateway / auth / analytics / tutorial / route registry etkisi varsa
- Bir endpoint'in birden fazla consumer'i olabilir diye suphe varsa
- Domain owner belirsizse

### 2.3 Existing Pattern'i Bozma

Bu repoda en guclu kural:

Mevcut foundation'i genislet. Paralel sistem kurma.

Ornekler:

- Remote module visibility gerekiyorsa `notification-service` app-config omurgasini genislet; ekran icinde local hardcode ac/kapa yapma.
- Yeni tutorial gerekiyorsa `src/features/tutorial/*` temelini genislet; ekran icinde izole tooltip sistemi kurma.
- Yeni analytics gerekiyorsa `src/services/analytics.ts` uzerinden ilerle; feature icinde baska event client'i baslatma.
- Yeni admin endpoint gerekiyorsa `mystic-admin/src/lib/api.ts` icine typed client ekle; sayfa icinde daginik `fetch` cagrilari yapma.
- Yeni mobil network entegrasyonu gerekiyorsa `mysticai-mobile/src/services/*` katmanina ekle; ekranda direkt `axios` olusturma.
- Yeni route/deeplink davranisi gerekiyorsa `notificationDeepLink.ts`, route registry ve navigation config zincirini koru; sadece UI tarafinda if/else ile cozmeye calisma.

### 2.4 Yeni Abstraction Acmadan Once Kontrol Et

Mobil:

- `src/components/ui`
- `src/components/<feature>`
- `src/features`
- `src/services`
- `src/store`
- `src/spiritual/*`

Admin:

- `src/lib/api.ts`
- `src/types/index.ts`
- `src/components/layout`
- Ilgili modulin var olan form/list/detail pattern'i

Backend:

- Ayni servis icindeki mevcut `controller / service / repository / dto / entity / exception` yapisi
- `mystic-common` icinde gercekten cross-service paylasilan bir ihtiyac var mi

Not: `mystic-common` su anda minimaldir; fiilen yalnizca AI event class'lari vardir. Yeni ortak business rule tasimak icin varsayilan hedef burasi degildir.

### 2.5 Minimal Safe Change

Target standard:

- Kullanici istemedikce buyuk rewrite yapma
- Bir bug icin ekranin tamamini yeniden yazma
- Uretimde calisan pattern'i sirf daha "temiz" gozukuyor diye topluca degistirme
- Kucuk fix ile mimari degisikligi ayirt et

Bu repoda ozellikle kacinilmasi gereken hata:

- Var olan buyuk bir ekran dosyasini gorup sifirdan baska architecture kurmak

Daha dogru yaklasim:

- Lokal extraction
- Mevcut section/component ayrimini genisletme
- Var olan service/hook/store akisini koruma

### 2.6 Root Cause Fix > Surface Patch

Surface patch sadece gercek root cause analizinden sonra kabul edilebilir.

Arastirma sirasinda tipik root cause katmanlari:

- Yanlis gateway route veya path rewrite
- Yanlis header propagation (`X-User-Id`, `Authorization`, `X-Admin-*`)
- DTO / mapper uyumsuzlugu
- App-config / route registry / tutorial registry eksigi
- Query cache / persisted state stale verisi
- Timezone veya birth-data dogrulama problemi
- Legacy service ile aktif service'in karistirilmasi

### 2.7 Backward Compatibility

Bu repoda backward compatibility kritik alanlar:

- Gateway route'lari ve rewrite'lar
- Public mobile endpoint path'leri
- Admin API contract'lari
- Analytics event isimleri ve property adlari
- Notification route key'leri
- Tutorial key ve analytics key'leri
- DB schema ve enum degisiklikleri

Bir degisiklik bu alanlardan birine dokunuyorsa impact analizi yapmadan ilerlemeyin.

### 2.8 Mock Yerine Gercek Akisi Koru

Gozlem:

- Mobil env'de `mockEnabled` kavrami var.
- `ai-orchestrator` icinde mock fallback bulunuyor.

Kural:

- Mock'lar sadece kontrollu fallback veya development kolaylastirmasi icin vardir.
- Gercek entegrasyonu ortadan kaldiran kalici "mock-first" cozumler eklemeyin.
- "Simdilik mock kalsin" karari ancak acikca istenmisse kabul edilir.

### 2.9 Prod-Ready Dusun

Kod degisikligi su sorulari gecmeli:

- Basarisiz oldugunda ne olur?
- Timeout / retry / empty state davranisi var mi?
- Analytics ve logging izi var mi?
- Backward compatibility bozuluyor mu?
- Config yoksa ne olacak?
- Kullaniciya gordugu hata anlasilir mi?

### 2.10 DO / DON'T

Do:

- Once mevcut implementation'i bul
- Benzer feature'i referans al
- Minimal ama tamamlanmis degisiklik yap
- Route/config/tutorial/analytics etkisini kontrol et
- Test veya manual QA notunu acik birak

Don't:

- Benzer pattern varken yeni pattern icat et
- App-config ile yonetilen bir seyi ekranda hardcode et
- DTO yerine entity dondurmeye kay
- UI'da sessizce hata yut
- Gateway/giris katmanini gormeden endpoint owner varsay

### 2.11 AI Decision Rules

Bu matris, degisiklikten once hizli karar vermek icin kullanilsin:

| Soru | Evetse | Hayirsa |
| --- | --- | --- |
| Degisiklik local mi global mi? | Global ise impact map cikar: consumer'lar, gateway, analytics, tests | Local ise bounded context icinde kal |
| Mevcut foundation var mi? | Onu genislet, paralel sistem kurma | Benzer feature ara; yine yoksa yeni yapıyi minimal kur |
| Benzer feature mevcut mu? | Ayni naming, state, UI ve service pattern'ini izle | Once neden benzerinin olmadigini anla |
| Backward compatibility riski var mi? | Alias, migration, rollout veya compatibility notu ekle | Sade degisiklik yap ama yine consumer kontrolu yap |
| Analytics etkisi var mi? | Event ekle/guncelle, duplicate fire kontrol et, QA notu yaz | Analytics gerekmiyorsa neden gerekmedigini acikla |
| Navigation etkisi var mi? | Expo route, tab layout, route key, deep link ve app-config zincirini kontrol et | Sadece lokal UI degisikligi olarak tut |
| API contract etkisi var mi? | DTO, gateway, admin/mobile client, tests ve docs guncelle | Service icinde kalabiliyorsa public kontrati bozma |
| UI state etkisi var mi? | Loading, empty, error, retry ve stale/fallback durumlarini ekle | Gorunur state degisikligi yoksa gereksiz loading katmani ekleme |
| Test / regression etkisi var mi? | Ilgili testleri ekle/calitir; minimum manual QA akisini yaz | Gene de en az bir smoke kontrol dusun |

## 3. Repository / Monorepo Structure

### 3.1 Root Yapisi

| Yol | Sorumluluk | Not |
| --- | --- | --- |
| `pom.xml` | Java monorepo modul manifesti | Aktif backend servislerini burada dogrula |
| `start-services.sh` | Lokal servis bootstrap akisi | Servislerin beklenen baslangic sirasi icin guvenilir |
| `docker-compose.yml` | Infra servisleri | Postgres, Redis, RabbitMQ, Mailhog ve bazi ops servisleri |
| `Makefile` | Kisa operasyon komutlari | Legacy hedefler de var; source of truth degil |
| `docs/` | Runbook, QA checklist, analytics notlari | Moduler ve degerli; ama once kod |
| `mysticai-mobile/` | React Native + Expo istemci | Son kullanici uygulamasi |
| `mystic-admin/` | Next.js admin paneli | Config, content, route, tutorial, ingestion operasyonlari |

### 3.2 Backend Modulleri

`pom.xml` icindeki aktif backend modulleri:

- `mystic-common`
- `service-registry`
- `api-gateway`
- `auth-service`
- `astrology-service`
- `ai-orchestrator`
- `numerology-service`
- `dream-service`
- `oracle-service`
- `notification-service`
- `vision-service`
- `spiritual-service`

### 3.3 Ana Klasorlerin Sorumlulugu

#### `mysticai-mobile/`

- Expo Router tabanli mobil istemci
- Route dosyalari `src/app`
- Paylasilan UI `src/components`
- Feature-level foundation `src/features`
- API/service katmani `src/services`
- Zustand store'lar `src/store`
- Theme/token yapisi `src/theme`
- Spiritual bounded context icin ayrik alt yapi `src/spiritual`

#### `mystic-admin/`

- Next App Router tabanli admin
- Route ve sayfalar `src/app`
- API client `src/lib/api.ts`
- Auth/role helper'lari `src/lib/auth.ts`
- Tip merkezi `src/types/index.ts`
- Layout ve reusable admin component'leri `src/components`
- Tutorial config icin daha feature-based bir modul `src/modules/tutorial-config`
- Route manifest/sync script'leri `scripts/`

#### `api-gateway/`

- Tum istemciler icin ana ingress
- Service discovery ve route forwarding
- Header propagation
- JWT dogrulama ve public/private path ayrimi

#### `service-registry/`

- Eureka tabanli servis kaydi

#### `auth-service/`

- Login, register, refresh token, email verification, password reset
- Profil ve onboarding temel kullanici alanlari

#### `astrology-service/`

- Natal chart, daily transits, cosmic planner, decision support, horoscope, compare/match, active dreams API
- Astro domain'in agirligi burada

#### `numerology-service/`

- Public numerology hesaplayici
- Name ingestion, merge queue, canonical names ve admin akislar

#### `notification-service/`

- Bildirimler
- Route registry
- Navigation config
- App config
- CMS content
- Tutorial config
- Admin API

Bu servis repo genelinde cross-cutting backbone rolundedir.

#### `oracle-service/`

- Kisisel daily summary / oracle type aggregate response
- Numerology + astrology + dream + sky pulse verisini birlestirir

#### `ai-orchestrator/`

- LLM provider secimi, fallback zinciri, timeout/cooldown/retry
- Domain servislerinden dogrudan provider entegrasyonu acmak yerine referans alinmasi gereken yer

#### `spiritual-service/`

- Prayer, asma, meditation, favorites, logs, stats, preferences
- Idempotency destegi olan practice/log akislar

#### `vision-service/`

- Gorsel upload / analysis akislari
- RabbitMQ ile event'li isleme

#### `dream-service/`

- Ayrik dream servisi
- Mevcut mobil akisla cakisabilecek legacy/parallel durum gosteriyor
- Dream domain degisikliginde aktif owner once dogrulanmali

#### `mystic-common/`

- Minimal ortak Java modul
- Su an agirlikli olarak AI event class'lari iceriyor

### 3.4 Kritik Giris Noktalari

- Mobil bootstrap: `mysticai-mobile/src/app/_layout.tsx`
- Tab bootstrap: `mysticai-mobile/src/app/(tabs)/_layout.tsx`
- Home route: `mysticai-mobile/src/app/(tabs)/home.tsx`
- Mobil API client: `mysticai-mobile/src/services/api.ts`
- Mobil env/config: `mysticai-mobile/src/config/env.ts`
- Admin bootstrap: `mystic-admin/src/app/layout.tsx`
- Admin provider/query setup: `mystic-admin/src/app/providers.tsx`
- Admin API client: `mystic-admin/src/lib/api.ts`
- Gateway route config: `api-gateway/src/main/java/com/mysticai/gateway/config/GatewayConfig.java`
- Auth header/JWT flow: gateway security/filter class'lari
- Notification backbone: `notification-service` icindeki route/navigation/app-config/tutorial controller ve service'leri
- Numerology ingestion runbook: `numerology-service/README-name-ingestion.md`

### 3.5 Kisa Mimari Ozeti

Istemci katmani:

- `mysticai-mobile`
- `mystic-admin`

API girisi:

- `api-gateway`

Domain servisleri:

- auth
- astrology
- numerology
- oracle
- notification
- spiritual
- dream
- vision

Internal orchestration:

- `ai-orchestrator`

Infra:

- PostgreSQL
- Redis
- RabbitMQ
- Mailhog
- Micrometer/Zipkin/Prometheus/Grafana ops altyapisi

## 4. Architecture Principles

### 4.1 Baskin Mimari

Gozlem:

- Backend tarafi domain-ayrimli microservice mimarisi kullaniyor.
- Mobil taraf route-driven ama feature ve service katmanlariyla desteklenen hibrit bir yapi kullaniyor.
- Admin taraf sayfa merkezli ancak typed API client ve reusable admin component pattern'i ile ilerliyor.

### 4.2 Backend Service Sinirlari

Preferred:

- Auth ile kullanici yasam dongusu `auth-service` icinde kalir
- Astroloji hesabi ve yorum akislari `astrology-service` ownerligindedir
- Numerology public calc ve name ingestion `numerology-service` ownerligindedir
- Content/config/navigation/tutorial `notification-service` ownerligindedir
- Aggregate daily secret/oracle `oracle-service` ownerligindedir
- Spirituel pratik state'i `spiritual-service` ownerligindedir
- AI provider secimi `ai-orchestrator` ownerligindedir

Avoid:

- Bir servisin business rule'unu baska serviste kopyalayarak yeniden yazmak
- "Kolay oldugu icin" content/config bilgisini mobilde hardcode etmek

### 4.3 Mobilde Screen / Hook / Service / Component Ayrimi

Inferred convention:

- Route dosyasi (`src/app/...`) ekran girisidir
- Network cagrilari `src/services/*` icinde olmalidir
- Reusable UI parcalari `src/components/*` altina gitmelidir
- Feature omurgasi gereken alanlar `src/features/*` altina alinmalidir
- Cross-screen kalici state `src/store/*` veya feature store'larinda tutulmalidir
- Spiritual alaninda ayrik bir bounded context vardir; yeni spiritual akislar burada kalmalidir

Not:

Bazi route dosyalari oldukca buyuktur. Bu "ek logic eklemek icin en dogru yer burasi" anlamina gelmez. Target standard, buyumeye devam eden ekranlarda yerel component/hook extraction yapmaktir.

### 4.4 Thin Controller, Explicit Service Rules

Backend icin target standard:

- Controller request/response, validation girisi ve status code ile ilgilenir
- Service business logic, transaction siniri, orchestration ve domain guard'lari tasir
- Repository persistence ile sinirlidir
- DTO/record/entity ayrimi korunur

Gozlem:

- Bircok servis bunu izliyor
- Bazi controller'larda ekstra orchestration veya mapping var; bunlari yeni kodda yaymayin

### 4.5 Business Logic Nereye Konmali

Olmasi gereken yerler:

- Java servisleri
- Mobilde domain/service helper'lari
- Feature-level engine/modeller

Olmamasi gereken yerler:

- UI render block'lari icinde agir business rule
- JPA entity icinde UI mantigi
- Admin page component'lerinde daginik kontrat cevirileri

### 4.6 Shared Logic Nereye Konmali

Kural:

- Gercekten cross-service olmayan mantigi `mystic-common` icine tasimayin
- Ortak ihtiyac ayni servis/bounded context icinde reuse edilmelidir
- Ortak event contract'lari ve cok temel util'ler shared'e cikabilir

### 4.7 Cross-Cutting Concern'lerin Yeri

- Auth: gateway JWT + servis bazli security config
- User context: `X-User-Id`, `X-Username`
- Admin context: `X-Admin-Id`, `X-Admin-Email`, `X-Admin-Role`
- Validation: Bean Validation, TypeScript runtime checks, admin tarafinda `zod` / `react-hook-form`
- Analytics: mobilde `src/services/analytics.ts`, tutorial icin `src/features/tutorial/analytics/*`
- Caching: Redis, React Query persister, servis bazli cache/fallback'lar
- Error handling: Spring `@ControllerAdvice`, mobil `ErrorStateCard`, typed error/fallback davranislari
- Observability: log + Micrometer + tracing altyapisi

## 5. Technology Stack

### 5.1 Backend

- Java 21
- Spring Boot 3.4.x
- Spring Cloud Gateway
- Eureka service discovery
- Spring Data JPA
- PostgreSQL
- Redis
- RabbitMQ
- Resilience4j
- Micrometer / Zipkin
- Flyway (servis bazli, karisik adoption)
- WebFlux/Project Reactor (`oracle-service` ve bazi orchestration akislarinda)

### 5.2 Mobile

- React Native 0.81
- Expo SDK 54
- Expo Router
- TypeScript
- TanStack Query
- Zustand
- AsyncStorage persistence
- i18n / locale altyapisi
- Theme provider ve token yapisi
- NativeWind dependency olarak mevcut, ancak UI'nin buyuk bolumu custom `StyleSheet` + theme/token pattern'i ile yazilmis

### 5.3 Admin

- Next.js 16 App Router
- React 19
- TypeScript
- TanStack Query
- react-hook-form
- zod
- Tailwind CSS 4

### 5.4 Build / Package / Tooling

- Backend: Maven multi-module
- Mobile/Admin: npm tabanli
- Infra bootstrap: docker-compose
- Service startup: shell script + local Java process

### 5.5 Test / QA Tooling

- JUnit 5
- Mockito
- Spring Boot test
- Manuel QA checklist'leri
- Analytics dashboard/runbook dokumanlari

### 5.6 API / Integration Katmani

- Mobil `axios` wrapper: `mysticai-mobile/src/services/api.ts`
- Admin `axios` wrapper: `mystic-admin/src/lib/api.ts`
- Gateway routing ve rewrite kurallari
- Internal AI provider orchestration: `ai-orchestrator`

### 5.7 Config / Env Yonetimi

- Mobil: `src/config/env.ts`
- Backend: `application.yml` + env override
- Admin: Next env + browser localStorage token akisi

### 5.8 Analytics / Monitoring / Notification / Auth

- Analytics: Amplitude HTTP API destekli mobil abstraction
- Monitoring: Micrometer/Zipkin/Prometheus/Grafana baglamlari
- Notification backbone: `notification-service`
- Auth: JWT refresh/access, email verification, social auth, admin JWT

## 6. Domain & Product Modules

Bu bolum AI agent'in dogru owner secmesi icin en degerli alanlardan biridir.

### 6.1 Auth & Onboarding

- Amac: Kullaniciyi kaydetmek, dogrulamak, profil/onboarding verisini toplamak
- Mobil yuzeyler:
  - `mysticai-mobile/src/app/(auth)/*`
  - welcome, email register, verify-email, birth date/time/city/country, gender, marital status, focus point, notification permission
- Backend owner: `auth-service`
- Ana veri:
  - email, password/social auth
  - birth data
  - timezone
  - profil tercihleri
- Ozel dikkat:
  - birth data astro/numerology hesaplamalarini dogrudan etkiler
  - email verification ve resend akislari rate limit/cooldown tasir
  - auth header ve token handling tum repo icin temel etkendir
- Analytics:
  - auth event'leri feature bazli snake_case pattern'i izliyor
- Existing foundation:
  - onboarding route group ve auth store

### 6.2 Home / Oracle / Daily Summary

- Amac: Kullaniciya gunluk ozet, widget'lar, CMS sections, oracle/daily insight sunmak
- Mobil yuzeyler:
  - `src/app/(tabs)/home.tsx`
  - `src/screens/HomeScreen.tsx`
- Ana veri kaynaklari:
  - `oracle-service`
  - `notification-service` CMS endpoints (`home-sections`, `banners`)
  - astrology/numerology ozetleri
- UI sorumlulugu:
  - widget compositing
  - skeleton ve retry
  - CMS card/section render
- Backend bagimliliklari:
  - `oracle-service`
  - `notification-service`
  - dolayli olarak astrology/numerology/dream
- Analytics:
  - `home_view`, `home_content_loaded`, widget click/view event'leri
- Ozel dikkat:
  - Home'da CMS fallback davranisi var; content fetch hatasi tum ekranin cökmesine yol acmamalidir
  - Verify if changed: `HomeV2` asset/komponentleri mevcut; aktif render yolunu route uzerinden teyit edin

### 6.3 Natal Chart / Astrology Core

- Amac: Natal chart hesaplama, AI yorumlari, teknik panel ve related astrology features
- Mobil yuzeyler:
  - `src/app/(tabs)/natal-chart.tsx`
  - astro component'leri `src/components/Astrology/*`
- Backend owner: `astrology-service`
- Ana veri:
  - birth date/time/city/timezone
  - Swiss Ephemeris calculation
  - stored natal chart JSON alanlari
- Analytics:
  - ekran/fonksiyon bazli feature event'leri
- Ozel dikkat:
  - Timezone/DST dogrulugu kritik
  - `project-astrology-numerology` skill'indeki D026/D027/D028 bug pattern'leri bu alan icin gercek risktir
  - Root-cause analizinde her zaman input normalization ve coordinate/timezone path'ini kontrol edin
- Existing foundation:
  - calculator/service/persistence ayrimi
  - dedicated component set

### 6.4 Daily Transits / Cosmic Planner / Decision Support

- Amac:
  - gunluk transit ozeti
  - aksiyon onerileri
  - takvim/planner dagilimi
  - karar pusulasi
- Mobil yuzeyler:
  - `src/app/(tabs)/daily-transits.tsx`
  - `src/app/(tabs)/today-actions.tsx`
  - `src/app/(tabs)/calendar.tsx`
  - decision compass ekranlari
- Backend owner: agirlikli `astrology-service`
- UI sorumlulugu:
  - date-driven state
  - filter chips
  - cards, bottom sheet, retry ve skeleton state'leri
- Analytics:
  - screen view, retry, CTA ve category click event'leri beklenir
- Ozel dikkat:
  - tarih degisiminde cache invalidation davranisi tab layout tarafinda mevcut
  - karar pusulasi ve planner icin var olan design token/component foundation'ini koruyun
- Existing foundation:
  - `src/features/planner`
  - `src/components/decision-compass/*`

### 6.5 Compare / Compatibility / Star Mate

- Amac:
  - iki kisi arasindaki uyum, yorum, technical metrics, save/share akislar
  - star mate discovery/premium spotlight yuzeyi
- Mobil yuzeyler:
  - `src/app/(tabs)/compatibility.tsx`
  - `src/app/(tabs)/compare/*`
  - `src/app/(tabs)/star-mate.tsx`
- Backend owner:
  - `astrology-service` people/synastry/match endpoints
- Analytics:
  - view, retry, save/share ve category-level event'ler beklenir
- Ozel dikkat:
  - `docs/COMPARE_V3_QA_CHECKLIST.md` bu alan icin gercek referans dokumandir
  - missing birth time, confidence damping, deterministic drivers gibi logic'ler testlerle korunuyor
- Existing foundation:
  - Compare V3 component set
  - `MatchTraitsServiceTest` ile desteklenen domain mantigi

### 6.6 Dreams

- Amac: Dream capture, interpretation, symbol meaning, history, monthly story
- Mobil yuzeyler:
  - `src/app/(tabs)/dreams.tsx`
  - `src/components/DreamDictionary.tsx`
- Backend owner:
  - Gozlem: aktif mobil API buyuk olasilikla `astrology-service` altindaki dreams controller
  - Verify if changed: `dream-service` paralel/legacy owner olabilir
- Analytics:
  - dream entry/result/retry/help pattern'leri tutorial registry'de de karsilik bulur
- Ozel dikkat:
  - Hangi servisin aktif owner oldugunu endpoint path'ine gore dogrulayin
  - Dream text PII/sensitive content gibi ele alinmali
- Existing foundation:
  - dream tab + dictionary + analytics + tutorial registry

### 6.7 Numerology

- Amac:
  - public numerology hesaplama
  - premium section lock mantigi
  - stale cache / partial response durumlari
- Mobil yuzeyler:
  - `src/app/numerology.tsx`
- Backend owner: `numerology-service`
- Ana veri:
  - birth date, optional name
  - deterministic numerology engine output
- Analytics:
  - `docs/analytics/numerology-events.md` source of truth kabul edilsin
  - `entry_point`, `locale`, `response_version`, load/retry/share vb. alanlar ozellikle kritik
- Ozel dikkat:
  - Event isimlerini bu moduldaki mevcut pattern'i bozmadan genisletin
  - Premium lock state client tarafinda gecici/hardcoded sekilde bypass edilmemeli
- Existing foundation:
  - hesaplayici service
  - analytics dokumani
  - section lock helper'lari

### 6.8 Name Analysis / Name Ingestion

- Amac:
  - isim arama, detay, favori, anlamsal/islami/numerolojik metadata
  - admin tarafinda source ingestion, merge queue, canonicalization
- Mobil yuzeyler:
  - `src/app/(tabs)/name-analysis.tsx`
  - `name-search`, `name-detail`, `name-favorites`
- Admin yuzeyler:
  - name sources / names / merge queue ekranlari
- Backend owner: `numerology-service`
- Source of truth runbook:
  - `numerology-service/README-name-ingestion.md`
- Analytics:
  - numerology/name bridge ve ilgili screen events
- Ozel dikkat:
  - Bu alan baska feature'lara gore daha operasyonel ve data-governance agirliklidir
  - Scraper, merge, review, lock, audit log akislari zaten kurulmus durumda
- Existing foundation:
  - ingestion paket yapisi cok gelismis; bunu bypass eden yeni "quick import" yollari eklemeyin

### 6.9 Spiritual Practice

- Amac:
  - dua, esma, meditation, routine, journal/log, favorites, stats
- Mobil yuzeyler:
  - `src/app/(tabs)/spiritual/*` ve `src/spiritual/*`
- Backend owner: `spiritual-service`
- Ozel dikkat:
  - Bu bounded context'in kendi API/hook/store/offline queue yapisi var
  - Log endpoint'lerinde idempotency mantigi mevcut
  - Verify if changed: security tarafinda permit-all kolaylastirmasi gorunuyor; yeni kodu buna guvenerek tasarlamayin
- Analytics:
  - tutorial registry ve feature event pattern'leri uygulanmali
- Existing foundation:
  - offline pending log queue
  - spiritual-specific stores ve screens

### 6.10 Notifications / Tutorials / CMS / App Config / Navigation

- Amac:
  - uygulama modullerini, navigation surfacelerini, route registry'yi, CMS card'larini ve tutorial rollout'unu merkezden yonetmek
- UI owner:
  - mobil runtime consumer
  - admin configuration editor
- Backend owner: `notification-service`
- Admin yuzeyler:
  - notifications
  - routes
  - modules
  - navigation
  - CMS cards/banners
  - tutorial configs
- Route sync foundation:
  - `mystic-admin/scripts/generate-route-manifest.ts`
  - `mystic-admin/scripts/sync-routes.ts`
- Mobil bagimlilik:
  - `useAppConfigStore`
  - content service'leri
  - `notificationDeepLink.ts`
  - tutorial feature katmani
- Analytics:
  - tutorial event'leri ayrik foundation'a sahip
- Ozel dikkat:
  - Bu alan repo genelinde "existing foundation" olarak kabul edilmeli
  - Yeni module visibility, deep link permission, nav item veya tutorial davranisi buradan gecmeden yapilmamali

### 6.11 Admin Operations

- Amac:
  - internal operator experience
  - role-gated yonetim ekranlari
  - route sync ve content/config operasyonu
- Ana teknik omurga:
  - `src/lib/api.ts`
  - `src/lib/auth.ts`
  - `src/components/layout/AdminLayout.tsx`
- Ozel dikkat:
  - 401 durumunda client token temizleyip login'e doner
  - Role gating sidebar ve route seviyesinde dikkate alinmali
- Existing foundation:
  - typed API client groups
  - TanStack Query invalidation pattern'i

### 6.12 AI Orchestration & Vision

- `ai-orchestrator`
  - provider zinciri, timeout/cooldown/retry, fallback
  - internal AI gateway gibi dusunulmeli
- `vision-service`
  - upload / analysis / event-based processing
- Ozel dikkat:
  - Yeni AI provider entegrasyonu dogrudan domain servisine girmemeli; once orchestrator pattern'ini inceleyin
  - Mock fallback'i production default'una cevirmeyin

## 7. File Reading Strategy For AI

### 7.1 Genel Kural

Tum repoyu tarama. Once akisi daralt.

Izlenecek siralama:

1. Kullanicinin degistirmek istedigi yuzey veya endpoint
2. O yuzeyin route/giris dosyasi
3. Service/hook/store/DTO komsulari
4. Analytics/config/tutorial/deep link etkisi
5. Benzer feature referansi
6. Ancak gerekiyorsa daha genis repo taramasi

### 7.2 Bug Fix Ise

Mobil bug fix sirasiyla:

1. Route dosyasi
2. Ilgili component veya hook
3. `src/services/*`
4. `src/store/*` veya feature store
5. `src/services/analytics.ts` ve mevcut event noktasi
6. Gerekirse backend controller/service

Backend bug fix sirasiyla:

1. Gateway route/rewrite
2. Controller
3. Request/response DTO
4. Service
5. Repository/entity
6. Config (`application.yml`)
7. Testler
8. Consumer tarafi (mobil/admin)

### 7.3 UI Isi Ise

Once bak:

- `mysticai-mobile/src/app/_layout.tsx`
- Ilgili route dosyasi
- `mysticai-mobile/src/components/ui/*`
- `mysticai-mobile/src/theme/*`
- Ilgili feature component'leri
- `mysticai-mobile/src/app/(tabs)/_layout.tsx` eger tab/safe area/navigation etkisi varsa

Mutlaka kontrol et:

- `SafeScreen`
- `AppHeader` / `TabHeader`
- `Skeleton`
- `ErrorStateCard`
- mevcut card/badge/chip/bottom sheet pattern'i

### 7.4 Backend Endpoint Isi Ise

Okuma sirasi:

1. Gateway route
2. Controller
3. DTO / record
4. Service
5. Repository / external client
6. Exception handler
7. Service `application.yml`
8. Mobil/admin consumer

### 7.5 Analytics Isi Ise

Once bak:

- `mysticai-mobile/src/services/analytics.ts`
- Ilgili ekran/component event cagrilari
- `docs/analytics/numerology-events.md` gibi feature-specific docs
- `src/features/tutorial/analytics/*` eger tutorial ile iliskiliyse

Kural:

- Once mevcut event isimlendirmesini oku
- Sonra ayni feature'nin naming dilini koru
- Yeni event varsa common property set'ini dusun

### 7.6 Yeni Ekran Ekleyeceksen

Once kontrol et:

- Benzer bir ekran var mi?
- Route group hangisi olmali?
- Tab mi stack mi modal mi?
- Module visibility app-config'ten etkileniyor mu?
- Tutorial gerekir mi?
- Analytics gerekir mi?
- Empty/error/retry state ne olacak?

### 7.7 Yeni API Baglayacaksan

Referans al:

- Mobilde ilgili en yakin `src/services/*.ts`
- Adminde `src/lib/api.ts`
- Backendde benzer controller/service ciftleri
- Gateway rewrite gerekiyorsa var olan route naming pattern'i

### 7.8 Yeni Dosya Acmadan Once

Zorunlu aramalar:

- Ayni isim veya benzer sorumlulukta bir component/hook/service var mi?
- Ayni UI pattern'i baska feature'da cozulmus mu?
- Adminde typed API zaten var mi?
- Serviste ayni DTO zaten var mi?

## 8. Coding Standards

### 8.1 Genel Kalite Beklentisi

- Kod okunabilir olacak
- Birim sorumluluklari belli olacak
- Public davranislar acik olacak
- Failure mode dusunulmus olacak
- Yeni kod mevcut naming ve style pattern'ini izleyecek

### 8.2 Okunabilirlik

Preferred:

- Kisa ve acik isimler
- Erken return
- Belirgin guard clause
- Render ile business rule'u ayirmak

Avoid:

- 5 farkli sorumlulugu ayni fonksiyonda toplamak
- UI render block'larina data shaping gommek
- Endpoint cevaplarini ekranda inline normalize etmek

### 8.3 Fonksiyon Boyutu

Bu repoda sert bir satir limiti yok. Ancak target standard:

- Tek zihinsel birimi asan logic ayiklanmali
- Buyuyen ekranlarda section/component extraction yapilmali
- Reuse yoksa erken abstraction'a kacilmamali

### 8.4 Naming

- Java: siniflar ve DTO'lar acik domain isimleri tasir
- TypeScript: `camelCase`, `PascalCase`, `SCREAMING_SNAKE_CASE` sabitler
- Analytics event'leri: `snake_case`
- Route key / module key / tutorial key: mevcut registry naming'ini bozmayin

### 8.5 Magic Number / Magic String

Preferred:

- Theme token
- constants dosyasi
- feature-level enum/union
- service-level named constant

Avoid:

- UI icinde rastgele spacing/opacity/route string hardcode etmek
- analytics property adlarini her yerde farkli yazmak

### 8.6 Null / Undefined / Optional Data

Bu projede null riskinin yogun oldugu alanlar:

- app-config
- CMS content
- dream / oracle aggregate response
- numerology partial response
- birth time bilinmeme durumu
- optional premium sections

Kural:

- Null'i gormezden gelmeyin
- Empty/fallback davranisini bilincli tasarlayin
- UI ve service seviyesinde guard ekleyin

### 8.7 Defensive Coding

Ozellikle su durumlarda defensive olun:

- Header eksikligi
- Base URL/config eksikligi
- stale persisted state
- route key bulunamamasi
- inactive/maintenance module acilmasi
- external provider timeout'u

### 8.8 Comment Politikasi

- Kod kendi kendini anlatabiliyorsa yorum yazmayin
- Karmaşık decision branch veya non-obvious fallback varsa kisa yorum kabul edilir
- Eskiden kalan stale comment'leri source of truth gibi kullanmayin

### 8.9 Type Safety / DTO Disiplini

- UI katmani raw backend response'a dogrudan baglanmamali
- DTO/response mapping service veya domain helper katmaninda olmali
- Java entity'leri public API contract'i gibi expose edilmemeli

### 8.10 Error Mesajlari

- Kullaniciya yonelik hata metni anlasilir olmali
- Teknik detay gerekiyorsa log/observability katmaninda kalmali
- "Bir seyler ters gitti" tipindeki generic fallback son care olmali

### 8.11 Public API Degisiklikleri

Degisiklik yapmadan once kontrol listesi:

- Gateway route etkisi
- Mobil service etkisi
- Admin client etkisi
- Analytics / tutorial etkisi
- Test ve manual QA etkisi

### 8.12 Duplication Yonetimi

Target standard:

- Ikinci gercek kullanim ve ortak domain dili olustugunda extraction yap
- Tek seferlik farkli davranislari zorla genericlestirme

## 9. Frontend / Mobile Standards

### 9.1 Tasarim Sistemi Uyumu

Bu projede UI kararlarini su foundation belirler:

- `ThemeProvider`
- `src/theme/*`
- `components/ui/*`
- feature-specific token dosyalari (ornegin decision compass)

Preferred:

- Theme ve token kullan
- `SafeScreen` ile basla
- Ortak card, badge, chip, bottom sheet ve skeleton yapilarini kullan

Avoid:

- Inline renk sistemi olusturmak
- Var olan radius/spacing ritmini bozmak

### 9.2 Safe Area / Header / Tab Bar

- `SafeScreen` tercih edilen ekran wrapper'idir
- Tab davranisi `src/app/(tabs)/_layout.tsx` tarafindan yonetilir
- Header ve tab UI degisikligi yaparken layout seviyesini gormeden ekran icinden override etmeyin

### 9.3 Navigation Pattern'leri

Gozlem:

- Expo Router route group'lari aktif kullaniliyor
- `(auth)` ve `(tabs)` ayrimi temel

Kural:

- Yeni ekran eklerken mevcut route grup mantigina uy
- Notification/deep link ile acilabilecek ekranlarda `notificationDeepLink.ts` ve route key zincirini dusun
- Hidden module ile deeplink-allowed module ayrimi `useAppConfigStore` davranisina gore tasarlanir

### 9.4 Screen Composition

Preferred:

- Route dosyasi orkestrasyon yapsin
- Buyuk UI bloklari component'lere tasinsin
- Data fetch service/hook tarafinda kalsin
- Error/loading/empty state'ler ayri okunabilir bloklar olsun

### 9.5 Loading / Empty / Error / Retry

Target standard:

- Her network-odakli ekran en az bu 4 durumu dusunsun
- Skeleton varsa once mevcut `Skeleton` component'ini kullan
- Error state icin `ErrorStateCard` veya benzer feature-specific pattern kullan
- Empty state varsa domain diline uygun CTA ekle

### 9.6 List Rendering

- Uzun listelerde `FlatList` / `SectionList` pattern'ini koru
- Stabil `keyExtractor` kullan
- Buyuk dataset icin tum listeyi state'e kopyalama
- Name search/favorites gibi akislar mevcut pattern referansi verir

### 9.7 Form Yaklasimi

Mobilde formlar feature'a gore farkli yazilmis olabilir, ancak hedef:

- UI field component reuse et
- Validation ve disabled/loading state'leri acik kurgula
- Auth/onboarding form pattern'lerini referans al

### 9.8 Bottom Sheet / Modal / Card / Badge / Section

Mevcut reusable yapilar:

- `BottomSheet`
- `Card`
- `Badge`
- `Chip`
- `AccordionSection`
- feature-specific cards

Kural:

- Ayni tasarim dilini baska bir custom container ile bozmadan once mevcut component'leri tara

### 9.9 Theme / Dark Mode

Gozlem:

- Theme support ve persisted preference mevcut

Kural:

- Yeni UI sadece tek bir theme'de guzel gorunmesin
- Light/dark varyantlari theme token'lari uzerinden gelsin

### 9.10 Performance

- Gereksiz re-render tetikleyen state daginikligini azalt
- React Query server state'ini local state'e gereksiz kopyalama
- Memoization'i refleks olarak degil, gercek hotspot icin kullan
- Buyuk route dosyalarina yeni agir hesap gommek yerine helper/hook'a tasiyin

### 9.11 Accessibility

Gozlem:

- `AccessibleText` ve bircok `accessibilityLabel` kullanimi mevcut

Target standard:

- Dokunulabilir aksiyonlar label tasisin
- Dynamic type / max font size davranisi kritik ekranlarda korunmali
- Retry ve empty CTA'lari screen reader ile anlamli olmali

### 9.12 Offline / Fallback

- React Query persistence var
- Spiritual modulu offline queue tasiyor
- App config ve tutorial config tarafinda local/cache fallback var

Kural:

- Online kabul eden kirilgan akislari yaymayin
- Offline/stale durumu gorunurse kullaniciya makul fallback sunun

### 9.13 UI Parity

Bir ekrana yeni sey eklerken:

- mevcut spacing ritmi
- card hiyerarsisi
- renk dili
- iconografi
- loading/error dili

bozulmamalidir.

## 10. Backend Standards

### 10.1 Endpoint Naming

Gozlem:

- Public API'lerde baskin pattern `/api/v1/...`
- Numerology icin gateway tarafinda `/api/numerology/**` -> `/api/v1/numerology/**` rewrite var
- Auth hem legacy hem v1 path destekliyor

Target standard:

- Yeni public endpoint'lerde `/api/v1/{domain}` tercih edin
- Legacy alias gerekiyorsa compatibility sebebini not edin

### 10.2 DTO Kullanimi

- Request/response icin DTO veya `record`
- Entity'yi response olarak dogrudan expose etmeyin
- Validation annotation'larini request siniflarina koyun

### 10.3 Validation

- `@Valid` ve Bean Validation yeni endpoint'lerde varsayilan olsun
- User/admin header context'i dogrulanmadan business logic'e gecmeyin
- Astro/numerology input'larinda tarih/saat/timezone dogrulugu kritik kabul edilmeli

### 10.4 Mapping

Preferred:

- Mapping service veya mapper seviyesinde yapilsin
- Controller mapping coplugune donmesin

### 10.5 Exception Handling

- Servis bazli `@ControllerAdvice` pattern'i korunmali
- Tutarli `ErrorResponse` yapisi tercih edilmeli
- 4xx ile 5xx ayrimi net olmali

### 10.6 Logging

- PII veya token log'lama
- Domain event ve hata noktalarinda tanilayici log birak
- Gereksiz noisy log ile sinyali bogma

### 10.7 Transaction Sinirlari

- Transaction'lar service katmaninda tanimlanmali
- Repository chaining'i controller'a cikarmayin
- External call + DB write kombinasyonlarinda rollback/compensation dusunun

### 10.8 Cache Kullanimi

Gozlem:

- Oracle ve bazi aggregate akislar Redis cache kullaniyor
- Notification-service app-config/content tarafinda cacheable response mantigi var

Kural:

- Cache key semantigini acik tut
- Tarihe/locale'e/kullaniciya bagli response'lari dogru scope'la
- Cache invalidation etkisini not et

### 10.9 Idempotency

Gozlem:

- `spiritual-service` log endpoint'lerinde `Idempotency-Key` pattern'i var

Kural:

- Tekrarlanabilir user action endpoint'lerinde ayni pattern'i dusun
- UI retry'nin duplicate write'a donusmesini engelle

### 10.10 Auth Header / User Context

- Gateway downstream'e `X-User-Id` ve `X-Username` enjekte eder
- Admin client `X-Admin-*` header'lari yollar

Kural:

- Bu header'lari varsaymadan once security zincirini oku
- Header fallback/absence davranisi acik olsun

### 10.11 Pagination / Filter / Sort

- Admin listelerinde `Pageable` ve explicit filter/sort pattern'i tercih edilir
- Endpoint contract'inda field adlari tutarli ve anlamli olmali
- Bulk data donen endpoint'lerde limitsiz response vermeyin

### 10.12 External Provider Calls

Preferred:

- Timeout
- Retry
- Circuit breaker
- Fallback
- Gozlemlenebilir hata sinyali

Referans servisler:

- `oracle-service`
- `ai-orchestrator`

### 10.13 Database Entity Kurallari

- Audit alanlari ve enum'lari acik kullan
- Boolean JSON naming sorunu olan yerlerde mevcut `@JsonProperty("is...")` pattern'ini koru
- Breaking schema degisikliklerinde migration/backfill dusun

### 10.14 Migration Disiplini

Gozlem:

- Repo karisik durumda; bazi servisler Flyway'li, bazi servisler `ddl-auto: update`

Target standard:

- Schema degisikligini bilincli migration ile yonet
- `notification-service` tarafinda bile yeni riskli schema degisikliklerinde kontrolsuz Hibernate'e guvenme

### 10.15 Observability

- Hata, timeout ve fallback kararlarinda log ve metrik izi birak
- Silent degradation varsa bilincli ve olculur olsun

## 11. API Integration Rules

### 11.1 Mobil -> Backend

Akis:

1. Route / screen
2. Hook veya direct service usage
3. `src/services/api.ts`
4. Gateway
5. Domain service

Kural:

- Screen icinde ad-hoc HTTP client acma
- Auth/header logic'i merkezi client'ta kalmali

### 11.2 Admin -> Backend

Akis:

1. Admin page
2. `src/lib/api.ts`
3. Notification / numerology admin endpoint'i

Kural:

- Yeni endpoint kullanimini once typed admin client'a ekle
- Sayfada kopya baseURL/header handling yazma

### 11.3 Response Mapping

Preferred:

- service veya domain mapper

Avoid:

- JSX icinde ham API cevabini her render'da normalize etmek
- Ayni mapping'i uc ayri ekranda kopyalamak

### 11.4 API Contract Degisirse Kimler Etkilenir

Kontrol edilmesi gerekenler:

- Gateway rewrite
- Mobil service types
- Admin API types
- Tutorial / route / config consumer'lari
- Analytics property set'i
- QA dokumanlari

### 11.5 Mock Kullanimi

- Sadece development fallback veya explicit gecici ihtiyac icin
- Contract dogrulugu gereken islerde mock ile bitirme

### 11.6 Fallback Davranisi

Gozlem:

- App config local fallback kullanir
- CMS fetch'leri bos listeye degrade olur
- Oracle fallback synthesis yapabilir
- Tutorial config cache/local merge mantigi vardir

Kural:

- Fallback varsa kullanici deneyimini anlamli tut
- Fallback'i sessiz veri kaybi haline getirme

### 11.7 Error -> UI Mapping

- Network/config/auth/not-found durumlarini ayirt et
- Retry uygun mu degil mi kararini feature'a gore ver
- `ServiceNotConfiguredError` gibi bilinen siniflari yuzeye cevir

### 11.8 Loading Lifecycle

- Query basladi
- skeleton/loading render edildi
- success mapping yapildi
- error fallback gosterildi
- retry davranisi izlenebilir hale geldi

Bu dongu net degilse feature tamamlanmis sayilmaz.

### 11.9 Cache / Stale Data

- Mobilde React Query + AsyncStorage persister kullaniliyor
- Server state'i persisted stale state ile karistirmayin
- Query invalidation'i cercevesiz yapmayin; sadece ilgili key'leri hedefleyin

### 11.10 Gateway Varsa Route Disiplini

- Yeni endpoint acmadan once gateway degisikligi gerekip gerekmedigini kontrol et
- Rewrite kurali varsa consumer path'ini bozma
- Public/private davranis guvenlik filtresiyle uyumlu olmali

## 12. State Management Rules

### 12.1 Local State Ne Zaman

- Tek ekranlik form state
- UI toggle / modal / local filter
- Render yardimci state

### 12.2 Global / Shared State Ne Zaman

- Auth/session
- App config
- Tutorial progress
- Feature-level cross-screen draft veya preference
- Spiritual offline/persisted state

### 12.3 Server State vs UI State

Target standard:

- Server state: React Query
- Kalici/cross-session client state: Zustand + persistence
- Gecici UI state: component local state

Avoid:

- React Query datasini aynen store'a kopyalamak
- Store'a her API cevabini dump etmek

### 12.4 Existing Foundation

Gozlem:

- `useAppConfigStore`
- auth ve feature store'lari
- tutorial progress store
- spiritual bounded context store'lari
- star mate ve bazi feature store'lari

Kural:

- Yeni global state ihtiyacinda once bu store'lari incele

### 12.5 Persisted State Kurallari

- Persist edilen state version/risk dusunulerek tasinmali
- User-specific state'i logout ve user degisimlerinde temizleme ihtiyacini dusun
- Stale persisted state kaynakli bug ihtimalini goz ardi etme

### 12.6 Race Condition / Stale State

- Concurrent query + local mutation akisini dikkatle kurgula
- Date-sensitive alanlarda gun degisimi invalidation mantigini bozma
- Notification/deep link ile acilan ekranlarda route param ve config kontrolunu senkronize tut

### 12.7 Optimistic Update

Repo genelinde baskin bir optimistic update culture'u gorulmuyor.

Target standard:

- Sadece user value'su yuksek ve rollback'i net ise kullan
- Rollback ve invalidation olmadan optimistic update ekleme

### 12.8 Admin State

- Adminde server state icin TanStack Query yeterli temel
- Sayfa local state'i form/filter amacli tutulmali
- Gereksiz global admin store acmayin

## 13. Analytics & Event Instrumentation

### 13.1 Source Of Truth

Mobil analytics temeli:

- `mysticai-mobile/src/services/analytics.ts`

Feature-specific source of truth:

- `docs/analytics/numerology-events.md`
- `docs/analytics/numerology-amplitude-dashboard-template.md`
- `src/features/tutorial/analytics/*`

### 13.2 Event Naming Pattern

Gozlem:

- Naming tam uniform degil ama guclu sekilde feature-centric snake_case
- Ornekler: `home_view`, `numerology_screen_viewed`, `auth_resend_success`, `daily_transits_retry_tapped`

Target standard:

- Feature prefix'i koru
- `viewed`, `loaded`, `clicked`, `opened`, `submitted`, `retry_clicked`, `success`, `failed` gibi acik suffix'ler kullan
- Mevcut feature naming dilini bozacak toplu renaming yapma

### 13.3 Common Property Beklentileri

Feature'a gore degisir ama asagidakileri dusun:

- `entry_point`
- `locale`
- `user_id` veya anonim user bağlamı
- `is_premium_user`
- `response_version`
- `load_time_ms`
- `result` / `status`

Kural:

- Property adlarini feature dokumanina gore sec
- Null-rate'i dusuk tut

### 13.4 Screen / Load / Click Standardi

Target standard:

- Ekran ilk gorunur hale geldiginde bir view event'i
- Basarili yukleme varsa loaded event'i
- Kritik CTA'larda click event'i
- Retry varsa retry event'i
- Failure veya partial data goruluyorsa anlamli hata/partial event'i

### 13.5 Entry Point Takibi

Ozellikle numerology, tutorial ve cross-navigation alanlarinda `entry_point` kritiktir. Yeni feature ekranlarinda kullanici nereden geldi sorusunu mumkunse event'e tasiyin.

### 13.6 Duplicate Fire Onleme

- `useEffect` event'lerinde guard kullan
- Re-render ile event spam yaratma
- Query success callback ve render-time call'i ayni event icin iki kez kullanma

### 13.7 Event Eklerken Dokunulacak Yerler

Minimum:

- Ilgili screen/component/hook
- Gerekirse feature docs
- Gerekirse dashboard / QA checklist notu
- Tutorial olaylari etkileniyorsa tutorial analytics dosyalari

### 13.8 QA Beklentisi

- Debug mode veya local log ile event fire'i gor
- Property set'ini kontrol et
- Ekrani ac-kapa, retry, failure, deeplink senaryolarinda duplicate event var mi bak

### 13.9 Analytics'siz Feature Birakmama

Target standard:

- Kullaniciya gorunen yeni feature analytics'siz birakilmasin
- Cok kucuk purely static UI degisikligi disinda yeni etkileşimlerin izlenebilirligi dusunulsun

### 13.10 Verify If Changed

- `src/utils/notificationAnalytics.ts` gercek SDK entegrasyonu acisindan tamamlanmamis gorunuyor. Notification analytics degisikliginde once mevcut kullanim durumunu teyit edin.

## 14. Error Handling & Reliability

### 14.1 UI Hata Durumlari

- Error state gorunur olmali
- Retry uygun ise sunulmali
- Permanent failure ile temporary network failure ayrilmali

### 14.2 API Hata Yonetimi

- 401 merkezi davranislarla ele alinmali
- 4xx ve 5xx ayni sekilde gizlenmemeli
- Contract mismatch'te silent parse fail yapma

### 14.3 Global Exception Handling

- Servis bazli `@ControllerAdvice` pattern'i korunmali
- Validation hatalari acik donmeli

### 14.4 Retry Mantigi

Gozlem:

- Mobil query client retry limiti kontrollu
- Bazi hooks ozellestirilmis retry kullaniyor

Kural:

- Sonsuz retry yok
- Duplicate write riski olan call'larda idempotency veya retry disiplini dusun

### 14.5 User-Facing Hata Metinleri

- Domain'e uygun ol
- Teknik jargon kullanma
- Gerekirse ne yapmasi gerektigini soyle

### 14.6 Silent Failure'dan Kacin

Gozlem:

- Bazi content endpoint'leri bos listeye degrade oluyor

Kural:

- Bu tip gracefull degrade davranislarda bile telemetry veya en azindan log izi olsun
- UI tamamen bos kaliyor ise kullaniciya nedenini anlat

### 14.7 Null / Partial Data

- Numerology partial response
- CMS missing content
- Missing birth time
- Optional dream analytics

Bu alanlarda partial render + warning + retry kombinasyonu daha guvenlidir.

### 14.8 Crash Riskli Alanlar

- Timezone / date parsing
- Route param parsing
- persisted state hydration
- deep link to inactive module
- AI/provider empty response handling

## 15. Performance Guidelines

### 15.1 Mobil Render Performansi

- Buyuk route dosyalarini daha da buyutme
- Repeated inline object/function olusturmayi kritik sıcak path'lerde azalt
- Query datasini gereksiz transform zincirlerine sokma

### 15.2 Agir Hesaplarin Yeri

- Astro/numerology ana hesap mantigi backend veya dedicated engine katmaninda kalmali
- UI thread'e agir hesap gommeyin

### 15.3 Lazy Load / Pagination / Batching

- Admin listelerinde pagination tercih edin
- Mobilde uzun listelerde incremental yukleme dusunun
- Buyuk admin datasets'i tek shot indirmeyin

### 15.4 Query ve Fetch Disiplini

- Selective fetching yap
- Ayni ekran icinde ayni datayi iki client cagrisi ile alma
- Query key standardini bozma

### 15.5 Backend Performans Riskleri

- N+1 query
- asiri buyuk JSON serialization
- gereksiz synchronous external call zinciri
- cache'siz pahali aggregate response

### 15.6 Mobile Startup / Screen Load

- `_layout` seviyesinde eklenen her yeni bootstrap isi startup maliyetidir
- Global provider'a yeni dependency eklerken dikkatli olun

### 15.7 Animation / Visual Effect Dengesi

- Tab bar ve premium benzeri gorsel alanlarda mevcut efekti bozmayin
- Animasyonlar UI hissini guclendirsin; frame drop yaratmasin

## 16. Security & Privacy

### 16.1 Secret Yonetimi

- Secret'lar env/config'te kalmali
- Client bundle icine private key gomulmez
- `EXPO_PUBLIC_*` sadece public olmasi kabul edilen ayarlar icindir

### 16.2 Token / Auth Bilgisi

- Token log'lama
- Header manipülasyonunu merkezi client disina yayma
- 401 davranisini sessizce bypass etme

### 16.3 PII Kurallari

Bu projede hassas veri sayilabilecek alanlar:

- dogum tarihi / saati / yeri
- rüya metinleri
- email
- kullanici tercihleri
- prayer/journal kayitlari

Kural:

- Bu verileri log'larda maskelemeden kullanma
- Hata mesajlarina ham PII koyma

### 16.4 Validation

- Input validation hem istemci hem sunucu tarafinda dusunulmeli
- Birth data, timezone ve free-text alanlar ekstra dikkat ister

### 16.5 Authorization vs Authentication

- Authenticated olmak yetki sahibi olmak demek degil
- Admin endpoint'leri icin role gating korunmali
- User header'i alip business action yapmak yeterli sayilmaz; endpoint guvenlik semantigini koru

### 16.6 External API Key ve Provider Yonetimi

- AI provider anahtarlari
- mail / push / places / timing servisleri

icin hardcode yerine config kullanin.

### 16.7 Shortcut'lardan Kacin

- Local `permit-all` veya mock fallback'i kalici production cozumune cevirmeyin
- Security acigini "dev convenience" diye normalize etmeyin

## 17. Testing Expectations

### 17.1 Ne Zaman Unit Test

- Deterministic domain logic
- Numerology calculation helper'lari
- Astrology scoring/mapping logic
- Validation helper ve mapping fonksiyonlari

### 17.2 Ne Zaman Integration Test

- Auth akislari
- Controller + service + repository zinciri
- Admin endpoint security / role gating
- Route sync / config composition
- Dream/compare/oracle gibi multi-dependency akislar

### 17.3 Manual QA'nin Yetmedigi Alanlar

- Timezone / date correctness
- Compare scoring
- Name ingestion merge/review akislar
- Auth token/refresh flow
- Gateway route degisiklikleri

### 17.4 Bug Fix Sonrasi Regresyon

Her bug fix'te en az su kontrol edilmeli:

- Ana happy path
- Kotu input veya bos veri
- Retry/loading davranisi
- Analytics event fire'i

### 17.5 Kritik User Path'ler

- Signup / login / verify email
- Natal chart olusumu
- Home/oracle yuklenmesi
- Numerology hesaplama
- Dream save + interpretation
- Compare save/load
- Spiritual log akisi
- Notification deep link acilisi

### 17.6 Analytics QA

- Yeni event eklendiyse manual QA zorunlu
- Duplicate fire ve missing property kontrol edilmeli

### 17.7 UI Durum Testleri

Bu repoda mobil/admin otomatik UI testi baskin degil.

Target standard:

- En azindan manual smoke senaryosu yaz
- Loading / empty / error / retry durumlarini gormeden feature'i tamamlanmis sayma

### 17.8 Backend Contract Test

Gozlem:

- Acik bir contract test suite baskin gorunmuyor

Target standard:

- Public contract degisikliklerinde controller/integration test ve consumer manual verification birlikte dusunulsun

### 17.9 Test Eklenemiyorsa

Final notta mutlaka belirt:

- Neden eklenemedi
- Hangi risk kaldi
- Hangi manual kontrol yapildi

## 18. Definition Of Done

Bir is ancak asagidakiler saglandiginda tamamlanmis sayilir:

- Kod derlenebilir / calisir durumda
- Ilgili type/lint/compile problemi yok
- Mevcut akisi bozmuyor
- Loading / empty / error / retry dusunulmus
- Analytics gereksinimi degerlendirilmis
- Navigation / route / deep link etkisi kontrol edilmis
- App-config / tutorial / CMS etkisi kontrol edilmis
- Gerekli test veya manual QA yapilmis
- Gerekirse docs guncellenmis
- Gerekirse migration/backfill/config notu dusulmus

## 19. Change Management Playbook

### 19.1 Bug Fix Yaparken

1. Symptom'u degil owner context'i bul
2. Route -> service -> state -> analytics zincirini oku
3. Root cause'u belirle
4. Minimal safe fix yap
5. Regression ve analytics kontrolu yap

### 19.2 Yeni Feature Eklerken

1. Benzer feature bul
2. Owner service ve UI surface'i netlestir
3. Route/config/tutorial/analytics ihtiyaclarini listele
4. Yeni abstraction yerine mevcut foundation'i genislet
5. Loading/error/empty state ile bitir

### 19.3 Refactor Yaparken

- Public davranisi degistirmeden once snapshot al
- Impact map cikar
- Kademeli git
- Refactor adina feature rewrite yapma

### 19.4 Tasarim Iyilestirmesi Yaparken

- Sadece goruntu degil, state davranisini da koru
- Theme ve token ritmini izle
- Ayni pattern'deki kardes ekranlarla parity kontrolu yap

### 19.5 Backend Kontrat Degistirirken

- Gateway rewrite etkisi
- Mobil/admin consumer etkisi
- Analytics property etkisi
- Backfill/migration etkisi
- Legacy alias ihtiyaci

listelemeden degisiklige girme.

### 19.6 Riskli Degisikliklerde Rollout

Dusun:

- compatibility alias
- feature flag
- app-config gate
- admin rollout kontrolu
- fallback response

### 19.7 Once Referans Implementation Bul

Bu repoda referans aramadan baslamak maliyetlidir. Her is icin once benzer akisi bulmak varsayilan davranis olsun.

### 19.8 Coklu Etki Varsa Impact Map Cikar

En az su boyutlarda dusun:

- UI
- service
- gateway
- admin
- analytics
- config
- test

## 20. Anti-Patterns / Things To Avoid

- Paralel state sistemi kurmak
- Var olan app-config foundation'i dururken yeni local feature-flag sistemi acmak
- Var olan tutorial sistemi dururken ekran icinde one-off coachmark sistemi kurmak
- UI'i inline hardcoded route ve renk degerleriyle doldurmak
- Mock entegrasyonu kalici hale getirmek
- Buyuk ve kontrolsuz refactor
- Existing navigation mantigini layout seviyesini gormeden bozmak
- Analytics event eklemeyi unutmak
- Dream owner'i dogrulamadan `dream-service` ve `astrology-service` arasinda rastgele degisiklik yapmak
- Shared UI component'i kopyala-yapistir cogaltmak
- Token/theme yerine ekran icinde farkli design language baslatmak
- Notification route key / module visibility zincirini bypass etmek
- `mystic-common` icine gereksiz domain logic tasimak
- Security shortcut'larini production standardi gibi kabul etmek

## 21. Practical Task Recipes

### 21.1 Yeni Ekran Ekleyeceksen

1. Benzer ekran bul
2. Route group'u sec
3. `SafeScreen` ve mevcut header pattern'i ile basla
4. Service/hook tasarla
5. Loading/empty/error/retry ekle
6. Analytics ekle
7. Gerekirse tutorial/app-config etkisini tamamla

### 21.2 Var Olan Ekrani Duzeltirken

1. Aktif route dosyasini oku
2. Ekranin kullandigi service/store/hook'u oku
3. Yanindaki kardes ekranlarda ayni pattern nasil cozulmus bak
4. Minimal degisiklikle bug'i kapat
5. Regression ve event kontrolu yap

### 21.3 Yeni Endpoint Eklerken

1. Owner servisi dogrula
2. Benzer controller/service pattern'ini bul
3. DTO ve validation yaz
4. Gateway degisikligi gerekip gerekmedigini kontrol et
5. Mobil/admin client guncelle
6. Test ekle veya manual verification notu yaz

### 21.4 API Response Alani Degisince

1. Gateway rewrite etkileniyor mu bak
2. Mobile service type'larini guncelle
3. Admin type/client etkisini kontrol et
4. Mapping/fallback mantigini guncelle
5. Analytics property etkisini dusun

### 21.5 Analytics Eklerken

1. Mevcut feature event'lerini oku
2. Naming'i bozmadan yeni event ekle
3. Common property'leri sec
4. Duplicate fire guard'i koy
5. Manual QA ile event'i dogrula

### 21.6 Tasarim Parity Duzeltirken

1. Karsilik ekran/component'i referans al
2. Theme/token uyumunu sagla
3. Loading/error/empty parity'sini de kontrol et
4. Sadece renk degil layout, spacing ve CTA davranisini da esitle

### 21.7 Navigation Bug Fix Yaparken

1. Expo route dosyasini oku
2. `_layout` davranisini kontrol et
3. Gerekirse `notificationDeepLink.ts`, route key zinciri ve admin route manifest/sync akislarini oku
4. App-config hidden/deeplinkable mantigini bozma

### 21.8 Notification Akisi Eklerken

1. Notification-service ownerligini kabul et
2. Admin config / route key / deep link cozumunu birlikte dusun
3. Mobilde acilis yolu ve analytics izi ekle
4. Read/mark-as-read gibi yan etkileri test et

### 21.9 Feature Flag / Rollout Isi Yaparken

Preferred siralama:

1. `notification-service` app-config
2. module visibility / nav config
3. tutorial rollout config

Avoid:

- Ekran icinde sabit boolean
- Environment'a gomulu gecici gate'i kalici hale getirmek

### 21.10 Tutorial / Onboarding Entegrasyonu Yaparken

1. `src/features/tutorial/*` yapisini oku
2. Registry ve remote config etkisini tamamla
3. Analytics key'leri ekle
4. `docs/tutorial-qa-checklist.md` ile QA dusun

## 22. Quick Start For Future AI Sessions

### 22.1 Yeni Gelen AI Once Neleri Okumali

Minimum:

1. Bu dosya
2. Ilgili bounded context giris dosyalari
3. Ilgili service/controller
4. Benzer feature implementasyonu

### 22.2 Kucuk Gorevlerde Minimum Dosya Seti

Mobil ekran tweak:

- ilgili route
- ilgili component
- `src/components/ui` kardesleri
- ilgili analytics call

Backend endpoint tweak:

- gateway route
- controller
- service
- test

Admin ekran tweak:

- page
- `src/lib/api.ts`
- ilgili type

### 22.3 Orta / Buyuk Gorevlerde Ilerleme Sirasi

1. Owner bounded context'i sec
2. Giris noktalarini oku
3. Config / route / analytics / tutorial etkisini haritala
4. Benzer feature'i referans al
5. Degisikligi uygula
6. Verify / test / QA

### 22.4 Calismaya Baslamadan Once Kendine Sor

- Bu degisiklik icin aktif owner kim?
- Benzer feature nerede?
- Public contract etkileniyor mu?
- Analytics gerekir mi?
- Tutorial veya app-config etkileniyor mu?
- Legacy/parallel implementation riski var mi?

### 22.5 Degisiklikten Once Checklist

- Route sahibi belli mi?
- Service sahibi belli mi?
- Mevcut pattern okundu mu?
- Existing foundation var mi?
- Loading/error state dusunuldu mu?
- Analytics dusunuldu mu?
- Backward compatibility degerlendirildi mi?

## 23. Living Document Note

Bu dosya sabit degil, yasayan bir dokumandir.

Asagidaki durumlarda guncellenmelidir:

- Yeni modul eklendiginde
- Route / navigation standardi degistiginde
- App-config veya tutorial omurgasi degistiginde
- Analytics naming veya common property standardi degistiginde
- Yeni servis acildiginda veya owner sinirlari degistiginde
- Legacy bir alan resmi olarak kaldirildiginda

Ozellikle AI agent'larin yanlis yere mudahale etmesini azaltmak icin bu dosya architecture degistiginde kodla birlikte guncel tutulmalidir.
