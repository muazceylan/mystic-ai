package com.mysticai.notification.tutorial.service;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialConfigStep;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import com.mysticai.notification.tutorial.repository.TutorialConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_BIRTH_CHART;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_COMPATIBILITY;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_COSMIC_PLANNER;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_DAILY_TRANSITS;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_DECISION_COMPASS;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_DREAMS;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_GLOBAL_ONBOARDING;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_HOME;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_NAME_ANALYSIS;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_NUMEROLOGY;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_PROFILE;
import static com.mysticai.notification.tutorial.contract.TutorialContractCatalog.SCREEN_SPIRITUAL_PRACTICE;

@Service
@RequiredArgsConstructor
@Slf4j
public class TutorialConfigBootstrapService implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "system:tutorial-bootstrap";

    private final TutorialConfigRepository repository;
    private final AuditLogService auditLogService;

    public record BootstrapResult(int createdCount, int skippedCount, int totalCount) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        BootstrapResult result = seedDefaultsInternal(null, SYSTEM_ACTOR, null, false);
        if (result.createdCount() > 0) {
            log.info("[TUTORIAL_BOOTSTRAP] Created {} default tutorial configs ({} skipped).",
                    result.createdCount(), result.skippedCount());
        } else {
            log.info("[TUTORIAL_BOOTSTRAP] Default tutorial configs already present ({} skipped).",
                    result.skippedCount());
        }
    }

    @Transactional
    public BootstrapResult seedDefaults(Long adminId, String adminEmail, AdminUser.Role role) {
        String actor = resolveActor(adminId, adminEmail);
        return seedDefaultsInternal(adminId, actor, role, true);
    }

    private BootstrapResult seedDefaultsInternal(
            Long adminId,
            String actor,
            AdminUser.Role role,
            boolean writeAuditLogs
    ) {
        List<TutorialSeed> seeds = defaultSeeds();
        int created = 0;
        int skipped = 0;

        for (TutorialSeed seed : seeds) {
            var existing = repository.findByTutorialId(seed.tutorialId());
            if (existing.isPresent()) {
                backfillSeedMetadata(existing.get(), seed, actor);
                skipped += 1;
                continue;
            }

            TutorialConfig saved = repository.save(toEntity(seed, actor));
            created += 1;

            if (writeAuditLogs) {
                auditLogService.log(
                        adminId,
                        actor,
                        role,
                        AuditLog.ActionType.TUTORIAL_CONFIG_CREATED,
                        AuditLog.EntityType.TUTORIAL_CONFIG,
                        String.valueOf(saved.getId()),
                        saved.getTutorialId(),
                        null,
                        Map.of(
                                "seeded", true,
                                "tutorialId", saved.getTutorialId(),
                                "screenKey", saved.getScreenKey(),
                                "version", saved.getVersion()
                        )
                );
            }
        }

        return new BootstrapResult(created, skipped, seeds.size());
    }

    private void backfillSeedMetadata(TutorialConfig existing, TutorialSeed seed, String actor) {
        boolean changed = false;

        if ((existing.getLocale() == null || existing.getLocale().isBlank())
                && seed.locale() != null && !seed.locale().isBlank()) {
            existing.setLocale(seed.locale());
            changed = true;
        }

        if (changed) {
            existing.setUpdatedBy(actor);
            repository.save(existing);
        }
    }

    private TutorialConfig toEntity(TutorialSeed seed, String actor) {
        TutorialConfig config = TutorialConfig.builder()
                .tutorialId(seed.tutorialId())
                .name(seed.name())
                .screenKey(seed.screenKey())
                .platform(seed.platform())
                .version(seed.version())
                .status(TutorialConfigStatus.PUBLISHED)
                .isActive(true)
                .priority(seed.priority())
                .presentationType(seed.presentationType())
                .description(seed.description())
                .locale(seed.locale())
                .createdBy(actor)
                .updatedBy(actor)
                .publishedAt(LocalDateTime.now())
                .build();

        List<TutorialConfigStep> steps = seed.steps().stream()
                .map(step -> TutorialConfigStep.builder()
                        .stepId(step.stepId())
                        .orderIndex(step.orderIndex())
                        .title(step.title())
                        .body(step.body())
                        .targetKey(step.targetKey())
                        .iconKey(step.iconKey())
                        .presentationType(seed.presentationType())
                        .isActive(true)
                        .build())
                .toList();

        config.replaceSteps(steps);
        return config;
    }

    private String resolveActor(Long adminId, String adminEmail) {
        if (adminEmail != null && !adminEmail.isBlank()) {
            return adminEmail.trim();
        }
        if (adminId != null) {
            return "admin:" + adminId;
        }
        return SYSTEM_ACTOR;
    }

    private List<TutorialSeed> defaultSeeds() {
        return java.util.stream.Stream.concat(
                defaultTurkishSeeds().stream(),
                defaultEnglishSeeds().stream()
        ).toList();
    }

    private List<TutorialSeed> defaultTurkishSeeds() {
        return List.of(
                tutorial(
                        "global_onboarding_v1",
                        "Global Onboarding",
                        SCREEN_GLOBAL_ONBOARDING,
                        1000,
                        TutorialPresentationType.FULLSCREEN_CAROUSEL,
                        "Kullanicinin uygulamanin degerini ilk acilista hizli anlamasi icin global onboarding akisi.",
                        "tr",
                        step(1, "welcome", "Hos Geldin",
                                "Sana ozel astrolojik rehberlik, planlama ve icgoru deneyimine hos geldin.",
                                "global_onboarding.intro", "sparkles-outline"),
                        step(2, "daily-guidance", "Gunluk Rehberlik",
                                "Gunun enerjisini, transitleri ve one cikan etkileri burada takip edersin.",
                                "global_onboarding.intro", "sunny-outline"),
                        step(3, "planning-and-decisions", "Planlama ve Karar",
                                "Kozmik Planlayici ve Karar Pusulasi ile uygun zamanlari ve secenekleri degerlendirebilirsin.",
                                "global_onboarding.intro", "compass-outline"),
                        step(4, "compatibility-and-discovery", "Uyum ve Kesif",
                                "Uyum analizi, ruya, numeroloji ve diger modullerle kendini daha yakindan kesfedebilirsin.",
                                "global_onboarding.intro", "planet-outline"),
                        step(5, "lets-start", "Basla",
                                "Modullere girdikce kisa rehberler seni karsilayacak.",
                                "global_onboarding.intro", "rocket-outline")
                ),
                tutorial(
                        "home_foundation_tutorial",
                        "Home Foundation Tutorial",
                        SCREEN_HOME,
                        900,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Ana sayfa deneyimini ilk kullanimda kisa adimlarla tanitan tutorial.",
                        "tr",
                        step(1, "hero-energy", "Gunun Enerjisi",
                                "Bugunun enerjisini burada kisa ve sade bicimde gorursun.",
                                "home.hero_energy", "sunny-outline"),
                        step(2, "quick-actions", "Ana Modul Kisayollari",
                                "En cok kullanilan modullere buradan hizlica gecebilirsin.",
                                "home.quick_actions", "rocket-outline"),
                        step(3, "personal-widget", "Sana Ozel Oneriler",
                                "Sana ozel icgoruler ve oneriler burada one cikar.",
                                "home.personal_widget", "sparkles-outline"),
                        step(4, "module-guides", "Diger Rehberler",
                                "Diger rehberleri modullere girdikce goreceksin.",
                                "home.help_entry", "navigate-outline")
                ),
                tutorial(
                        "daily_transits_foundation_tutorial",
                        "Daily Transits Tutorial",
                        SCREEN_DAILY_TRANSITS,
                        700,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Gunluk transit ekranindaki temel alanlari tanitan onboarding akisi.",
                        "tr",
                        step(1, "daily-summary", "Gunun Ozeti",
                                "Bugunun gokyuzu etkilerini burada kisa ve anlasilir bicimde gorursun.",
                                "daily_transits.hero_summary", "sunny-outline"),
                        step(2, "transit-cards", "Transit Kartlari",
                                "Transit kartlari gunun one cikan etkilerini sirayla aciklar.",
                                "daily_transits.transit_cards", "albums-outline"),
                        step(3, "impact-zones", "Etki Alanlari",
                                "Destekleyici ve dikkat gerektiren alanlar kararlarini daha bilincli yorumlamana yardim eder.",
                                "daily_transits.impact_zones", "flash-outline"),
                        step(4, "help-reopen", "Rehberi Tekrar Ac",
                                "Dilediginde buradan bu rehberi tekrar baslatabilirsin.",
                                "daily_transits.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "cosmic_planner_intro",
                        "Cosmic Planner Tutorial",
                        SCREEN_COSMIC_PLANNER,
                        680,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Kozmik Planlayici ekraninda odak alani, filtre ve planlama aksiyonlarini tanitir.",
                        "tr",
                        step(1, "date-selection", "Tarih Secimi",
                                "Hangi gun hangi konuya odaklanmanin daha uygun oldugunu burada gorursun.",
                                "cosmic_planner.date_picker", "calendar-outline"),
                        step(2, "category-dock", "Kategori Dock",
                                "Kategori secerek ask, is, iletisim gibi alanlara odaklanabilirsin.",
                                "cosmic_planner.category_dock", "albums-outline"),
                        step(3, "daily-recommendations", "Gunluk Oneriler",
                                "Gunluk oneriler planlarini gokyuzu ritmine gore sekillendirmen icin tasarlandi.",
                                "cosmic_planner.daily_recommendations", "sparkles-outline"),
                        step(4, "reminder-action", "Hatirlatici ve Plan",
                                "Hatirlaticilarla uygun zamani kacirmadan planini takip edebilirsin.",
                                "cosmic_planner.reminder_action", "alarm-outline")
                ),
                tutorial(
                        "decision_compass_intro",
                        "Decision Compass Tutorial",
                        SCREEN_DECISION_COMPASS,
                        660,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Karar Pusulasi ekraninda giris, sonuc ve yeniden degerlendirme akisini aciklar.",
                        "tr",
                        step(1, "decision-input", "Karar Giris Alani",
                                "Burada seceneklerini karsilastirarak gunun etkileriyle birlikte degerlendirebilirsin.",
                                "decision_compass.input_area", "list-outline"),
                        step(2, "result-comparison", "Sonuc Karsilastirma",
                                "Sonuc alani kesin hukum vermez; kararini destekleyen bir rehber sunar.",
                                "decision_compass.result_area", "stats-chart-outline"),
                        step(3, "insight-commentary", "Icgoru Yorumlari",
                                "Yorumlar, seceneklerin guclu ve zayif taraflarini daha net gormene yardim eder.",
                                "decision_compass.header_summary", "reader-outline"),
                        step(4, "reevaluate-entry", "Yeniden Degerlendir",
                                "Kaydedip daha sonra yeniden degerlendirebilir veya seceneklerini guncelleyebilirsin.",
                                "decision_compass.reevaluate_entry", "options-outline")
                ),
                tutorial(
                        "compatibility_foundation_tutorial",
                        "Compatibility Tutorial",
                        SCREEN_COMPATIBILITY,
                        640,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Uyum Analizi ekranindaki ozet, sekmeler ve skor kartlarini tanitan akistir.",
                        "tr",
                        step(1, "compatibility-summary", "Uyum Ozeti",
                                "Genel uyum ozetini burada hizlica gorursun.",
                                "compatibility.summary_header", "heart-outline"),
                        step(2, "sections-and-details", "Ozet ve Detay",
                                "Kisi ve iliski alanlarini birlikte inceleyerek daha net yorum yapabilirsin.",
                                "compatibility.section_tabs", "grid-outline"),
                        step(3, "category-score-cards", "Kategori Kartlari",
                                "Skorlarin yaninda aciklamalar ve oneriler de sunulur; yalnizca sayi gosterilmez.",
                                "compatibility.score_area", "analytics-outline"),
                        step(4, "save-and-share", "Kaydet ve Paylas",
                                "Analizi baslatip sonuclari daha sonra yeniden degerlendirebilir ve paylasabilirsin.",
                                "compatibility.save_share_entry", "share-social-outline")
                ),
                tutorial(
                        "birth_chart_intro",
                        "Birth Chart Tutorial",
                        SCREEN_BIRTH_CHART,
                        630,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Haritam ekraninda ozet, teknik detay ve yorum bolumlerini adim adim tanitir.",
                        "tr",
                        step(1, "hero-summary", "Harita Ozeti",
                                "Dogum haritanin genel ozetini burada hizlica gorebilirsin.",
                                "birth_chart.hero_summary", "planet-outline"),
                        step(2, "main-placements", "Ana Yerlesimler",
                                "Ana yerlesimler, karakterini ve egilimlerini anlamana yardimci olur.",
                                "birth_chart.planet_positions", "sparkles-outline"),
                        step(3, "technical-details", "Teknik Detaylar",
                                "Detay alanlarinda evler, burclar ve teknik katmanlari inceleyebilirsin.",
                                "birth_chart.technical_details", "grid-outline"),
                        step(4, "insight-cards", "Yorum Kartlari",
                                "Yorum kartlari haritandaki bilgileri daha sade ve anlasilir hale getirir.",
                                "birth_chart.insight_panel", "reader-outline"),
                        step(5, "detail-actions", "Kaydet ve Incele",
                                "Istersen bu alani kaydedebilir, paylasabilir ya da daha detayli inceleyebilirsin.",
                                "birth_chart.detail_action", "share-social-outline")
                ),
                tutorial(
                        "dreams_foundation_tutorial",
                        "Dreams Tutorial",
                        SCREEN_DREAMS,
                        620,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Ruya modulu deneyimini ilk kullanimda sade adimlarla aciklar.",
                        "tr",
                        step(1, "dream-entry", "Ruya Girisi",
                                "Ruyani yazarak sembolik bir yorum alirsin.",
                                "dreams.compose_entry", "create-outline"),
                        step(2, "interpretation-result", "Yorum Sonucu",
                                "Yorum sonucu icgoru ve farkindalik icin tasarlandi.",
                                "dreams.interpretation_result", "moon-outline"),
                        step(3, "history-entry", "Gecmis Kayitlar",
                                "Onceki ruya kayitlarina donup tekrar bakabilir, gelisimini takip edebilirsin.",
                                "dreams.history_entry", "time-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Ac",
                                "Istediginde rehberi bu ekrandan yeniden baslatabilirsin.",
                                "dreams.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "numerology_foundation_tutorial",
                        "Numerology Tutorial",
                        SCREEN_NUMEROLOGY,
                        610,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Numeroloji ekraninda giris, sonuc ve detay kartlarini tanitan akistir.",
                        "tr",
                        step(1, "numerology-input", "Giris Alani",
                                "Sayilarin sembolik anlamlarini burada kesfedersin.",
                                "numerology.input_area", "calculator-outline"),
                        step(2, "numerology-result", "Sonuc Karti",
                                "Ana sayi profilin ve guncel tema burada kisa bir ozetle one cikar.",
                                "numerology.result_card", "analytics-outline"),
                        step(3, "numerology-detail", "Detay Aciklamalar",
                                "Detay kartlari kisisel sayilarini daha derin ve anlasilir bicimde aciklar.",
                                "numerology.detail_section", "reader-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Ac",
                                "Dilediginde rehberi manuel olarak yeniden baslatabilirsin.",
                                "numerology.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "name_analysis_foundation_tutorial",
                        "Name Analysis Tutorial",
                        SCREEN_NAME_ANALYSIS,
                        600,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Isim analizi ekranindaki giris, anlam ve kaydetme adimlarini aciklar.",
                        "tr",
                        step(1, "name-input", "Isim Giris Alani",
                                "Ismini girerek anlam ve sembolik cagrisimlarini kesfetmeye baslarsin.",
                                "name_analysis.name_input", "search-outline"),
                        step(2, "meaning-panel", "Anlam ve Koken",
                                "Ismin anlamini ve sembolik cagrisimlarini burada gorursun.",
                                "name_analysis.meaning_panel", "book-outline"),
                        step(3, "save-share", "Kaydet ve Favorile",
                                "Begendigin isimleri kaydedebilir ve daha sonra hizlica geri donebilirsin.",
                                "name_analysis.save_share_entry", "bookmark-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Ac",
                                "Rehberi ihtiyac duydugunda bu ekrandan yeniden acabilirsin.",
                                "name_analysis.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "spiritual_practice_foundation_tutorial",
                        "Spiritual Practice Tutorial",
                        SCREEN_SPIRITUAL_PRACTICE,
                        590,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Dua/meditasyon ve manevi pratik ekraninda gunluk akisi tanitir.",
                        "tr",
                        step(1, "daily-recommendation", "Gunluk Oneri",
                                "Gunun onerilen pratigini burada gorerek hizli bir baslangic yapabilirsin.",
                                "spiritual_practice.daily_recommendation", "sunny-outline"),
                        step(2, "practice-counter", "Pratik Sayaci",
                                "Sayaç alaniyla gunluk pratiklerini adim adim takip edebilirsin.",
                                "spiritual_practice.practice_counter", "timer-outline"),
                        step(3, "journal-entry", "Gunluk ve Kayit",
                                "Kisa notlarla deneyimini kaydedip duzenli gelisimini izleyebilirsin.",
                                "spiritual_practice.journal_entry", "book-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Ac",
                                "Dilediginde bu rehberi ayni ekrandan tekrar acabilirsin.",
                                "spiritual_practice.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "profile_foundation_tutorial",
                        "Profile Tutorial",
                        SCREEN_PROFILE,
                        580,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Profil ve ayarlar ekraninda kisisellestirme alanlarini tanitan tutorial.",
                        "tr",
                        step(1, "personal-info", "Kisisel Bilgiler",
                                "Profil bilgilerini burada guncelleyerek deneyimini sana ozel hale getirebilirsin.",
                                "profile.personal_info", "person-outline"),
                        step(2, "preferences", "Tercihler",
                                "Bildirim, dil ve deneyim tercihlerini bu bolumden yonetebilirsin.",
                                "profile.preferences", "options-outline"),
                        step(3, "tutorial-center", "Rehber Merkezi",
                                "Tum onboarding ve tutorial akislarini tek yerden gorup yeniden baslatabilirsin.",
                                "profile.tutorial_center_entry", "refresh-outline"),
                        step(4, "help-entry", "Yardim ve Rehber",
                                "Rehberleri tekrar gormek icin yardim alanini dilediginde kullanabilirsin.",
                                "profile.help_entry", "help-circle-outline")
                )
        );
    }

    private List<TutorialSeed> defaultEnglishSeeds() {
        return List.of(
                tutorial(
                        localizedTutorialId("global_onboarding_v1", "en"),
                        "Global Onboarding",
                        SCREEN_GLOBAL_ONBOARDING,
                        1000,
                        TutorialPresentationType.FULLSCREEN_CAROUSEL,
                        "Global onboarding flow that helps the user understand the app's value on first launch.",
                        "en",
                        step(1, "welcome", "Welcome",
                                "Welcome to your personalized astrology, planning, and insight experience.",
                                "global_onboarding.intro", "sparkles-outline"),
                        step(2, "daily-guidance", "Daily Guidance",
                                "Track today's energy, transits, and standout influences here.",
                                "global_onboarding.intro", "sunny-outline"),
                        step(3, "planning-and-decisions", "Planning and Decisions",
                                "Use Cosmic Planner and Decision Compass to review timing and options with more clarity.",
                                "global_onboarding.intro", "compass-outline"),
                        step(4, "compatibility-and-discovery", "Compatibility and Discovery",
                                "Explore compatibility, dreams, numerology, and other modules to know yourself more deeply.",
                                "global_onboarding.intro", "planet-outline"),
                        step(5, "lets-start", "Let's Begin",
                                "As you open modules, short guides will help you get started.",
                                "global_onboarding.intro", "rocket-outline")
                ),
                tutorial(
                        localizedTutorialId("home_foundation_tutorial", "en"),
                        "Home Foundation Tutorial",
                        SCREEN_HOME,
                        900,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Tutorial that introduces the home experience with short first-use steps.",
                        "en",
                        step(1, "hero-energy", "Today's Energy",
                                "See today's energy here in a short and simple format.",
                                "home.hero_energy", "sunny-outline"),
                        step(2, "quick-actions", "Core Module Shortcuts",
                                "Jump quickly to the modules you use most from here.",
                                "home.quick_actions", "rocket-outline"),
                        step(3, "personal-widget", "Personalized Suggestions",
                                "Your personalized insights and recommendations stand out here.",
                                "home.personal_widget", "sparkles-outline"),
                        step(4, "module-guides", "More Guides",
                                "You will see the rest of the guides as you enter each module.",
                                "home.help_entry", "navigate-outline")
                ),
                tutorial(
                        localizedTutorialId("daily_transits_foundation_tutorial", "en"),
                        "Daily Transits Tutorial",
                        SCREEN_DAILY_TRANSITS,
                        700,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Onboarding flow that introduces the key sections of the Daily Transits screen.",
                        "en",
                        step(1, "daily-summary", "Today's Summary",
                                "See today's sky influences here in a short and easy-to-read format.",
                                "daily_transits.hero_summary", "sunny-outline"),
                        step(2, "transit-cards", "Transit Cards",
                                "Transit cards explain the day's standout influences one by one.",
                                "daily_transits.transit_cards", "albums-outline"),
                        step(3, "impact-zones", "Impact Zones",
                                "Supportive areas and caution zones help you interpret decisions more consciously.",
                                "daily_transits.impact_zones", "flash-outline"),
                        step(4, "help-reopen", "Open the Guide Again",
                                "You can restart this guide here whenever you need it.",
                                "daily_transits.help_entry", "help-circle-outline")
                ),
                tutorial(
                        localizedTutorialId("cosmic_planner_intro", "en"),
                        "Cosmic Planner Tutorial",
                        SCREEN_COSMIC_PLANNER,
                        680,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Introduces the focus area, filters, and planning actions on the Cosmic Planner screen.",
                        "en",
                        step(1, "date-selection", "Date Selection",
                                "See which day is better suited for the topic you want to focus on.",
                                "cosmic_planner.date_picker", "calendar-outline"),
                        step(2, "category-dock", "Category Dock",
                                "Choose a category to focus on areas like love, work, or communication.",
                                "cosmic_planner.category_dock", "albums-outline"),
                        step(3, "daily-recommendations", "Daily Recommendations",
                                "Daily suggestions are designed to help you shape plans around the sky rhythm.",
                                "cosmic_planner.daily_recommendations", "sparkles-outline"),
                        step(4, "reminder-action", "Reminder and Plan",
                                "Use reminders to follow your plan without missing the right timing.",
                                "cosmic_planner.reminder_action", "alarm-outline")
                ),
                tutorial(
                        localizedTutorialId("decision_compass_intro", "en"),
                        "Decision Compass Tutorial",
                        SCREEN_DECISION_COMPASS,
                        660,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Explains the input, result, and re-evaluation flow on the Decision Compass screen.",
                        "en",
                        step(1, "decision-input", "Decision Input Area",
                                "Compare your options here while considering the day's influences.",
                                "decision_compass.input_area", "list-outline"),
                        step(2, "result-comparison", "Result Comparison",
                                "The result area does not give a rigid verdict; it offers supportive guidance for your choice.",
                                "decision_compass.result_area", "stats-chart-outline"),
                        step(3, "insight-commentary", "Insight Commentary",
                                "These notes help you see the strengths and weak points of each option more clearly.",
                                "decision_compass.header_summary", "reader-outline"),
                        step(4, "reevaluate-entry", "Re-evaluate",
                                "Save your result to revisit it later or adjust your options when needed.",
                                "decision_compass.reevaluate_entry", "options-outline")
                ),
                tutorial(
                        localizedTutorialId("compatibility_foundation_tutorial", "en"),
                        "Compatibility Tutorial",
                        SCREEN_COMPATIBILITY,
                        640,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Flow that introduces the summary, tabs, and score cards on the Compatibility screen.",
                        "en",
                        step(1, "compatibility-summary", "Compatibility Summary",
                                "See the overall compatibility snapshot here at a glance.",
                                "compatibility.summary_header", "heart-outline"),
                        step(2, "sections-and-details", "Sections and Details",
                                "Review personal and relationship areas together for a clearer interpretation.",
                                "compatibility.section_tabs", "grid-outline"),
                        step(3, "category-score-cards", "Category Cards",
                                "Alongside the scores, you also get explanations and suggestions instead of numbers alone.",
                                "compatibility.score_area", "analytics-outline"),
                        step(4, "save-and-share", "Save and Share",
                                "Save the analysis to revisit it later or share the result when you want.",
                                "compatibility.save_share_entry", "share-social-outline")
                ),
                tutorial(
                        localizedTutorialId("birth_chart_intro", "en"),
                        "Birth Chart Tutorial",
                        SCREEN_BIRTH_CHART,
                        630,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Introduces the summary, technical detail, and interpretation sections on the Birth Chart screen.",
                        "en",
                        step(1, "hero-summary", "Chart Summary",
                                "See the main summary of your birth chart here at a glance.",
                                "birth_chart.hero_summary", "planet-outline"),
                        step(2, "main-placements", "Main Placements",
                                "Main placements help you understand your character and natural tendencies.",
                                "birth_chart.planet_positions", "sparkles-outline"),
                        step(3, "technical-details", "Technical Details",
                                "Dive into houses, signs, and technical layers from the detail area.",
                                "birth_chart.technical_details", "grid-outline"),
                        step(4, "insight-cards", "Insight Cards",
                                "Insight cards make the information in your chart clearer and easier to absorb.",
                                "birth_chart.insight_panel", "reader-outline"),
                        step(5, "detail-actions", "Save and Explore",
                                "Save this area, share it, or continue with a deeper review whenever you want.",
                                "birth_chart.detail_action", "share-social-outline")
                ),
                tutorial(
                        localizedTutorialId("dreams_foundation_tutorial", "en"),
                        "Dreams Tutorial",
                        SCREEN_DREAMS,
                        620,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Explains the dream module experience with simple first-use steps.",
                        "en",
                        step(1, "dream-entry", "Dream Entry",
                                "Write your dream to receive a symbolic interpretation.",
                                "dreams.compose_entry", "create-outline"),
                        step(2, "interpretation-result", "Interpretation Result",
                                "The interpretation is designed to support awareness and insight.",
                                "dreams.interpretation_result", "moon-outline"),
                        step(3, "history-entry", "Past Records",
                                "Return to previous dream entries and follow your evolving patterns over time.",
                                "dreams.history_entry", "time-outline"),
                        step(4, "help-entry", "Open the Guide Again",
                                "Restart this guide from the same screen whenever you need it.",
                                "dreams.help_entry", "help-circle-outline")
                ),
                tutorial(
                        localizedTutorialId("numerology_foundation_tutorial", "en"),
                        "Numerology Tutorial",
                        SCREEN_NUMEROLOGY,
                        610,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Flow that introduces the input, result, and detail cards on the Numerology screen.",
                        "en",
                        step(1, "numerology-input", "Input Area",
                                "Discover the symbolic meanings of your numbers here.",
                                "numerology.input_area", "calculator-outline"),
                        step(2, "numerology-result", "Result Card",
                                "Your core number profile and current theme stand out here in a short summary.",
                                "numerology.result_card", "analytics-outline"),
                        step(3, "numerology-detail", "Detailed Explanations",
                                "Detail cards explain your personal numbers in a deeper and clearer way.",
                                "numerology.detail_section", "reader-outline"),
                        step(4, "help-entry", "Open the Guide Again",
                                "Restart this guide manually whenever you want.",
                                "numerology.help_entry", "help-circle-outline")
                ),
                tutorial(
                        localizedTutorialId("name_analysis_foundation_tutorial", "en"),
                        "Name Analysis Tutorial",
                        SCREEN_NAME_ANALYSIS,
                        600,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Explains the input, meaning, and save steps on the Name Analysis screen.",
                        "en",
                        step(1, "name-input", "Name Input Area",
                                "Enter a name to start exploring its meaning and symbolic associations.",
                                "name_analysis.name_input", "search-outline"),
                        step(2, "meaning-panel", "Meaning and Origin",
                                "See the meaning of the name and its symbolic associations here.",
                                "name_analysis.meaning_panel", "book-outline"),
                        step(3, "save-share", "Save and Favorite",
                                "Save the names you like and come back to them quickly later.",
                                "name_analysis.save_share_entry", "bookmark-outline"),
                        step(4, "help-entry", "Open the Guide Again",
                                "You can reopen this guide whenever you need it from the same screen.",
                                "name_analysis.help_entry", "help-circle-outline")
                ),
                tutorial(
                        localizedTutorialId("spiritual_practice_foundation_tutorial", "en"),
                        "Spiritual Practice Tutorial",
                        SCREEN_SPIRITUAL_PRACTICE,
                        590,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Introduces the daily flow on the prayer, meditation, and spiritual practice screen.",
                        "en",
                        step(1, "daily-recommendation", "Daily Recommendation",
                                "See today's recommended practice here and begin with a quick entry point.",
                                "spiritual_practice.daily_recommendation", "sunny-outline"),
                        step(2, "practice-counter", "Practice Counter",
                                "Use the counter area to follow your daily practice step by step.",
                                "spiritual_practice.practice_counter", "timer-outline"),
                        step(3, "journal-entry", "Journal and Records",
                                "Save short notes about your experience and follow your growth more consistently.",
                                "spiritual_practice.journal_entry", "book-outline"),
                        step(4, "help-entry", "Open the Guide Again",
                                "Reopen this guide from the same screen whenever you want.",
                                "spiritual_practice.help_entry", "help-circle-outline")
                ),
                tutorial(
                        localizedTutorialId("profile_foundation_tutorial", "en"),
                        "Profile Tutorial",
                        SCREEN_PROFILE,
                        580,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Tutorial that introduces personalization areas on the profile and settings screen.",
                        "en",
                        step(1, "personal-info", "Personal Information",
                                "Update your profile details here to make the experience feel more personal.",
                                "profile.personal_info", "person-outline"),
                        step(2, "preferences", "Preferences",
                                "Manage notification, language, and experience preferences from this section.",
                                "profile.preferences", "options-outline"),
                        step(3, "tutorial-center", "Tutorial Center",
                                "See all onboarding and tutorial flows in one place and restart them whenever needed.",
                                "profile.tutorial_center_entry", "refresh-outline"),
                        step(4, "help-entry", "Help and Guidance",
                                "Use the help area whenever you want to review tutorials again.",
                                "profile.help_entry", "help-circle-outline")
                )
        );
    }

    private TutorialSeed tutorial(
            String tutorialId,
            String name,
            String screenKey,
            int priority,
            TutorialPresentationType presentationType,
            String description,
            String locale,
            TutorialStepSeed... steps
    ) {
        return new TutorialSeed(
                tutorialId,
                name,
                screenKey,
                TutorialPlatform.ALL,
                1,
                priority,
                presentationType,
                description,
                locale,
                List.of(steps)
        );
    }

    private String localizedTutorialId(String baseTutorialId, String locale) {
        if ("en".equalsIgnoreCase(locale)) {
            return baseTutorialId + "_en";
        }
        return baseTutorialId;
    }

    private TutorialStepSeed step(
            int orderIndex,
            String stepId,
            String title,
            String body,
            String targetKey,
            String iconKey
    ) {
        return new TutorialStepSeed(orderIndex, stepId, title, body, targetKey, iconKey);
    }

    private record TutorialSeed(
            String tutorialId,
            String name,
            String screenKey,
            TutorialPlatform platform,
            int version,
            int priority,
            TutorialPresentationType presentationType,
            String description,
            String locale,
            List<TutorialStepSeed> steps
    ) {
    }

    private record TutorialStepSeed(
            int orderIndex,
            String stepId,
            String title,
            String body,
            String targetKey,
            String iconKey
    ) {
    }
}
