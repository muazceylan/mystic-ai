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
                        "Kullanıcının uygulamanın değerini ilk açılışta hızlı anlaması için global onboarding akışı.",
                        "tr",
                        step(1, "welcome", "Hoş Geldin",
                                "Sana özel astrolojik rehberlik, planlama ve içgörü deneyimine hoş geldin.",
                                "global_onboarding.intro", "sparkles-outline"),
                        step(2, "daily-guidance", "Günlük Rehberlik",
                                "Günün enerjisini, transitleri ve öne çıkan etkileri burada takip edersin.",
                                "global_onboarding.intro", "sunny-outline"),
                        step(3, "planning-and-decisions", "Planlama ve Karar",
                                "Guru Planlayıcı ve Karar Pusulası ile uygun zamanları ve seçenekleri değerlendirebilirsin.",
                                "global_onboarding.intro", "compass-outline"),
                        step(4, "compatibility-and-discovery", "Uyum ve Keşif",
                                "Uyum analizi, rüya, numeroloji ve diğer modüllerle kendini daha yakından keşfedebilirsin.",
                                "global_onboarding.intro", "planet-outline"),
                        step(5, "lets-start", "Başla",
                                "Modüllere girdikçe kısa rehberler seni karşılayacak.",
                                "global_onboarding.intro", "rocket-outline")
                ),
                tutorial(
                        "home_foundation_tutorial",
                        "Home Foundation Tutorial",
                        SCREEN_HOME,
                        900,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Ana sayfa deneyimini ilk kullanımda kısa adımlarla tanıtan tutorial.",
                        "tr",
                        step(1, "hero-energy", "Günün Enerjisi",
                                "Bugünün enerjisini burada kısa ve sade biçimde görürsün.",
                                "home.hero_energy", "sunny-outline"),
                        step(2, "quick-actions", "Ana Modül Kısayolları",
                                "En çok kullanılan modüllere buradan hızlıca geçebilirsin.",
                                "home.quick_actions", "rocket-outline"),
                        step(3, "personal-widget", "Sana Özel Öneriler",
                                "Sana özel içgörüler ve öneriler burada öne çıkar.",
                                "home.personal_widget", "sparkles-outline"),
                        step(4, "module-guides", "Diğer Rehberler",
                                "Diğer rehberleri modüllere girdikçe göreceksin.",
                                "home.help_entry", "navigate-outline")
                ),
                tutorial(
                        "daily_transits_foundation_tutorial",
                        "Daily Transits Tutorial",
                        SCREEN_DAILY_TRANSITS,
                        700,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Günlük transit ekranındaki temel alanları tanıtan onboarding akışı.",
                        "tr",
                        step(1, "daily-summary", "Günün Özeti",
                                "Bugünün gökyüzü etkilerini burada kısa ve anlaşılır biçimde görürsün.",
                                "daily_transits.hero_summary", "sunny-outline"),
                        step(2, "transit-cards", "Transit Kartları",
                                "Transit kartları günün öne çıkan etkilerini sırayla açıklar.",
                                "daily_transits.transit_cards", "albums-outline"),
                        step(3, "impact-zones", "Etki Alanları",
                                "Destekleyici ve dikkat gerektiren alanlar kararlarını daha bilinçli yorumlamana yardım eder.",
                                "daily_transits.impact_zones", "flash-outline"),
                        step(4, "help-reopen", "Rehberi Tekrar Aç",
                                "Dilediğinde buradan bu rehberi tekrar başlatabilirsin.",
                                "daily_transits.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "cosmic_planner_intro",
                        "Cosmic Planner Tutorial",
                        SCREEN_COSMIC_PLANNER,
                        680,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Guru Planlayıcı ekranında odak alanı, filtre ve planlama aksiyonlarını tanıtır.",
                        "tr",
                        step(1, "date-selection", "Tarih Seçimi",
                                "Hangi gün hangi konuya odaklanmanın daha uygun olduğunu burada görürsün.",
                                "cosmic_planner.date_picker", "calendar-outline"),
                        step(2, "category-dock", "Kategori Dock",
                                "Kategori seçerek aşk, iş, iletişim gibi alanlara odaklanabilirsin.",
                                "cosmic_planner.category_dock", "albums-outline"),
                        step(3, "daily-recommendations", "Günlük Öneriler",
                                "Günlük öneriler planlarını gökyüzü ritmine göre şekillendirmen için tasarlandı.",
                                "cosmic_planner.daily_recommendations", "sparkles-outline"),
                        step(4, "reminder-action", "Hatırlatıcı ve Plan",
                                "Hatırlatıcılarla uygun zamanı kaçırmadan planını takip edebilirsin.",
                                "cosmic_planner.reminder_action", "alarm-outline")
                ),
                tutorial(
                        "decision_compass_intro",
                        "Decision Compass Tutorial",
                        SCREEN_DECISION_COMPASS,
                        660,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Karar Pusulası ekranında giriş, sonuç ve yeniden değerlendirme akışını açıklar.",
                        "tr",
                        step(1, "decision-input", "Karar Giriş Alanı",
                                "Burada seçeneklerini karşılaştırarak günün etkileriyle birlikte değerlendirebilirsin.",
                                "decision_compass.input_area", "list-outline"),
                        step(2, "result-comparison", "Sonuç Karşılaştırma",
                                "Sonuç alanı kesin hüküm vermez; kararını destekleyen bir rehber sunar.",
                                "decision_compass.result_area", "stats-chart-outline"),
                        step(3, "insight-commentary", "İçgörü Yorumları",
                                "Yorumlar, seçeneklerin güçlü ve zayıf taraflarını daha net görmene yardım eder.",
                                "decision_compass.header_summary", "reader-outline"),
                        step(4, "reevaluate-entry", "Yeniden Değerlendir",
                                "Kaydedip daha sonra yeniden değerlendirebilir veya seçeneklerini güncelleyebilirsin.",
                                "decision_compass.reevaluate_entry", "options-outline")
                ),
                tutorial(
                        "compatibility_foundation_tutorial",
                        "Compatibility Tutorial",
                        SCREEN_COMPATIBILITY,
                        640,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Uyum Analizi ekranındaki özet, sekmeler ve skor kartlarını tanıtan akıştır.",
                        "tr",
                        step(1, "compatibility-summary", "Uyum Özeti",
                                "Genel uyum özetini burada hızlıca görürsün.",
                                "compatibility.summary_header", "heart-outline"),
                        step(2, "sections-and-details", "Özet ve Detay",
                                "Kişi ve ilişki alanlarını birlikte inceleyerek daha net yorum yapabilirsin.",
                                "compatibility.section_tabs", "grid-outline"),
                        step(3, "category-score-cards", "Kategori Kartları",
                                "Skorların yanında açıklamalar ve öneriler de sunulur; yalnızca sayı gösterilmez.",
                                "compatibility.score_area", "analytics-outline"),
                        step(4, "save-and-share", "Kaydet ve Paylaş",
                                "Analizi başlatıp sonuçları daha sonra yeniden değerlendirebilir ve paylaşabilirsin.",
                                "compatibility.save_share_entry", "share-social-outline")
                ),
                tutorial(
                        "birth_chart_intro",
                        "Birth Chart Tutorial",
                        SCREEN_BIRTH_CHART,
                        630,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Haritam ekranında özet, teknik detay ve yorum bölümlerini adım adım tanıtır.",
                        "tr",
                        step(1, "hero-summary", "Harita Özeti",
                                "Doğum haritanın genel özetini burada hızlıca görebilirsin.",
                                "birth_chart.hero_summary", "planet-outline"),
                        step(2, "main-placements", "Ana Yerleşimler",
                                "Ana yerleşimler, karakterini ve eğilimlerini anlamana yardımcı olur.",
                                "birth_chart.planet_positions", "sparkles-outline"),
                        step(3, "technical-details", "Teknik Detaylar",
                                "Detay alanlarında evler, burçlar ve teknik katmanları inceleyebilirsin.",
                                "birth_chart.technical_details", "grid-outline"),
                        step(4, "insight-cards", "Yorum Kartları",
                                "Yorum kartları haritandaki bilgileri daha sade ve anlaşılır hale getirir.",
                                "birth_chart.insight_panel", "reader-outline"),
                        step(5, "detail-actions", "Kaydet ve İncele",
                                "İstersen bu alanı kaydedebilir, paylaşabilir ya da daha detaylı inceleyebilirsin.",
                                "birth_chart.detail_action", "share-social-outline")
                ),
                tutorial(
                        "dreams_foundation_tutorial",
                        "Dreams Tutorial",
                        SCREEN_DREAMS,
                        620,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Rüya modülü deneyimini ilk kullanımda sade adımlarla açıklar.",
                        "tr",
                        step(1, "dream-entry", "Rüya Girişi",
                                "Rüyanı yazarak sembolik bir yorum alırsın.",
                                "dreams.compose_entry", "create-outline"),
                        step(2, "interpretation-result", "Yorum Sonucu",
                                "Yorum sonucu içgörü ve farkındalık için tasarlandı.",
                                "dreams.interpretation_result", "moon-outline"),
                        step(3, "history-entry", "Geçmiş Kayıtlar",
                                "Önceki rüya kayıtlarına dönüp tekrar bakabilir, gelişimini takip edebilirsin.",
                                "dreams.history_entry", "time-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Aç",
                                "İstediğinde rehberi bu ekrandan yeniden başlatabilirsin.",
                                "dreams.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "numerology_foundation_tutorial",
                        "Numerology Tutorial",
                        SCREEN_NUMEROLOGY,
                        610,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Numeroloji ekranında giriş, sonuç ve detay kartlarını tanıtan akıştır.",
                        "tr",
                        step(1, "numerology-input", "Giriş Alanı",
                                "Sayıların sembolik anlamlarını burada keşfedersin.",
                                "numerology.input_area", "calculator-outline"),
                        step(2, "numerology-result", "Sonuç Kartı",
                                "Ana sayı profilin ve güncel tema burada kısa bir özetle öne çıkar.",
                                "numerology.result_card", "analytics-outline"),
                        step(3, "numerology-detail", "Detay Açıklamalar",
                                "Detay kartları kişisel sayılarını daha derin ve anlaşılır biçimde açıklar.",
                                "numerology.detail_section", "reader-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Aç",
                                "Dilediğinde rehberi manuel olarak yeniden başlatabilirsin.",
                                "numerology.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "name_analysis_foundation_tutorial",
                        "Name Analysis Tutorial",
                        SCREEN_NAME_ANALYSIS,
                        600,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "İsim analizi ekranındaki giriş, anlam ve kaydetme adımlarını açıklar.",
                        "tr",
                        step(1, "name-input", "İsim Giriş Alanı",
                                "İsmini girerek anlam ve sembolik çağrışımlarını keşfetmeye başlarsın.",
                                "name_analysis.name_input", "search-outline"),
                        step(2, "meaning-panel", "Anlam ve Köken",
                                "İsmin anlamını ve sembolik çağrışımlarını burada görürsün.",
                                "name_analysis.meaning_panel", "book-outline"),
                        step(3, "save-share", "Kaydet ve Favorile",
                                "Beğendiğin isimleri kaydedebilir ve daha sonra hızlıca geri dönebilirsin.",
                                "name_analysis.save_share_entry", "bookmark-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Aç",
                                "Rehberi ihtiyaç duyduğunda bu ekrandan yeniden açabilirsin.",
                                "name_analysis.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "spiritual_practice_foundation_tutorial",
                        "Spiritual Practice Tutorial",
                        SCREEN_SPIRITUAL_PRACTICE,
                        590,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Dua/meditasyon ve manevi pratik ekranında günlük akışı tanıtır.",
                        "tr",
                        step(1, "daily-recommendation", "Günlük Öneri",
                                "Günün önerilen pratiğini burada görerek hızlı bir başlangıç yapabilirsin.",
                                "spiritual_practice.daily_recommendation", "sunny-outline"),
                        step(2, "practice-counter", "Pratik Sayacı",
                                "Sayaç alanıyla günlük pratiklerini adım adım takip edebilirsin.",
                                "spiritual_practice.practice_counter", "timer-outline"),
                        step(3, "journal-entry", "Günlük ve Kayıt",
                                "Kısa notlarla deneyimini kaydedip düzenli gelişimini izleyebilirsin.",
                                "spiritual_practice.journal_entry", "book-outline"),
                        step(4, "help-entry", "Rehberi Tekrar Aç",
                                "Dilediğinde bu rehberi aynı ekrandan tekrar açabilirsin.",
                                "spiritual_practice.help_entry", "help-circle-outline")
                ),
                tutorial(
                        "profile_foundation_tutorial",
                        "Profile Tutorial",
                        SCREEN_PROFILE,
                        580,
                        TutorialPresentationType.SPOTLIGHT_CARD,
                        "Profil ve ayarlar ekranında kişiselleştirme alanlarını tanıtan tutorial.",
                        "tr",
                        step(1, "personal-info", "Kişisel Bilgiler",
                                "Profil bilgilerini burada güncelleyerek deneyimini sana özel hale getirebilirsin.",
                                "profile.personal_info", "person-outline"),
                        step(2, "preferences", "Tercihler",
                                "Bildirim, dil ve deneyim tercihlerini bu bölümden yönetebilirsin.",
                                "profile.preferences", "options-outline"),
                        step(3, "tutorial-center", "Rehber Merkezi",
                                "Tüm onboarding ve tutorial akışlarını tek yerden görüp yeniden başlatabilirsin.",
                                "profile.tutorial_center_entry", "refresh-outline"),
                        step(4, "help-entry", "Yardım ve Rehber",
                                "Rehberleri tekrar görmek için yardım alanını dilediğinde kullanabilirsin.",
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
                                "Use Guru Planner and Decision Compass to review timing and options with more clarity.",
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
                        "Introduces the focus area, filters, and planning actions on the Guru Planner screen.",
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
