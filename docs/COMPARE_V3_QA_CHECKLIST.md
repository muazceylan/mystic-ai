# Compare V3 QA Checklist (Phase 2)

## 1) Module Differentiation
- [ ] `LOVE/WORK/FRIEND/FAMILY/RIVAL` sekmelerinde `metricCards.title` setleri farklı.
- [ ] Sekme değişiminde `Hero` skor, seviye, anlatı ve top drivers birlikte değişiyor.
- [ ] Sekme değişiminde bir önceki sekmenin içeriği kısa süreli flash olmuyor.

## 2) Warning + Confidence UX
- [ ] `distributionWarning=scores_clustered` için doğru Türkçe metin görünüyor.
- [ ] `distributionWarning=low_confidence_damped` için doğru Türkçe metin görünüyor.
- [ ] `distributionWarning=house_precision_limited` için doğru Türkçe metin görünüyor.
- [ ] `missingBirthTimeImpact` varsa overview ve explainability drawer’da görünüyor.
- [ ] `confidenceLabel` tüm modüllerde `Yüksek/Orta/Sınırlı` formatında tutarlı.

## 3) Explainability Drawer
- [ ] `calculationVersion` gösteriliyor.
- [ ] `dataQuality` kullanıcı dostu etiketleniyor.
- [ ] `factorsUsed` boş değilse listeleniyor, boşsa fallback metni var.
- [ ] `generatedAt` tarih formatı okunur.
- [ ] warning / missing-birth-time notları drawer’da görünür.

## 4) Backend Rule Validation
- [ ] Düşük confidence senaryosunda `distributionWarning=low_confidence_damped`.
- [ ] Düşük house/birth precision senaryosunda `distributionWarning=house_precision_limited`.
- [ ] Sıkışık metrik dağılımında `distributionWarning=scores_clustered`.
- [ ] `missingBirthTimeImpact` üretimi deterministic.
- [ ] Top drivers alanları boş veya duplicate değil.

## 5) Cache + Invalidation
- [ ] Aynı `matchId + module + calculationVersion` için cache hit alınabiliyor.
- [ ] Kaynak veri değişince fingerprint farklılaşıp sonuç invalidate oluyor.
- [ ] TTL dolunca expired cache kaydı tekrar üretiliyor.

## 6) Contract Length Targets
- [ ] `headline`: 4-8 kelime.
- [ ] `shortNarrative`: 220-360 karakter aralığı.
- [ ] `dailyLifeHint`: 60-110 karakter aralığı.
- [ ] `metric insight`: 45-90 karakter aralığı.

## 7) Analytics Events
- [ ] `compare_module_view` payload: module, relationship_type, match_id, score, confidence_label, level_label, calculation_version, data_quality.
- [ ] `compare_explainability_open` payload: module, relationship_type, match_id, confidence_label, distribution_warning, data_quality, calculation_version.
- [ ] `compare_technical_open` payload: module, relationship_type, match_id, score, score_band, confidence_label, data_quality, calculation_version, source.
- [ ] `compare_driver_expand` payload: module, relationship_type, match_id, driver_type, driver_title, driver_impact.

## 8) Visual Polish
- [ ] Hero kart ana bilgi önceliği net (skor > seviye > veri güveni).
- [ ] Warning notları ekranı boğmadan okunur.
- [ ] Theme sections boşsa alan render edilmiyor.
- [ ] Modül accent renkleri okunabilirlik/kontrast açısından sorun üretmiyor.

