package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification.NotificationType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class NotificationTemplateService {

    private static final Map<NotificationType, List<NotificationTemplate>> TEMPLATES_TR = Map.ofEntries(
            Map.entry(NotificationType.DAILY_SUMMARY, List.of(
                    new NotificationTemplate("daily_summary", "tr", 0, "Gunun enerjisi guncellendi", "Sana uygun akisi gormek icin tikla.", "/(tabs)/home"),
                    new NotificationTemplate("daily_summary", "tr", 1, "Gunluk yorumun hazir", "Bugunku kozmik enerjini kesfet.", "/(tabs)/home"),
                    new NotificationTemplate("daily_summary", "tr", 2, "Yildizlar bugun ne diyor?", "Gunun ozetini goruntule.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.ENERGY_UPDATE, List.of(
                    new NotificationTemplate("energy_update", "tr", 0, "Enerji penceresi olustu", "Iletisim tarafi icin uygun bir zaman.", "/(tabs)/calendar"),
                    new NotificationTemplate("energy_update", "tr", 1, "Odak enerjisi guclu", "Ogleden sonra verimli bir pencere var.", "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.WEEKLY_SUMMARY, List.of(
                    new NotificationTemplate("weekly_summary", "tr", 0, "Haftalik ozetin hazir", "Hangi alanin one ciktigini gor.", "/(tabs)/weekly-analysis"),
                    new NotificationTemplate("weekly_summary", "tr", 1, "Bu haftanin analizi tamamlandi", "Kozmik ozeti incele.", "/(tabs)/weekly-analysis")
            )),
            Map.entry(NotificationType.PRAYER_REMINDER, List.of(
                    new NotificationTemplate("prayer_reminder", "tr", 0, "Dua vakti", "Dua rutinini tamamlamak icin sakin bir zaman olabilir.", "/(tabs)/spiritual"),
                    new NotificationTemplate("prayer_reminder", "tr", 1, "Gunluk duan seni bekliyor", "Ic huzur icin birlikte baslayalim.", "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.MEDITATION_REMINDER, List.of(
                    new NotificationTemplate("meditation_reminder", "tr", 0, "Meditasyon zamani", "Bugunku meditasyon onerin hazir.", "/(tabs)/spiritual"),
                    new NotificationTemplate("meditation_reminder", "tr", 1, "Biraz nefes al", "Sakin bir an icin meditasyonunu baslatabilirsin.", "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.PLANNER_REMINDER, List.of(
                    new NotificationTemplate("planner_reminder", "tr", 0, "Planlayicinda yeni oneriler var", "Bugunku uygun saatleri gor.", "/(tabs)/calendar"),
                    new NotificationTemplate("planner_reminder", "tr", 1, "Kozmik planlayici guncellendi", "Bugun icin en uygun zaman pencerelerine bak.", "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.EVENING_CHECKIN, List.of(
                    new NotificationTemplate("evening_checkin", "tr", 0, "Gunun nasil gecti?", "Aksam check-in'ini tamamla.", "/(tabs)/home"),
                    new NotificationTemplate("evening_checkin", "tr", 1, "Gun sonu degerlendirmesi", "Bugunun enerjisini degerlendir.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.DREAM_REMINDER, List.of(
                    new NotificationTemplate("dream_reminder", "tr", 0, "Ruyani hatirliyor musun?", "Unutmadan kaydet, bilincalti mesajlar sabah en tazedir.", "/(tabs)/dreams"),
                    new NotificationTemplate("dream_reminder", "tr", 1, "Sabah ruya zamani", "Ruyalarini sesli veya yazili kaydet.", "/(tabs)/dreams")
            )),
            Map.entry(NotificationType.RE_ENGAGEMENT, List.of(
                    new NotificationTemplate("re_engagement", "tr", 0, "Seni ozledik", "Son birkac gunluk ozetin hazir.", "/(tabs)/home"),
                    new NotificationTemplate("re_engagement", "tr", 1, "Yeni icgoruler olusturuldu", "Sik kullandigin modulde guncellemeler var.", "/(tabs)/home"),
                    new NotificationTemplate("re_engagement", "tr", 2, "Haftalik ozetin seni bekliyor", "Kozmik enerjideki degisiklikleri gor.", "/(tabs)/weekly-analysis")
            )),
            Map.entry(NotificationType.MINI_INSIGHT, List.of(
                    new NotificationTemplate("mini_insight", "tr", 0, "Bugunku mini onerin hazir", "Gunun icin kisa bir kozmik ipucu.", "/(tabs)/home"),
                    new NotificationTemplate("mini_insight", "tr", 1, "Kararlarini sade tut", "Bugun icin akilli bir adim onerimiz var.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.NUMEROLOGY_CHECKIN, List.of(
                    new NotificationTemplate(
                            "numerology_checkin",
                            "tr",
                            0,
                            "Numeroloji yoklama zamani",
                            "Bugunun sayi sinyaline bakip kisa yoklama yap.",
                            "/numerology?entry_point=push_numerology_checkin"
                    ),
                    new NotificationTemplate(
                            "numerology_checkin",
                            "tr",
                            1,
                            "Bugunku numeroloji akisin hazir",
                            "Bu yilin temasini bugunun ritmiyle hizala.",
                            "/numerology?entry_point=push_numerology_checkin"
                    )
            )),
            Map.entry(NotificationType.AI_ANALYSIS_COMPLETE, List.of(
                    new NotificationTemplate("ai_analysis_complete", "tr", 0, "Analizin tamamlandi", "Sonuclari gormek icin tikla.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.COMPATIBILITY_UPDATE, List.of(
                    new NotificationTemplate("compatibility_update", "tr", 0, "Uyum analizin guncellendi", "Kozmik baglantini kesfet.", "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.PRODUCT_UPDATE, List.of(
                    new NotificationTemplate("product_update", "tr", 0, "Yeni ozellik", "Uygulamada yeni bir deneyim seni bekliyor.", "/(tabs)/home")
            ))
    );

    private static final Map<NotificationType, List<NotificationTemplate>> TEMPLATES_EN = Map.ofEntries(
            Map.entry(NotificationType.DAILY_SUMMARY, List.of(
                    new NotificationTemplate("daily_summary", "en", 0, "Today's energy updated", "See the flow that suits you.", "/(tabs)/home"),
                    new NotificationTemplate("daily_summary", "en", 1, "Your daily reading is ready", "Discover today's cosmic energy.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.ENERGY_UPDATE, List.of(
                    new NotificationTemplate("energy_update", "en", 0, "Energy window opened", "A good time for communication.", "/(tabs)/calendar"),
                    new NotificationTemplate("energy_update", "en", 1, "Focus energy is strong", "There's a productive window this afternoon.", "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.WEEKLY_SUMMARY, List.of(
                    new NotificationTemplate("weekly_summary", "en", 0, "Your weekly summary is ready", "See which area stood out.", "/(tabs)/weekly-analysis")
            )),
            Map.entry(NotificationType.PRAYER_REMINDER, List.of(
                    new NotificationTemplate("prayer_reminder", "en", 0, "Prayer time", "A calm moment for your prayer routine.", "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.MEDITATION_REMINDER, List.of(
                    new NotificationTemplate("meditation_reminder", "en", 0, "Meditation time", "Your meditation suggestion is ready.", "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.PLANNER_REMINDER, List.of(
                    new NotificationTemplate("planner_reminder", "en", 0, "Planner updated", "Check today's optimal time windows.", "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.EVENING_CHECKIN, List.of(
                    new NotificationTemplate("evening_checkin", "en", 0, "How was your day?", "Complete your evening check-in.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.DREAM_REMINDER, List.of(
                    new NotificationTemplate("dream_reminder", "en", 0, "Remember your dream?", "Record it before you forget.", "/(tabs)/dreams")
            )),
            Map.entry(NotificationType.RE_ENGAGEMENT, List.of(
                    new NotificationTemplate("re_engagement", "en", 0, "We missed you", "Your recent summary is ready.", "/(tabs)/home"),
                    new NotificationTemplate("re_engagement", "en", 1, "New insights generated", "Updates in your favorite module.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.MINI_INSIGHT, List.of(
                    new NotificationTemplate("mini_insight", "en", 0, "Today's mini tip is ready", "A quick cosmic hint for your day.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.NUMEROLOGY_CHECKIN, List.of(
                    new NotificationTemplate(
                            "numerology_checkin",
                            "en",
                            0,
                            "Numerology check-in time",
                            "Open today's number signal and do a short check-in.",
                            "/numerology?entry_point=push_numerology_checkin"
                    ),
                    new NotificationTemplate(
                            "numerology_checkin",
                            "en",
                            1,
                            "Your numerology flow is ready",
                            "Align today's rhythm with your yearly theme.",
                            "/numerology?entry_point=push_numerology_checkin"
                    )
            )),
            Map.entry(NotificationType.AI_ANALYSIS_COMPLETE, List.of(
                    new NotificationTemplate("ai_analysis_complete", "en", 0, "Analysis complete", "Tap to see your results.", "/(tabs)/home")
            )),
            Map.entry(NotificationType.COMPATIBILITY_UPDATE, List.of(
                    new NotificationTemplate("compatibility_update", "en", 0, "Compatibility updated", "Discover your cosmic connection.", "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.PRODUCT_UPDATE, List.of(
                    new NotificationTemplate("product_update", "en", 0, "New feature", "A new experience awaits you.", "/(tabs)/home")
            ))
    );

    /**
     * Select a template variant deterministically based on userId + date,
     * so the same user never gets the same variant two days in a row,
     * while keeping selection stable within a day.
     */
    public NotificationTemplate getTemplate(NotificationType type, String locale, Long userId) {
        Map<NotificationType, List<NotificationTemplate>> templates =
                (locale != null && locale.toLowerCase().startsWith("en")) ? TEMPLATES_EN : TEMPLATES_TR;
        List<NotificationTemplate> list = templates.getOrDefault(type, List.of());
        if (list.isEmpty()) {
            list = TEMPLATES_TR.getOrDefault(type, List.of(
                    new NotificationTemplate(type.name(), "tr", 0,
                            "Bildirim", "Yeni bir guncelleme var.", "/(tabs)/home")
            ));
        }
        // Deterministic: (userId + dayOfYear) mod variantCount
        int dayOfYear = LocalDate.now().getDayOfYear();
        int index = (int) ((userId + dayOfYear) % list.size());
        return list.get(index);
    }

    /** Backward-compatible overload without userId (uses index 0) */
    public NotificationTemplate getTemplate(NotificationType type, String locale) {
        return getTemplate(type, locale, 0L);
    }

    public record NotificationTemplate(
            String templateKey,
            String locale,
            int variantIndex,
            String title,
            String body,
            String deeplink
    ) {
        public String variantKey() {
            return "v" + variantIndex;
        }
    }
}
