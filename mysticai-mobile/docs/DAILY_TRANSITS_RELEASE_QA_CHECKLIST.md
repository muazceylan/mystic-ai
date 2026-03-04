# Daily Transits Module - Release QA Checklist

Bu checklist `DailyTransitsScreen` ve `TodayActionsScreen` için release onayı öncesi hızlı ama kapsamlı cihaz test akışıdır.

## 0) On Kosullar (Setup)

- Mock kapali test: `USE_MOCK=false` veya `EXPO_PUBLIC_USE_MOCK=false`
- Mock acik test: `USE_MOCK=true` (en az 1 tur)
- Cihaz saati: TR (`+03`) ve en az bir tur farkli timezone
- Uygulama cold start: uygulamayi tamamen kapatip ac

## 1) Navigasyon ve Route Uyumu

1. Home/Kesfet'ten `Gunun Transitleri` ekranina git.
2. Alias route'lari test et:
- `/(tabs)/transit-detail`
- `/transits-today`
3. Hidden tab davranisini dogrula:
- `daily-transits` ve `today-actions` bottom tab'da gorunmemeli.

Beklenen:
- Skeleton -> content akisi sorunsuz.
- 404/blank ekran olmamali.
- Bottom tab label seti korunmali: `Kesfet`, `Haritam`, `Uyum`, `Uyum Analizi`, `Profil`.

## 2) Loading / Empty / Retry

1. Yavas networkte ekran ac.
2. Bos veri senaryosunu test et.
3. API hata (offline / 5xx) senaryosunu test et.

Beklenen:
- Skeleton gorunmeli, layout ziplamamali.
- Empty state metni: `Bugun icin veri hazirlaniyor`.
- Retry butonu calismali.

## 3) Offline Fallback (AsyncStorage)

Cache keyleri:
- `dailyTransits:{date}`
- `dailyActions:{date}`

Test:
1. Online veri yukle.
2. App kill + ucak modu + tekrar ac.
3. Ayni ekrani yeniden ac.

Beklenen:
- Cached payload ile ekran dolar.
- Cache olmayan date'te crash olmadan empty/error state gorunur.

## 4) Tarih ve Timezone Kaymasi

1. Isteklerde date formati `YYYY-MM-DD` kalmali.
2. 00:30 ve 23:30 saatlerinde gun kaymasi testi.
3. Cihaz timezone degistirip tekrar test et.

Beklenen:
- Bir gun ileri/geri kayma olmamali.
- Cache key her zaman dogru date ile olusmali.

## 5) Yaptim Toggle (Optimistic + Rollback)

1. `today-actions` ekraninda bir aksiyonu `Yaptim` yap.
2. Offline iken toggle yap.
3. Hizli ard arda toggle (race condition testi).
4. App restart sonrasi state tutarliligini kontrol et.

Beklenen:
- Online: aninda optimistic update + server sync.
- Offline hata: rollback + hata alert.
- Son state tutarli kalir.

## 6) Feedback Akisi (`POST /api/v1/feedback`)

1. Transit feedback gonder.
2. Action feedback gonder.
3. Offline feedback dene.

Beklenen:
- Basarida akisi bloklamaz.
- Hatada kullanici bilgilendirilir, crash olmaz.

## 7) Analytics Event Dogrulamasi

Izlenecek eventler:
- `daily_transits_viewed`
- `transit_detail_opened`
- `action_done_toggled`
- `feedback_sent`

Beklenen payload prensibi:
- Basarili islemler: `result: "success"`
- Basarisiz islemler: `result: "fail"`
- Event spam olmamali (ozellikle `daily_transits_viewed` ekran acilisinda tek sefer).

## 8) UI ve Accessibility Hizli Kontrol

- Uzun metinlerde tasma olmamali.
- Dokunma alanlari en az 44px.
- Erişilebilir labellar anlamli olmali.
- Teknik terimler sadece `Detaylar` acildiginda gorunmeli.

## QA Rapor Sablonu

Her test adimi icin su formati doldur:

- Durum: `PASS` / `FAIL`
- Adim:
- Beklenen:
- Gerceklesen:
- Cihaz / OS:
- Build:
- Kanit: screenshot/video linki
- Not:
