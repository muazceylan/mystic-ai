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
        n += upsertCategory("cosmic_flow_cms",    "Kozmik Akış",      "Bugün ve hafta ritmini buradan takip et.", "planet-outline",   1);
        n += upsertCategory("self_discovery_cms", "Kendini Keşfet",   "Haritan ve kişisel içgörüler tek yerde.", "aperture-outline", 2);
        n += upsertCategory("spiritual_cms",      "Ruhsal Pratikler", "Dua, esma, nefes ve meditasyon akışları.", "leaf-outline",    3);
        n += upsertCategory("social_compat_cms",  "Sosyal & Uyum",    "İlişki uyumu ve paylaşım deneyimleri.", "people-outline",   4);
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

        // ── cosmic_flow_cms ──────────────────────────────────────────────────
        n += upsertCard("horoscope_daily_card",  "cosmic_flow_cms",
                "Günlük Burç",               "Bugünün yorumu",
                "Güneş, Ay ve gezegenlerin burcuna etkisini gör. Bugün seni neler bekliyor? Tema, tavsiye ve şanslı detaylar burada.",
                "/(tabs)/horoscope", null, "Burcu Gör",
                true, false, 1);
        n += upsertCard("transits_today_card",   "cosmic_flow_cms",
                "Bugünün Gökyüzü Etkileri",  "Anlık gökyüzü etkisi",
                "Anlık gezegen transitleri, ay fazı ve bugünün kozmik enerjisini keşfet. Hangi gezegenler hangi burçlarda?",
                "/transits-today", null, "Gökyüzünü Gör",
                false, false, 2);
        n += upsertCard("weekly_analysis_card",  "cosmic_flow_cms",
                "Haftalık Analiz",           "Bu hafta odakları",
                "Bu haftanın güçlü yönleri, fırsatları, dikkat edilecekleri ve tehditleri — kişisel SWOT analizin.",
                "/(tabs)/weekly-analysis", null, "Analizi Gör",
                false, false, 3);
        n += upsertCard("calendar_card",         "cosmic_flow_cms",
                "Kozmik Takvim",             "Uygun günleri planla",
                "Kişisel kozmik takviminle toplantıları, önemli kararları ve başlangıçları en uygun güne planla.",
                "/(tabs)/calendar", null, "Takvimi Aç",
                false, false, 4);

        // ── self_discovery_cms ───────────────────────────────────────────────
        n += upsertCard("natal_chart_card",      "self_discovery_cms",
                "Doğum Haritası",            "Natal detayların",
                "Doğum anının gökyüzü haritası. Gezegenlerin hangi burçlarda ve hangi evlerde olduğunu, açılarını ve yorumlarını gör.",
                "/(tabs)/natal-chart", null, "Haritayı Gör",
                true, false, 1);
        n += upsertCard("night_sky_card",        "self_discovery_cms",
                "Doğduğun Gece Gökyüzü",    "Kişisel gece haritan",
                "Doğduğun gecenin gökyüzü simülasyonu — yıldızlar, gezegenler ve takımyıldızlar tam o anın konumlarında.",
                "/night-sky", null, "Gökyüzünü Aç",
                false, false, 2);
        n += upsertCard("name_analysis_card",    "self_discovery_cms",
                "İsim Analizi",              "İsminin enerji izi",
                "İsmindeki harflerin numerolojik değerlerini hesapla. İfade sayısı, karakter özellikleri ve enerji profili.",
                "/(tabs)/name-analysis", null, "İsmi Analiz Et",
                false, false, 3);
        n += upsertCard("numerology_card",       "self_discovery_cms",
                "Numeroloji",                "Sayıların kişisel anlamı",
                "Yaşam yolu sayın, kişisel yıl enerjisi, kader sayısı ve günlük numeroloji rehberin tek ekranda.",
                "/numerology", null, "Sayıları Gör",
                false, false, 4);
        n += upsertCard("decision_compass_card", "self_discovery_cms",
                "Karar Pusulası",            "Anlık karar rehberi",
                "Önemli bir karar mı veriyorsun? Kozmik enerji ve kişisel sayılarına göre anlık rehberlik al.",
                "/decision-compass", null, "Pusulayı Aç",
                false, false, 5);

        // ── spiritual_cms ────────────────────────────────────────────────────
        n += upsertCard("spiritual_prayers_card",         "spiritual_cms",
                "Dua Akışı",                 "Günlük dua listeleri",
                "Sabah, öğle, akşam ve yatmadan önce; duruma göre seçilmiş dua listeleri ve rehberli dua akışları.",
                "/(tabs)/spiritual/prayers", null, "Dualara Bak",
                true, false, 1);
        n += upsertCard("spiritual_esma_card",            "spiritual_cms",
                "Esma Zikir",                "Esma ve tekrar sayacı",
                "Allah'ın 99 güzel ismi. Her esmanın anlamı, fazileti ve önerilen tekrar sayısıyla zikir sayacı.",
                "/(tabs)/spiritual/esma", null, "Esmaları Gör",
                false, false, 2);
        n += upsertCard("spiritual_meditation_card",      "spiritual_cms",
                "Meditasyon",                "Sessiz odak seansları",
                "Rehberli meditasyon seansları. Zihni sakinleştir, odaklan ve iç huzuru bul.",
                "/(tabs)/spiritual/meditation", null, "Meditasyona Başla",
                false, false, 3);
        n += upsertCard("spiritual_breathing_card",       "spiritual_cms",
                "Nefes Egzersizleri",        "Nefes ve rahatlama",
                "Box breathing, 4-7-8 ve diğer nefes teknikleriyle stresi azalt, zihni berraklaştır.",
                "/(tabs)/spiritual/breathing", null, "Nefes Al",
                false, false, 4);
        n += upsertCard("spiritual_recommendations_card", "spiritual_cms",
                "Ruhsal Öneri",              "Güne uygun pratik",
                "Bugünün kozmik enerjisine ve kişisel profiline göre özel ruhsal pratik önerileri.",
                "/(tabs)/spiritual/recommendations", null, "Öneriyi Gör",
                false, false, 5);

        // ── social_compat_cms ────────────────────────────────────────────────
        n += upsertCard("compatibility_card",    "social_compat_cms",
                "Uyumluluk",                 "İlişki uyum analizi",
                "İki kişinin doğum haritasını karşılaştır. Kozmik uyum puanı, güçlü ve zorlu yanlar ile ilişki önerileri.",
                "/(tabs)/compatibility", null, "Uyumu Hesapla",
                true, false, 1);
        n += upsertCard("star_mate_card",        "social_compat_cms",
                "Ruh Eşi",                   "Kozmik eşleşme içgörüleri",
                "Ruh eşi eşleşme analizin. Yükselen, Venüs ve Mars açılarına göre en uyumlu burçlar ve ilişki içgörüleri.",
                "/(tabs)/star-mate", null, "Ruh Eşini Keşfet",
                false, false, 2);
        n += upsertCard("share_cards_card",      "social_compat_cms",
                "Paylaşılabilir Kartlar",    "Sosyal medyada paylaş",
                "Burç yorumunu, doğum haritanı ve kozmik bilgilerini şık görsel kartlara dönüştür ve paylaş.",
                "/share-cards", null, "Kartları Gör",
                false, false, 3);

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
        if (blank(c.getSubtitle()))    { c.setSubtitle(subtitle);       changed = true; }
        if (blank(c.getDescription())) { c.setDescription(description); changed = true; }
        if (blank(c.getCtaLabel()))    { c.setCtaLabel(ctaLabel);       changed = true; }
        if (blank(c.getRouteKey()) && !blank(routeKey)) { c.setRouteKey(routeKey); changed = true; }
        if (c.getStatus() == null)     { c.setStatus(ExploreCard.Status.PUBLISHED); changed = true; }
        if (changed) { exploreCardRepo.save(c); log.info("[CmsBootstrap] ExploreCard ENRICHED: {}", key); return 1; }
        return 0;
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
