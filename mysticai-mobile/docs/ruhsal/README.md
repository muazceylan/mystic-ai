# Ruhsal Pratikler Modulu Dokumantasyon Paketi

Bu klasor, mevcut `astroloji` uygulamasina eklenecek Islami odakli `Dua & Meditasyon` modulu icin urun, UX, backend ve mobil uygulama tasarim planlarini icerir.

Amaç:
- Astroloji deneyimini bozmadan yeni bir `Ruhsal Pratikler` alani eklemek
- Gunluk dua/esma/nefes egzersizi ile duzenli pratik aliskanligi olusturmak
- Teknik olarak `Spring Boot + PostgreSQL + Redis` backend ve `Expo React Native + Zustand` mobil stack'ine uyumlu bir plan sunmak

## Okuma Sirasi (istenildigi gibi `yapilacaklar listesi`nden baslar)

1. `00_ROADMAP_MVP_V1_V2.md`
2. `01_PRODUCT_SUMMARY.md`
3. `02_UI_UX_FLOWS_AND_SCREENS.md`
4. `03_DATA_MODEL_DB_SCHEMA_AND_JSON.md`
5. `04_API_SPEC_AND_BACKEND_BLUEPRINT.md`
6. `05_DAILY_SELECTION_ALGORITHM.md`
7. `06_MOBILE_ARCHITECTURE_AND_RN_SKELETONS.md`
8. `07_SECURITY_PRIVACY_CONTENT_SAFETY.md`

## Varsayimlar

- Mobil uygulama stack'i `Expo + Expo Router + Zustand + TanStack Query` olarak kullaniliyor.
- Backend servisleri Spring Boot tabanli ve API Gateway uzerinden JWT ile korunuyor.
- `users` verisi auth servisinde; ruhsal modulu servisinde `user_id` mantiksal iliski olarak tutulabilir.
- Dini metinler icin bu dokuman paketinde placeholder kullanilmistir; uretim oncesi editoryal/dogruluk kontrolu zorunludur.

## Kapsam Sinirlari

- Bu paket tasarim ve uygulama planidir; dogrudan production kod degildir.
- Gercek dini metin, fetva/hukum, tibbi/psikolojik vaat icermez.
- Meditasyon bolumu `nefes ve farkindalik egzersizi` olarak konumlandirilir.

