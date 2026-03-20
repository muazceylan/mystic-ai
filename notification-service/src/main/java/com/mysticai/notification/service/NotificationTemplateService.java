package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification.NotificationType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Locale;
import java.util.List;
import java.util.Map;

@Service
public class NotificationTemplateService {

    private static final String MODULE_HOME = "home";
    private static final String MODULE_DAILY_TRANSITS = "daily_transits";
    private static final String MODULE_WEEKLY_HOROSCOPE = "weekly_horoscope";
    private static final String MODULE_DREAM_ANALYSIS = "dream_analysis";
    private static final String MODULE_SPIRITUAL = "spiritual";
    private static final String MODULE_MEDITATION = "meditation";
    private static final String MODULE_PRAYER = "prayer_module";
    private static final String MODULE_NUMEROLOGY = "numerology";
    private static final String MODULE_COMPATIBILITY = "compatibility";
    private static final String MODULE_NOTIFICATIONS = "notifications";

    private static final Map<NotificationType, List<NotificationTemplate>> TEMPLATES_TR = Map.ofEntries(
            Map.entry(NotificationType.DAILY_SUMMARY, List.of(
                    t("daily_summary", "tr", 0, MODULE_DAILY_TRANSITS,
                            "Bugun icin net bir enerji plani hazir",
                            "Odaklanman gereken 3 alan ve kritik saatler seni bekliyor.",
                            "/daily-summary?entry_point=push_daily_summary"),
                    t("daily_summary", "tr", 1, MODULE_DAILY_TRANSITS,
                            "Gunun stratejik yorumu yayinlandi",
                            "Kariyer, iliski ve ruh hali dengesini 1 dakikada gor.",
                            "/daily-summary?entry_point=push_daily_summary"),
                    t("daily_summary", "tr", 2, MODULE_DAILY_TRANSITS,
                            "Kozmik brifingin hazir",
                            "Gunu dagilmadan yonetmek icin kisa ozetine simdi bak.",
                            "/daily-summary?entry_point=push_daily_summary")
            )),
            Map.entry(NotificationType.ENERGY_UPDATE, List.of(
                    t("energy_update", "tr", 0, MODULE_DAILY_TRANSITS,
                            "Transit penceresi acildi",
                            "Iletisim ve karar alma icin en verimli saatlere gecis oldu.",
                            "/(tabs)/calendar"),
                    t("energy_update", "tr", 1, MODULE_DAILY_TRANSITS,
                            "Enerji ritmi degisti",
                            "Takvimdeki yeni pencereyi yakalarsan bugun daha akici ilerlersin.",
                            "/(tabs)/calendar"),
                    t("energy_update", "tr", 2, MODULE_DAILY_TRANSITS,
                            "Verimlilik araligi aktif",
                            "Kritik islerini kozmik takvimde one cikan saatlere tasiyabilirsin.",
                            "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.WEEKLY_SUMMARY, List.of(
                    t("weekly_summary", "tr", 0, MODULE_WEEKLY_HOROSCOPE,
                            "Haftalik kozmik raporun hazir",
                            "Bu haftanin firsat alanlarini ve dikkat noktalarini ac.",
                            "/(tabs)/weekly-analysis"),
                    t("weekly_summary", "tr", 1, MODULE_WEEKLY_HOROSCOPE,
                            "Haftanin yon haritasi yayinlandi",
                            "Enerjinin yukselecegi gunleri one al, riskli saatleri dengele.",
                            "/(tabs)/weekly-analysis")
            )),
            Map.entry(NotificationType.PRAYER_REMINDER, List.of(
                    t("prayer_reminder", "tr", 0, MODULE_PRAYER,
                            "Dua rutinin icin en sakin pencere",
                            "Kisa bir dua ile zihnini toparlayip gunu dengeleyebilirsin.",
                            "/(tabs)/spiritual/dua"),
                    t("prayer_reminder", "tr", 1, MODULE_PRAYER,
                            "Gunluk dua molani planla",
                            "2 dakikalik manevi odak, gun boyu daha guclu kalmana yardimci olur.",
                            "/(tabs)/spiritual/dua")
            )),
            Map.entry(NotificationType.MEDITATION_REMINDER, List.of(
                    t("meditation_reminder", "tr", 0, MODULE_MEDITATION,
                            "Meditasyon icin uygun an geldi",
                            "Nefesini duzenleyip zihinsel yogunlugu 5 dakikada sifirlayabilirsin.",
                            "/(tabs)/spiritual/meditation"),
                    t("meditation_reminder", "tr", 1, MODULE_MEDITATION,
                            "Zihnini toparlama zamani",
                            "Kisa meditasyon seansi ile bugunku tempoyu daha rahat yonet.",
                            "/(tabs)/spiritual/meditation")
            )),
            Map.entry(NotificationType.PLANNER_REMINDER, List.of(
                    t("planner_reminder", "tr", 0, MODULE_DAILY_TRANSITS,
                            "Kozmik planlayici yeni oneriler sundu",
                            "Toplanti, gorusme ve odak isi icin ideal saatleri guncelledik.",
                            "/(tabs)/calendar"),
                    t("planner_reminder", "tr", 1, MODULE_DAILY_TRANSITS,
                            "Takvim stratejini yenile",
                            "Gunun en verimli zaman bloklarini acip planini hizla netlestir.",
                            "/(tabs)/calendar"),
                    t("planner_reminder", "tr", 2, MODULE_DAILY_TRANSITS,
                            "Planlama avantaji acildi",
                            "Kozmik akisa gore hazirlanan zaman onerisini simdi uygula.",
                            "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.EVENING_CHECKIN, List.of(
                    t("evening_checkin", "tr", 0, MODULE_HOME,
                            "Gun sonu check-in zamani",
                            "Bugunun kazanimini ve yarinin niyetini 60 saniyede netlestir.",
                            "/daily-summary?entry_point=push_evening_checkin"),
                    t("evening_checkin", "tr", 1, MODULE_HOME,
                            "Aksam degerlendirme notun hazir",
                            "Enerji seviyeni kaydedip yarina daha dengeli basla.",
                            "/daily-summary?entry_point=push_evening_checkin")
            )),
            Map.entry(NotificationType.DREAM_REMINDER, List.of(
                    t("dream_reminder", "tr", 0, MODULE_DREAM_ANALYSIS,
                            "Ruyani kaydetmek icin ideal zaman",
                            "Sabah detaylarini hizla yaz, bilincalti mesajini kaybetme.",
                            "/(tabs)/dreams"),
                    t("dream_reminder", "tr", 1, MODULE_DREAM_ANALYSIS,
                            "Ruya defterin seni bekliyor",
                            "Tek bir not bile gunun icgorusunu degistirebilir.",
                            "/(tabs)/dreams"),
                    t("dream_reminder", "tr", 2, MODULE_DREAM_ANALYSIS,
                            "Gece mesajini yakala",
                            "Ruyan tazeyken kaydet, yorum kalitesi belirgin sekilde artar.",
                            "/(tabs)/dreams")
            )),
            Map.entry(NotificationType.RE_ENGAGEMENT, List.of(
                    t("re_engagement", "tr", 0, MODULE_DAILY_TRANSITS,
                            "Sana ozel gunluk brifing birikti",
                            "Ana sayfada bugun icin ozet ve hizli aksiyonlar hazir.",
                            "/daily-summary?entry_point=push_reengagement"),
                    t("re_engagement", "tr", 1, MODULE_DAILY_TRANSITS,
                            "Transit panelinde yeni firsat penceresi var",
                            "Takvimde verimli saatleri kacirmadan guncel akisa gec.",
                            "/(tabs)/calendar"),
                    t("re_engagement", "tr", 2, MODULE_WEEKLY_HOROSCOPE,
                            "Haftalik yon raporun yenilendi",
                            "Haftayi dogru planlamak icin oncelik listeni ac.",
                            "/(tabs)/weekly-analysis"),
                    t("re_engagement", "tr", 3, MODULE_DREAM_ANALYSIS,
                            "Ruya gunlugunde yeni bir yorum firsati var",
                            "Son ruyani kaydedip icgoruyu derinlestir.",
                            "/(tabs)/dreams"),
                    t("re_engagement", "tr", 4, MODULE_SPIRITUAL,
                            "Manevi rutinine donus icin iyi bir an",
                            "Kisa bir pratikle gunluk dengeyi yeniden kur.",
                            "/(tabs)/spiritual"),
                    t("re_engagement", "tr", 5, MODULE_NUMEROLOGY,
                            "Sayi akisin guncellendi",
                            "Bugunku numeroloji sinyalini acip odagini hizala.",
                            "/numerology?entry_point=push_reengagement"),
                    t("re_engagement", "tr", 6, MODULE_COMPATIBILITY,
                            "Uyumluluk panelinde yeni bir bakis seni bekliyor",
                            "Iliski dinamiklerini taze bir perspektifle incele.",
                            "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.MINI_INSIGHT, List.of(
                    t("mini_insight", "tr", 0, MODULE_DAILY_TRANSITS,
                            "Bugune dair mini bir strateji",
                            "Sadece bir adimlik odak degisikligi gununun kalitesini artirabilir.",
                            "/daily-summary?entry_point=push_mini_insight"),
                    t("mini_insight", "tr", 1, MODULE_DAILY_TRANSITS,
                            "Kucuk bir zamanlama hamlesi oneriyoruz",
                            "Takvimdeki uygun saatle bugunku isi daha az eforla tamamla.",
                            "/(tabs)/calendar"),
                    t("mini_insight", "tr", 2, MODULE_NUMEROLOGY,
                            "Sayi sinyalin bugun net",
                            "Numeroloji kartinda gunun temasini 30 saniyede yakala.",
                            "/numerology?entry_point=push_mini_insight"),
                    t("mini_insight", "tr", 3, MODULE_SPIRITUAL,
                            "Mini farkindalik molasi onerisi",
                            "Kisa bir nefes pratigiyle zihinsel daginikligi topla.",
                            "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.NUMEROLOGY_CHECKIN, List.of(
                    t("numerology_checkin", "tr", 0, MODULE_NUMEROLOGY,
                            "Numeroloji check-in zamani",
                            "Bugunun sayi temasini acip odagini netlestir.",
                            "/numerology?entry_point=push_numerology_checkin"),
                    t("numerology_checkin", "tr", 1, MODULE_NUMEROLOGY,
                            "Numeroloji akisin bugun guclu",
                            "Yillik temani gunluk ritimle hizalamak icin kisa analizi gor.",
                            "/numerology?entry_point=push_numerology_checkin"),
                    t("numerology_checkin", "tr", 2, MODULE_NUMEROLOGY,
                            "Sayi tablon guncellendi",
                            "Kararlarini destekleyecek ana sinyaller seni bekliyor.",
                            "/numerology?entry_point=push_numerology_checkin")
            )),
            Map.entry(NotificationType.AI_ANALYSIS_COMPLETE, List.of(
                    t("ai_analysis_complete", "tr", 0, MODULE_NOTIFICATIONS,
                            "AI analizin tamamlandi",
                            "Raporunda en kritik icgoruleri one cikardik, simdi inceleyebilirsin.",
                            "/(tabs)/notifications"),
                    t("ai_analysis_complete", "tr", 1, MODULE_NOTIFICATIONS,
                            "Yeni analiz sonucu hazir",
                            "Sonuctaki oncelikli aksiyon alanlarini tek ekranda gor.",
                            "/(tabs)/notifications")
            )),
            Map.entry(NotificationType.COMPATIBILITY_UPDATE, List.of(
                    t("compatibility_update", "tr", 0, MODULE_COMPATIBILITY,
                            "Uyumluluk analizin guncellendi",
                            "Denge, iletisim ve guven basliklarinda yeni skorlari ac.",
                            "/(tabs)/compatibility"),
                    t("compatibility_update", "tr", 1, MODULE_COMPATIBILITY,
                            "Iliski dinamiklerinde yeni icgoru var",
                            "Uyum panelinde guclu ve hassas alanlari birlikte incele.",
                            "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.PRODUCT_UPDATE, List.of(
                    t("product_update", "tr", 0, MODULE_NOTIFICATIONS,
                            "Yeni deneyim katmani acildi",
                            "Ana sayfada bugun denemen gereken yeni bir ozellik var.",
                            "/(tabs)/notifications"),
                    t("product_update", "tr", 1, MODULE_NUMEROLOGY,
                            "Numeroloji deneyimi guclendirildi",
                            "Daha hizli ve daha net okuma akisi simdi aktif.",
                            "/numerology?entry_point=push_product_update"),
                    t("product_update", "tr", 2, MODULE_SPIRITUAL,
                            "Manevi pratik akisi guncellendi",
                            "Rutin olusturmayi kolaylastiran yeni deneyimi ac.",
                            "/(tabs)/spiritual"),
                    t("product_update", "tr", 3, MODULE_COMPATIBILITY,
                            "Uyumluluk ekrani yenilendi",
                            "Karsilastirma kartlari artik daha acik ve aksiyon odakli.",
                            "/(tabs)/compatibility"),
                    t("product_update", "tr", 4, MODULE_NOTIFICATIONS,
                            "Bildirim merkezi gelistirildi",
                            "Yeni filtre ve takip deneyimiyle onceliklerini hizli yonet.",
                            "/(tabs)/notifications")
            ))
    );

    private static final Map<NotificationType, List<NotificationTemplate>> TEMPLATES_EN = Map.ofEntries(
            Map.entry(NotificationType.DAILY_SUMMARY, List.of(
                    t("daily_summary", "en", 0, MODULE_DAILY_TRANSITS,
                            "Your daily energy plan is ready",
                            "See your top 3 focus zones and critical timing in one glance.",
                            "/daily-summary?entry_point=push_daily_summary"),
                    t("daily_summary", "en", 1, MODULE_DAILY_TRANSITS,
                            "Today's strategic reading is live",
                            "Get a quick brief for work, relationships, and emotional balance.",
                            "/daily-summary?entry_point=push_daily_summary"),
                    t("daily_summary", "en", 2, MODULE_DAILY_TRANSITS,
                            "Your cosmic briefing is waiting",
                            "Open your short summary and run the day with sharper focus.",
                            "/daily-summary?entry_point=push_daily_summary")
            )),
            Map.entry(NotificationType.ENERGY_UPDATE, List.of(
                    t("energy_update", "en", 0, MODULE_DAILY_TRANSITS,
                            "A new transit window just opened",
                            "This is a strong period for communication and decisions.",
                            "/(tabs)/calendar"),
                    t("energy_update", "en", 1, MODULE_DAILY_TRANSITS,
                            "Your energy rhythm has shifted",
                            "Catch the updated time window to move with less friction.",
                            "/(tabs)/calendar"),
                    t("energy_update", "en", 2, MODULE_DAILY_TRANSITS,
                            "High-focus timing is now active",
                            "Use the calendar window to handle your key priorities.",
                            "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.WEEKLY_SUMMARY, List.of(
                    t("weekly_summary", "en", 0, MODULE_WEEKLY_HOROSCOPE,
                            "Your weekly cosmic report is ready",
                            "Review opportunity zones and pressure points for this week.",
                            "/(tabs)/weekly-analysis"),
                    t("weekly_summary", "en", 1, MODULE_WEEKLY_HOROSCOPE,
                            "Your weekly direction map is live",
                            "Plan ahead using your strongest days and caution windows.",
                            "/(tabs)/weekly-analysis")
            )),
            Map.entry(NotificationType.PRAYER_REMINDER, List.of(
                    t("prayer_reminder", "en", 0, MODULE_PRAYER,
                            "A calm prayer window is open",
                            "Take a short prayer pause to reset your inner balance.",
                            "/(tabs)/spiritual/dua"),
                    t("prayer_reminder", "en", 1, MODULE_PRAYER,
                            "Your daily prayer check-in is waiting",
                            "A 2-minute spiritual pause can stabilize the rest of your day.",
                            "/(tabs)/spiritual/dua")
            )),
            Map.entry(NotificationType.MEDITATION_REMINDER, List.of(
                    t("meditation_reminder", "en", 0, MODULE_MEDITATION,
                            "Great moment for meditation",
                            "Reset mental load in 5 minutes with your guided practice.",
                            "/(tabs)/spiritual/meditation"),
                    t("meditation_reminder", "en", 1, MODULE_MEDITATION,
                            "Time to regain focus",
                            "A short meditation session can make your evening smoother.",
                            "/(tabs)/spiritual/meditation")
            )),
            Map.entry(NotificationType.PLANNER_REMINDER, List.of(
                    t("planner_reminder", "en", 0, MODULE_DAILY_TRANSITS,
                            "Your cosmic planner has new slots",
                            "Updated windows for meetings, deep work, and key decisions are ready.",
                            "/(tabs)/calendar"),
                    t("planner_reminder", "en", 1, MODULE_DAILY_TRANSITS,
                            "Refresh today's timing strategy",
                            "Open your planner and lock in the most productive blocks.",
                            "/(tabs)/calendar"),
                    t("planner_reminder", "en", 2, MODULE_DAILY_TRANSITS,
                            "Planning advantage is active now",
                            "Use your updated cosmic schedule to reduce friction today.",
                            "/(tabs)/calendar")
            )),
            Map.entry(NotificationType.EVENING_CHECKIN, List.of(
                    t("evening_checkin", "en", 0, MODULE_HOME,
                            "Time for your evening check-in",
                            "Capture today's gains and set tomorrow's intention in 60 seconds.",
                            "/daily-summary?entry_point=push_evening_checkin"),
                    t("evening_checkin", "en", 1, MODULE_HOME,
                            "Your day-end reflection is ready",
                            "Log your energy quickly and start tomorrow with more clarity.",
                            "/daily-summary?entry_point=push_evening_checkin")
            )),
            Map.entry(NotificationType.DREAM_REMINDER, List.of(
                    t("dream_reminder", "en", 0, MODULE_DREAM_ANALYSIS,
                            "Perfect time to log your dream",
                            "Capture details while memory is fresh for better interpretation.",
                            "/(tabs)/dreams"),
                    t("dream_reminder", "en", 1, MODULE_DREAM_ANALYSIS,
                            "Your dream journal is waiting",
                            "Even one short note can reveal a useful inner signal.",
                            "/(tabs)/dreams"),
                    t("dream_reminder", "en", 2, MODULE_DREAM_ANALYSIS,
                            "Catch the night's message now",
                            "Save your dream early to increase analysis depth.",
                            "/(tabs)/dreams")
            )),
            Map.entry(NotificationType.RE_ENGAGEMENT, List.of(
                    t("re_engagement", "en", 0, MODULE_DAILY_TRANSITS,
                            "Your personal daily brief is waiting",
                            "Home now has a fresh summary and quick actions for today.",
                            "/daily-summary?entry_point=push_reengagement"),
                    t("re_engagement", "en", 1, MODULE_DAILY_TRANSITS,
                            "A fresh transit opportunity window appeared",
                            "Open your calendar to catch today's high-efficiency timing.",
                            "/(tabs)/calendar"),
                    t("re_engagement", "en", 2, MODULE_WEEKLY_HOROSCOPE,
                            "Your weekly direction report was updated",
                            "Review priorities before the week gets noisy.",
                            "/(tabs)/weekly-analysis"),
                    t("re_engagement", "en", 3, MODULE_DREAM_ANALYSIS,
                            "You have a new dream insight opportunity",
                            "Log your latest dream and unlock a clearer interpretation.",
                            "/(tabs)/dreams"),
                    t("re_engagement", "en", 4, MODULE_SPIRITUAL,
                            "Good moment to restart your spiritual rhythm",
                            "A short practice can quickly rebuild your daily balance.",
                            "/(tabs)/spiritual"),
                    t("re_engagement", "en", 5, MODULE_NUMEROLOGY,
                            "Your numerology flow has new signals",
                            "Open today's number guidance and realign your focus.",
                            "/numerology?entry_point=push_reengagement"),
                    t("re_engagement", "en", 6, MODULE_COMPATIBILITY,
                            "New perspective available in compatibility",
                            "Review relationship dynamics with updated insights.",
                            "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.MINI_INSIGHT, List.of(
                    t("mini_insight", "en", 0, MODULE_DAILY_TRANSITS,
                            "A mini strategy for your day is ready",
                            "One small adjustment can improve your momentum today.",
                            "/daily-summary?entry_point=push_mini_insight"),
                    t("mini_insight", "en", 1, MODULE_DAILY_TRANSITS,
                            "Quick timing edge for today",
                            "Use the calendar's best window to complete key work faster.",
                            "/(tabs)/calendar"),
                    t("mini_insight", "en", 2, MODULE_NUMEROLOGY,
                            "Your number signal is clear today",
                            "Check the numerology card for a fast direction cue.",
                            "/numerology?entry_point=push_mini_insight"),
                    t("mini_insight", "en", 3, MODULE_SPIRITUAL,
                            "Mini mindfulness reset suggestion",
                            "Take a short breathing pause and reset your focus.",
                            "/(tabs)/spiritual")
            )),
            Map.entry(NotificationType.NUMEROLOGY_CHECKIN, List.of(
                    t("numerology_checkin", "en", 0, MODULE_NUMEROLOGY,
                            "Time for your numerology check-in",
                            "Open today's number theme and align your focus.",
                            "/numerology?entry_point=push_numerology_checkin"),
                    t("numerology_checkin", "en", 1, MODULE_NUMEROLOGY,
                            "Your numerology flow is strong today",
                            "Match your yearly theme with today's rhythm in one tap.",
                            "/numerology?entry_point=push_numerology_checkin"),
                    t("numerology_checkin", "en", 2, MODULE_NUMEROLOGY,
                            "Your number dashboard was refreshed",
                            "Key signals for today's decisions are ready to review.",
                            "/numerology?entry_point=push_numerology_checkin")
            )),
            Map.entry(NotificationType.AI_ANALYSIS_COMPLETE, List.of(
                    t("ai_analysis_complete", "en", 0, MODULE_NOTIFICATIONS,
                            "Your AI analysis is complete",
                            "Top insights are highlighted and ready for review.",
                            "/(tabs)/notifications"),
                    t("ai_analysis_complete", "en", 1, MODULE_NOTIFICATIONS,
                            "New analysis result is ready",
                            "See the most actionable findings in one focused view.",
                            "/(tabs)/notifications")
            )),
            Map.entry(NotificationType.COMPATIBILITY_UPDATE, List.of(
                    t("compatibility_update", "en", 0, MODULE_COMPATIBILITY,
                            "Your compatibility analysis was updated",
                            "Open new scores for harmony, communication, and trust.",
                            "/(tabs)/compatibility"),
                    t("compatibility_update", "en", 1, MODULE_COMPATIBILITY,
                            "New insight in relationship dynamics",
                            "Review strong and sensitive areas with clearer guidance.",
                            "/(tabs)/compatibility")
            )),
            Map.entry(NotificationType.PRODUCT_UPDATE, List.of(
                    t("product_update", "en", 0, MODULE_NOTIFICATIONS,
                            "A new product experience is live",
                            "Home has a new feature worth trying today.",
                            "/(tabs)/notifications"),
                    t("product_update", "en", 1, MODULE_NUMEROLOGY,
                            "Numerology experience was upgraded",
                            "You now get faster, clearer readings with less friction.",
                            "/numerology?entry_point=push_product_update"),
                    t("product_update", "en", 2, MODULE_SPIRITUAL,
                            "Spiritual practice flow improved",
                            "Open the module to explore a smoother routine setup.",
                            "/(tabs)/spiritual"),
                    t("product_update", "en", 3, MODULE_COMPATIBILITY,
                            "Compatibility screen has been improved",
                            "Compare dynamics with clearer cards and stronger context.",
                            "/(tabs)/compatibility"),
                    t("product_update", "en", 4, MODULE_NOTIFICATIONS,
                            "Notification center was upgraded",
                            "New filtering and tracking flow is now active.",
                            "/(tabs)/notifications")
            ))
    );

    /**
     * Select a template variant deterministically based on userId + date,
     * so the same user never gets the same variant two days in a row,
     * while keeping selection stable within a day.
     */
    public NotificationTemplate getTemplate(NotificationType type, String locale, Long userId) {
        Map<NotificationType, List<NotificationTemplate>> templates =
                isEnglishLocale(locale) ? TEMPLATES_EN : TEMPLATES_TR;
        List<NotificationTemplate> list = templates.getOrDefault(type, List.of());
        if (list.isEmpty()) {
            String resolvedLocale = isEnglishLocale(locale) ? "en" : "tr";
            list = TEMPLATES_TR.getOrDefault(type, List.of(
                    t(type.name().toLowerCase(Locale.ROOT), resolvedLocale, 0, MODULE_NOTIFICATIONS,
                            "Bildirim", "Sana ozel yeni bir guncelleme var.", "/(tabs)/notifications")
            ));
        }
        // Deterministic: (userId + dayOfYear) mod variantCount
        int dayOfYear = LocalDate.now().getDayOfYear();
        long safeUserId = userId == null ? 0L : userId;
        int index = Math.floorMod(safeUserId + dayOfYear, list.size());
        return list.get(index);
    }

    /** Backward-compatible overload without userId (uses index 0) */
    public NotificationTemplate getTemplate(NotificationType type, String locale) {
        return getTemplate(type, locale, 0L);
    }

    private static NotificationTemplate t(
            String templateKey,
            String locale,
            int variantIndex,
            String moduleKey,
            String title,
            String body,
            String deeplink
    ) {
        return new NotificationTemplate(templateKey, locale, variantIndex, moduleKey, title, body, deeplink);
    }

    private static boolean isEnglishLocale(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en");
    }

    public record NotificationTemplate(
            String templateKey,
            String locale,
            int variantIndex,
            String moduleKey,
            String title,
            String body,
            String deeplink
    ) {
        public String variantKey() {
            return "v" + variantIndex;
        }
    }
}
