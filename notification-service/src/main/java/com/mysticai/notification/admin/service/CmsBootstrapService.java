package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.cms.ExploreCard;
import com.mysticai.notification.entity.cms.ExploreCategory;
import com.mysticai.notification.entity.cms.HomeSection;
import com.mysticai.notification.repository.ExploreCategoryRepository;
import com.mysticai.notification.repository.ExploreCardRepository;
import com.mysticai.notification.repository.HomeSectionRepository;
import com.mysticai.notification.repository.PlacementBannerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Idempotent CMS seed + enrich service.
 *
 * Strategy:
 *  - New record  → create with all fields populated.
 *  - Existing record → fill in only null / blank fields (preserves admin edits).
 *
 * Safe to run on every startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CmsBootstrapService implements ApplicationRunner {

    private final HomeSectionRepository     homeSectionRepo;
    private final ExploreCategoryRepository exploreCategoryRepo;
    private final ExploreCardRepository     exploreCardRepo;
    private final PlacementBannerRepository placementBannerRepo;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("[CmsBootstrap] Starting CMS seed / enrich…");
        int n = 0;
        n += seedHomeSections();
        n += seedExploreCategories();
        n += seedExploreCards();
        log.info("[CmsBootstrap] Done — {} records created or enriched.", n);
    }

    // ─── Helper: null-or-blank ────────────────────────────────────────────────

    private static boolean blank(String s) { return s == null || s.isBlank(); }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOME SECTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    private int seedHomeSections() {
        int n = 0;
        n += upsertSection("home_numerology_promo",
                "Numeroloji Rehberin",
                "Kişisel sayın ve bu yılın enerjisi",
                "Sayıların gizli dilini keşfet — yaşam yolu sayın, kişisel yıl enerjin ve günlük numeroloji rehberin seni bekliyor.",
                HomeSection.SectionType.MODULE_PROMO,
                "/numerology", null,
                "Detayları gör", null,
                "keypad-outline", 1);
        n += upsertSection("home_compatibility_promo",
                "İlişki Uyumu",
                "Sevdiğinle kozmik uyumunu keşfet",
                "Doğum haritalarını karşılaştır, uyum puanını gör ve ilişkinizin güçlü ve zorlu yanlarını öğren.",
                HomeSection.SectionType.MODULE_PROMO,
                "/(tabs)/compatibility", null,
                "Uyumu hesapla", null,
                "heart-half-outline", 2);
        n += upsertSection("home_dream_promo",
                "Rüya Günlüğün",
                "Rüyalarını kaydet ve yorumla",
                "Rüyalarının sembollerini çöz, AI destekli yorumlar al ve rüya günlüğünü takip et.",
                HomeSection.SectionType.MODULE_PROMO,
                "/(tabs)/dreams", null,
                "Rüya ekle", null,
                "moon-outline", 3);
        n += upsertSection("home_spiritual_promo",
                "Ruhsal Pratikler",
                "Dua, zikir ve nefes egzersizleri",
                "Günlük dua listeleri, esma zikir sayacı, rehberli meditasyon ve nefes egzersizleriyle ruhsal dengenı kur.",
                HomeSection.SectionType.MODULE_PROMO,
                "/(tabs)/spiritual/prayers", null,
                "Keşfet", null,
                "leaf-outline", 4);
        return n;
    }

    private int upsertSection(String key, String title, String subtitle, String description,
                              HomeSection.SectionType type,
                              String routeKey, String fallbackRouteKey,
                              String ctaLabel, String badgeLabel,
                              String icon, int sortOrder) {
        var opt = homeSectionRepo.findBySectionKey(key);
        LocalDateTime now = LocalDateTime.now();
        if (opt.isEmpty()) {
            homeSectionRepo.save(HomeSection.builder()
                    .sectionKey(key).title(title).subtitle(subtitle)
                    .type(type).status(HomeSection.Status.PUBLISHED).isActive(true)
                    .sortOrder(sortOrder).routeKey(routeKey).fallbackRouteKey(fallbackRouteKey)
                    .ctaLabel(ctaLabel).badgeLabel(badgeLabel).icon(icon)
                    .payloadJson("{\"description\":\"" + escape(description) + "\"}")
                    .locale("tr").publishedAt(now).build());
            log.info("[CmsBootstrap] HomeSection CREATED: {}", key);
            return 1;
        }
        // Enrich existing — only fill null/blank fields
        HomeSection s = opt.get();
        boolean changed = false;
        if (blank(s.getSubtitle()))       { s.setSubtitle(subtitle);       changed = true; }
        if (blank(s.getCtaLabel()))       { s.setCtaLabel(ctaLabel);       changed = true; }
        if (blank(s.getIcon()))           { s.setIcon(icon);               changed = true; }
        if (blank(s.getPayloadJson()))    { s.setPayloadJson("{\"description\":\"" + escape(description) + "\"}"); changed = true; }
        if (s.getStatus() == null)        { s.setStatus(HomeSection.Status.PUBLISHED); changed = true; }
        if (changed) { homeSectionRepo.save(s); log.info("[CmsBootstrap] HomeSection ENRICHED: {}", key); return 1; }
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPLORE CATEGORIES
    // ═══════════════════════════════════════════════════════════════════════════

    private int seedExploreCategories() {
        int n = 0;
        n += upsertCategory("daily_life_cms",         "Günlük Yaşam",         "Plan, uygulanabilir adımlar ve karar desteği.", "checkmark-done-outline", 1);
        n += upsertCategory("self_discovery_cms",     "Kendini Keşfet",       "Kişisel kayıtların ve öz keşif araçların.", "aperture-outline", 2);
        n += upsertCategory("relationships_cms",      "İlişkiler",            "İlişki dinamiklerini farklı bağlamlarda değerlendir.", "people-outline", 3);
        n += upsertCategory("spiritual_cms",          "Ruhsal Pratikler",     "Dua, esma, sure, nefes ve meditasyon.", "leaf-outline", 4);
        n += upsertCategory("astrology_insights_cms", "Astrolojik İçgörüler", "Günlük planını kişiselleştiren astrolojik bağlam.", "planet-outline", 5);
        return n;
    }

    private int upsertCategory(String key, String title, String subtitle, String icon, int sortOrder) {
        var opt = exploreCategoryRepo.findByCategoryKey(key);
        LocalDateTime now = LocalDateTime.now();
        if (opt.isEmpty()) {
            exploreCategoryRepo.save(ExploreCategory.builder()
                    .categoryKey(key).title(title).subtitle(subtitle).icon(icon)
                    .status(ExploreCategory.Status.PUBLISHED).isActive(true)
                    .sortOrder(sortOrder).locale("tr").publishedAt(now).build());
            log.info("[CmsBootstrap] ExploreCategory CREATED: {}", key);
            return 1;
        }
        ExploreCategory c = opt.get();
        boolean changed = false;
        if (blank(c.getSubtitle())) { c.setSubtitle(subtitle); changed = true; }
        if (blank(c.getIcon()))     { c.setIcon(icon);         changed = true; }
        if (c.getStatus() == null)  { c.setStatus(ExploreCategory.Status.PUBLISHED); changed = true; }
        if (changed) { exploreCategoryRepo.save(c); log.info("[CmsBootstrap] ExploreCategory ENRICHED: {}", key); return 1; }
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPLORE CARDS
    // ═══════════════════════════════════════════════════════════════════════════

    private int seedExploreCards() {
        int n = 0;

        // ── daily_life_cms ───────────────────────────────────────────────────
        n += upsertCard("today_plan_card", "daily_life_cms",
                "Bugünkü Plan",              "Üç uygulanabilir günlük adım",
                "Kişiselleştirilmiş günlük önerilerini gör, tamamladıklarını işaretle ve geri bildirim ver.",
                "/(tabs)/today-actions", null, "Planı Gör",
                true, false, 1);
        n += upsertCard("calendar_card", "daily_life_cms",
                "Kozmik Planlayıcı",         "Gününü planla ve hatırlatıcı oluştur",
                "Tarih ve kategori seçerek önerileri incele; uygun olanları hatırlatıcıya dönüştür.",
                "/(tabs)/calendar", null, "Planlayıcıyı Aç",
                false, false, 2);
        n += upsertCard("decision_compass_card", "daily_life_cms",
                "Karar Pusulası",            "Seçeneklerini farklı açılardan değerlendir",
                "Günlük yaşamındaki bir konuyu destekleyici alanlar ve dikkat noktalarıyla daha bilinçli değerlendir.",
                "/decision-compass", null, "Kararını Değerlendir",
                false, false, 3);

        // ── self_discovery_cms ───────────────────────────────────────────────
        n += upsertCard("natal_chart_card",      "self_discovery_cms",
                "Doğum Haritası",            "Natal detayların",
                "Doğum anının gökyüzü haritası. Gezegenlerin hangi burçlarda ve hangi evlerde olduğunu, açılarını ve yorumlarını gör.",
                "/(tabs)/natal-chart", null, "Haritayı Gör",
                true, false, 1);
        n += upsertCard("name_analysis_card",    "self_discovery_cms",
                "İsim Analizi",              "İsminin enerji izi",
                "İsmindeki harflerin numerolojik değerlerini hesapla. İfade sayısı, karakter özellikleri ve enerji profili.",
                "/(tabs)/name-analysis", null, "İsmi Analiz Et",
                false, false, 2);
        n += upsertCard("numerology_card",       "self_discovery_cms",
                "Numeroloji",                "Sayıların kişisel anlamı",
                "Yaşam yolu sayın, kişisel yıl temaların ve günlük numeroloji bağlamın tek ekranda.",
                "/numerology", null, "Sayıları Gör",
                false, false, 3);
        n += upsertCard("dream_journal_card",    "self_discovery_cms",
                "Rüya Günlüğü",              "Rüyalarını ve kişisel notlarını kaydet",
                "Rüyalarını tarihe göre kaydet, tekrar eden sembolleri takip et ve AI destekli değerlendirmeyi ikincil bir içgörü olarak incele.",
                "/(tabs)/dreams", null, "Rüya Ekle",
                false, false, 4);

        // ── relationships_cms ────────────────────────────────────────────────
        n += upsertCard("compatibility_card",    "relationships_cms",
                "Uyumluluk",                 "İlişki dinamiklerini karşılaştır",
                "İki kişinin doğum haritasını karşılaştır; güçlü ve dikkat isteyen alanları ilişki bağlamında incele.",
                "/(tabs)/compatibility", null, "Uyumu İncele",
                true, false, 1);
        n += upsertCard("star_mate_card",        "relationships_cms",
                "Ruh Eşi",                   "Eşleşme içgörüleri",
                "Yükselen, Venüs ve Mars göstergelerine dayalı eşleşme içgörülerini kesin sonuç iddiası olmadan incele.",
                "/(tabs)/star-mate", null, "İçgörüleri Gör",
                false, false, 2);
        n += upsertCard("share_cards_card",      "relationships_cms",
                "Paylaşılabilir Kartlar",    "Kişisel özetlerini paylaş",
                "Kişisel özetlerini ve astrolojik bağlamını görsel kartlara dönüştürerek paylaş.",
                "/share-cards", null, "Kartları Gör",
                false, false, 3);

        // ── spiritual_cms ────────────────────────────────────────────────────
        // Remove old prayer/esma cards — replaced by dua/esma/sure cards
        n += removeCard("spiritual_prayers_card");
        n += removeCard("spiritual_esma_card");

        n += upsertCard("spiritual_dua_card",             "spiritual_cms",
                "Dualar",                    "Dua koleksiyonu ve zikir",
                "Sabah, akşam, korunma, şifa ve daha birçok kategoride dua koleksiyonu. Seç, oku ve zikir sayacıyla takip et.",
                "/(tabs)/spiritual/dua", null, "Dualara Bak",
                true, false, 1);
        n += upsertCard("spiritual_esma_card_v2",         "spiritual_cms",
                "Esmalar",                   "Esmaül Hüsna",
                "Allah'ın 99 güzel ismi. Her esmanın Arapça yazılışı, anlamı ve önerilen tekrar sayısıyla zikir sayacı.",
                "/(tabs)/spiritual/asma", null, "Esmaları Gör",
                false, false, 2);
        n += upsertCard("spiritual_sure_card",            "spiritual_cms",
                "Sureler",                   "Kur'an sureleri",
                "Kur'an-ı Kerim surelerini oku, dinle ve zikir sayacıyla takip et.",
                "/(tabs)/spiritual/sure", null, "Sureleri Gör",
                false, false, 3);
        n += upsertCard("spiritual_meditation_card",      "spiritual_cms",
                "Meditasyon",                "Sessiz odak seansları",
                "Rehberli meditasyon seansları. Zihni sakinleştir, odaklan ve iç huzuru bul.",
                "/(tabs)/spiritual/meditation", null, "Meditasyona Başla",
                false, false, 4);
        n += upsertCard("spiritual_breathing_card",       "spiritual_cms",
                "Nefes Egzersizleri",        "Nefes ve rahatlama",
                "Box breathing, 4-7-8 ve diğer nefes teknikleriyle stresi azalt, zihni berraklaştır.",
                "/(tabs)/spiritual/breathing", null, "Nefes Al",
                false, false, 5);
        n += upsertCard("spiritual_recommendations_card", "spiritual_cms",
                "Ruhsal Öneri",              "Güne uygun pratik",
                "Kişisel tercihlerine ve günlük bağlama göre ruhsal pratik önerilerini incele.",
                "/(tabs)/spiritual/recommendations", null, "Öneriyi Gör",
                false, false, 6);

        // ── astrology_insights_cms ───────────────────────────────────────────
        n += upsertCard("horoscope_daily_card",  "astrology_insights_cms",
                "Günlük Burç",               "Bugünün astrolojik bağlamı",
                "Güneş, Ay ve gezegenlerin burcuna etkisini günlük planına eşlik eden bağlamsal bir içgörü olarak incele.",
                "/(tabs)/horoscope", null, "Bağlamı Gör",
                true, false, 1);
        n += upsertCard("transits_today_card",   "astrology_insights_cms",
                "Bugünün Gökyüzü Etkileri",  "Astrolojik arka plan",
                "Günlük önerilerin arkasındaki gezegen transitlerini ve ay fazını teknik detaylarıyla incele.",
                "/transits-today", null, "Gökyüzünü Gör",
                false, false, 2);
        n += upsertCard("weekly_analysis_card",  "astrology_insights_cms",
                "Haftalık Analiz",           "Bu haftanın odakları",
                "Bu haftanın güçlü alanlarını, fırsatlarını ve dikkat noktalarını kişisel farkındalık amacıyla incele.",
                "/(tabs)/weekly-analysis", null, "Analizi Gör",
                false, false, 3);
        n += upsertCard("night_sky_card",        "astrology_insights_cms",
                "Doğduğun Gece Gökyüzü",    "Kişisel gece haritan",
                "Doğduğun gecenin gökyüzü simülasyonunu yıldızlar, gezegenler ve takımyıldızlarla incele.",
                "/night-sky", null, "Gökyüzünü Aç",
                false, false, 4);

        n += moveDefaultCardCategory("calendar_card", "daily_life_cms", 2);
        n += moveDefaultCardCategory("decision_compass_card", "daily_life_cms", 3);
        n += moveDefaultCardCategory("natal_chart_card", "self_discovery_cms", 1);
        n += moveDefaultCardCategory("name_analysis_card", "self_discovery_cms", 2);
        n += moveDefaultCardCategory("numerology_card", "self_discovery_cms", 3);
        n += moveDefaultCardCategory("dream_journal_card", "self_discovery_cms", 4);
        n += moveDefaultCardCategory("compatibility_card", "relationships_cms", 1);
        n += moveDefaultCardCategory("star_mate_card", "relationships_cms", 2);
        n += moveDefaultCardCategory("share_cards_card", "relationships_cms", 3);
        n += moveDefaultCardCategory("horoscope_daily_card", "astrology_insights_cms", 1);
        n += moveDefaultCardCategory("transits_today_card", "astrology_insights_cms", 2);
        n += moveDefaultCardCategory("weekly_analysis_card", "astrology_insights_cms", 3);
        n += moveDefaultCardCategory("night_sky_card", "astrology_insights_cms", 4);

        return n;
    }

    private int upsertCard(String key, String categoryKey,
                           String title, String subtitle, String description,
                           String routeKey, String fallbackRouteKey, String ctaLabel,
                           boolean isFeatured, boolean isPremium, int sortOrder) {
        var opt = exploreCardRepo.findByCardKey(key);
        LocalDateTime now = LocalDateTime.now();
        if (opt.isEmpty()) {
            exploreCardRepo.save(ExploreCard.builder()
                    .cardKey(key).categoryKey(categoryKey)
                    .title(title).subtitle(subtitle).description(description)
                    .routeKey(routeKey).fallbackRouteKey(fallbackRouteKey).ctaLabel(ctaLabel)
                    .status(ExploreCard.Status.PUBLISHED).isActive(true)
                    .isFeatured(isFeatured).isPremium(isPremium)
                    .sortOrder(sortOrder).locale("tr").publishedAt(now).build());
            log.info("[CmsBootstrap] ExploreCard CREATED: {}", key);
            return 1;
        }
        ExploreCard c = opt.get();
        boolean changed = false;
        if (c.getUpdatedByAdminId() == null) {
            if (!categoryKey.equals(c.getCategoryKey())) { c.setCategoryKey(categoryKey); changed = true; }
            if (!title.equals(c.getTitle())) { c.setTitle(title); changed = true; }
            if (!subtitle.equals(c.getSubtitle())) { c.setSubtitle(subtitle); changed = true; }
            if (!description.equals(c.getDescription())) { c.setDescription(description); changed = true; }
            if (!ctaLabel.equals(c.getCtaLabel())) { c.setCtaLabel(ctaLabel); changed = true; }
            if (!routeKey.equals(c.getRouteKey())) { c.setRouteKey(routeKey); changed = true; }
            if (c.getSortOrder() != sortOrder) { c.setSortOrder(sortOrder); changed = true; }
            if (c.isFeatured() != isFeatured) { c.setFeatured(isFeatured); changed = true; }
            if (c.isPremium() != isPremium) { c.setPremium(isPremium); changed = true; }
        }
        if (blank(c.getSubtitle()))    { c.setSubtitle(subtitle);       changed = true; }
        if (blank(c.getDescription())) { c.setDescription(description); changed = true; }
        if (blank(c.getCtaLabel()))    { c.setCtaLabel(ctaLabel);       changed = true; }
        if (blank(c.getRouteKey()) && !blank(routeKey)) { c.setRouteKey(routeKey); changed = true; }
        if (c.getStatus() == null)     { c.setStatus(ExploreCard.Status.PUBLISHED); changed = true; }
        if (changed) { exploreCardRepo.save(c); log.info("[CmsBootstrap] ExploreCard ENRICHED: {}", key); return 1; }
        return 0;
    }

    private int removeCard(String key) {
        var opt = exploreCardRepo.findByCardKey(key);
        if (opt.isPresent()) {
            exploreCardRepo.delete(opt.get());
            log.info("[CmsBootstrap] ExploreCard REMOVED: {}", key);
            return 1;
        }
        return 0;
    }

    private int moveDefaultCardSortOrder(String key, int fromSortOrder, int toSortOrder) {
        var opt = exploreCardRepo.findByCardKey(key);
        if (opt.isPresent()) {
            ExploreCard c = opt.get();
            if (c.getSortOrder() == fromSortOrder && c.getUpdatedByAdminId() == null) {
                c.setSortOrder(toSortOrder);
                exploreCardRepo.save(c);
                log.info("[CmsBootstrap] ExploreCard SORT ENRICHED: {} {}→{}", key, fromSortOrder, toSortOrder);
                return 1;
            }
        }
        return 0;
    }

    private int moveDefaultCardCategory(String key, String categoryKey, int sortOrder) {
        var opt = exploreCardRepo.findByCardKey(key);
        if (opt.isEmpty()) {
            return 0;
        }

        ExploreCard card = opt.get();
        if (card.getUpdatedByAdminId() != null) {
            return 0;
        }

        boolean changed = !categoryKey.equals(card.getCategoryKey()) || card.getSortOrder() != sortOrder;
        if (!changed) {
            return 0;
        }

        card.setCategoryKey(categoryKey);
        card.setSortOrder(sortOrder);
        exploreCardRepo.save(card);
        log.info("[CmsBootstrap] ExploreCard CATEGORY ENRICHED: {} -> {}", key, categoryKey);
        return 1;
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
