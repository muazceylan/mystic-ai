package com.mysticai.notification.config;

import com.mysticai.notification.admin.service.NotificationDefinitionService;
import com.mysticai.notification.admin.service.NotificationTriggerService;
import com.mysticai.notification.entity.NotificationDefinition;
import com.mysticai.notification.entity.NotificationTrigger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Registers all static backend notification definitions and trigger schedules
 * into the database on application startup.
 *
 * This makes them visible in the admin panel's Notification Catalog and Trigger Registry.
 * Uses upsert semantics so runtime state (isActive, lastRunAt, etc.) is preserved across restarts.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TriggerRegistrar {

    private final NotificationDefinitionService definitionService;
    private final NotificationTriggerService triggerService;

    @EventListener(ApplicationReadyEvent.class)
    public void registerAll() {
        log.info("[TriggerRegistrar] Registering static notification definitions and triggers...");
        registerDefinitions();
        registerTriggers();
        log.info("[TriggerRegistrar] Registration complete.");
    }

    // ── Notification Definitions (Catalog) ──────────────────────────────────

    private void registerDefinitions() {
        List<NotificationDefinition> defs = List.of(

            NotificationDefinition.builder()
                .definitionKey("daily_summary")
                .displayName("Günlük Özet")
                .description("Her gün sabah 08:30'da tüm aktif kullanıcılara gönderilen günlük özet bildirimi.")
                .category("DAILY")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("home")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateDailyNotifications")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("numerology_checkin")
                .displayName("Numeroloji Check-in")
                .description("Her gün 12:15'te numeroloji ekranına kısa geri dönüş çağrısı yapan bildirim.")
                .category("DAILY")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("numerology")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("numerology")
                .codeReference("NotificationScheduler#generateNumerologyCheckins")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("dream_reminder")
                .displayName("Rüya Hatırlatıcı")
                .description("Her sabah 08:00'da kullanıcıları rüya günlüğü yazmaya davet eden hatırlatıcı.")
                .category("REMINDER")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("dreams")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("dreams")
                .codeReference("NotificationScheduler#generateDreamReminders")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("prayer_reminder")
                .displayName("Dua / Namaz Hatırlatıcı")
                .description("Her sabah 06:00'da dua ve manevi uygulama hatırlatıcısı.")
                .category("REMINDER")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("spiritual")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("spiritual")
                .codeReference("NotificationScheduler#generatePrayerReminders")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("planner_reminder")
                .displayName("Kozmik Planlayıcı Hatırlatıcı")
                .description("Her sabah 07:30'da günlük kozmik planlayıcıyı kontrol etmeye davet eder.")
                .category("REMINDER")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("planner")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("planner")
                .codeReference("NotificationScheduler#generatePlannerReminders")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("meditation_reminder")
                .displayName("Meditasyon Hatırlatıcı")
                .description("Her akşam 20:00'da meditasyon seansına davet eder.")
                .category("REMINDER")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("meditation")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("wellness")
                .codeReference("NotificationScheduler#generateMeditationReminders")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("evening_checkin")
                .displayName("Akşam Girişi")
                .description("Her gece 21:00'da günlük akşam check-in bildirimi.")
                .category("DAILY")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("home")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateEveningCheckins")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("weekly_summary")
                .displayName("Haftalık Özet")
                .description("Her Pazartesi sabah 09:00'da haftalık özet ve burç yorumu bildirimi.")
                .category("WEEKLY")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.WEEKLY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("home")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateWeeklySummary")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("re_engagement")
                .displayName("Tekrar Katılım")
                .description("Salı ve Cuma günleri 10:00'da pasif kullanıcıları uygulamaya geri çeken bildirim.")
                .category("BEHAVIORAL")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.SCHEDULED)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .defaultRouteKey("home")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateReEngagement")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("ai_analysis_complete")
                .displayName("AI Analiz Tamamlandı")
                .description("AI orkestratör bir analizi tamamladığında tetiklenen olay tabanlı bildirim.")
                .category("AI")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.EVENT_DRIVEN)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.SYSTEM_EVENT)
                .defaultRouteKey("oracle")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(true)
                .ownerModule("ai_orchestrator")
                .codeReference("AiResponseListener#handleAiResponse")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("compatibility_update")
                .displayName("Uyumluluk Analizi Güncelleme")
                .description("Sinastri/uyumluluk analizi tamamlandığında tetiklenen bildirim.")
                .category("AI")
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .cadenceType(NotificationDefinition.CadenceType.EVENT_DRIVEN)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.SYSTEM_EVENT)
                .defaultRouteKey("compatibility")
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(true)
                .ownerModule("synastry")
                .codeReference("AiResponseListener#handleAiResponse")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("admin_manual_push")
                .displayName("Admin Manuel Bildirim")
                .description("Admin panelden elle oluşturulan ve anında veya zamanlanmış olarak gönderilen bildirim.")
                .category("SYSTEM")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.MANUAL)
                .sourceType(NotificationDefinition.SourceType.ADMIN_PANEL)
                .triggerType(NotificationDefinition.TriggerType.MANUAL)
                .isActive(true).isEditable(true).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("admin")
                .codeReference("AdminNotificationService")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("admin_scheduled_push")
                .displayName("Admin Zamanlanmış Bildirim")
                .description("Admin panelden zamanlanmış olarak gönderilen bildirim (60 saniyede bir kontrol edilir).")
                .category("SYSTEM")
                .channelType(NotificationDefinition.ChannelType.PUSH)
                .cadenceType(NotificationDefinition.CadenceType.SCHEDULED)
                .sourceType(NotificationDefinition.SourceType.ADMIN_PANEL)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .isActive(true).isEditable(true).isVisibleInAdmin(true).isSystemCritical(false)
                .ownerModule("admin")
                .codeReference("ScheduledNotificationDispatchService#processDueNotifications")
                .build(),

            NotificationDefinition.builder()
                .definitionKey("horoscope_ingest")
                .displayName("Burç Veri İngesti (Sistem)")
                .description("Astroloji servisinden günlük/haftalık burç verilerini CMS'e çeken sistem işi.")
                .category("SYSTEM")
                .channelType(NotificationDefinition.ChannelType.IN_APP)
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .isActive(true).isEditable(false).isVisibleInAdmin(true).isSystemCritical(true)
                .ownerModule("cms")
                .codeReference("HoroscopeIngestScheduler")
                .build()
        );

        for (NotificationDefinition def : defs) {
            try {
                definitionService.upsert(def);
            } catch (Exception e) {
                log.warn("[TriggerRegistrar] Failed to upsert definition {}: {}", def.getDefinitionKey(), e.getMessage());
            }
        }
        log.info("[TriggerRegistrar] {} notification definitions registered.", defs.size());
    }

    // ── Notification Triggers (Scheduler Registry) ───────────────────────────

    private void registerTriggers() {
        List<NotificationTrigger> triggers = List.of(

            NotificationTrigger.builder()
                .triggerKey("daily_notification_generation")
                .definitionKey("daily_summary")
                .displayName("Günlük Bildirim Üretimi")
                .description("Her gün 08:30'da tüm aktif kullanıcılar için günlük özet bildirimi üretir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 30 8 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateDailyNotifications")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("numerology_checkin_job")
                .definitionKey("numerology_checkin")
                .displayName("Numeroloji Check-in İşi")
                .description("Her gün 12:15'te numeroloji check-in bildirimlerini gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 15 12 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("numerology")
                .codeReference("NotificationScheduler#generateNumerologyCheckins")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("dream_reminder_job")
                .definitionKey("dream_reminder")
                .displayName("Rüya Hatırlatıcı İşi")
                .description("Her sabah 08:00'da rüya hatırlatıcılarını gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 8 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("dreams")
                .codeReference("NotificationScheduler#generateDreamReminders")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("prayer_reminder_job")
                .definitionKey("prayer_reminder")
                .displayName("Dua Hatırlatıcı İşi")
                .description("Her sabah 06:00'da dua hatırlatıcılarını gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 6 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("spiritual")
                .codeReference("NotificationScheduler#generatePrayerReminders")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("planner_reminder_job")
                .definitionKey("planner_reminder")
                .displayName("Planlayıcı Hatırlatıcı İşi")
                .description("Her sabah 07:30'da kozmik planlayıcı hatırlatıcılarını gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 30 7 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("planner")
                .codeReference("NotificationScheduler#generatePlannerReminders")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("meditation_reminder_job")
                .definitionKey("meditation_reminder")
                .displayName("Meditasyon Hatırlatıcı İşi")
                .description("Her akşam 20:00'da meditasyon hatırlatıcılarını gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 20 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("wellness")
                .codeReference("NotificationScheduler#generateMeditationReminders")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("evening_checkin_job")
                .definitionKey("evening_checkin")
                .displayName("Akşam Girişi İşi")
                .description("Her gece 21:00'da akşam check-in bildirimlerini gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 21 * * *")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateEveningCheckins")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("weekly_summary_job")
                .definitionKey("weekly_summary")
                .displayName("Haftalık Özet İşi")
                .description("Her Pazartesi 09:00'da haftalık özet bildirimlerini gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.WEEKLY)
                .cronExpression("0 0 9 * * MON")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateWeeklySummary")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("re_engagement_job")
                .definitionKey("re_engagement")
                .displayName("Tekrar Katılım İşi")
                .description("Salı ve Cuma 10:00'da pasif kullanıcılara re-engagement bildirimi gönderir.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 10 * * TUE,FRI")
                .isActive(true).isPausable(true).isSystemCritical(false)
                .ownerModule("notifications")
                .codeReference("NotificationScheduler#generateReEngagement")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("cleanup_expired_notifications")
                .displayName("Süresi Dolan Bildirimleri Temizle")
                .description("Her gece 03:00'da süresi dolmuş bildirimleri veritabanından siler. Kritik bakım işi.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 3 * * *")
                .isActive(true).isPausable(false).isSystemCritical(true)
                .ownerModule("maintenance")
                .codeReference("NotificationScheduler#cleanupExpiredNotifications")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("cleanup_inactive_tokens")
                .displayName("Pasif Push Token Temizleme")
                .description("Her Pazar 04:00'da 30 günden eski pasif push token'larını siler.")
                .cadenceType(NotificationTrigger.CadenceType.WEEKLY)
                .cronExpression("0 0 4 * * SUN")
                .isActive(true).isPausable(false).isSystemCritical(true)
                .ownerModule("maintenance")
                .codeReference("NotificationScheduler#cleanupInactiveTokens")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("horoscope_ingest_daily")
                .definitionKey("horoscope_ingest")
                .displayName("Günlük Burç İngesti")
                .description("Her gece 00:00'da 12 burç için günlük burç verilerini astroloji servisinden çeker.")
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .cronExpression("0 0 0 * * *")
                .isActive(true).isPausable(false).isSystemCritical(true)
                .ownerModule("cms")
                .codeReference("HoroscopeIngestScheduler#scheduleDaily")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("horoscope_ingest_weekly")
                .definitionKey("horoscope_ingest")
                .displayName("Haftalık Burç İngesti")
                .description("Her Pazartesi 00:00'da 12 burç için haftalık burç verilerini astroloji servisinden çeker.")
                .cadenceType(NotificationTrigger.CadenceType.WEEKLY)
                .cronExpression("0 0 0 * * MON")
                .isActive(true).isPausable(false).isSystemCritical(true)
                .ownerModule("cms")
                .codeReference("HoroscopeIngestScheduler#scheduleWeekly")
                .build(),

            NotificationTrigger.builder()
                .triggerKey("admin_scheduled_dispatch")
                .definitionKey("admin_scheduled_push")
                .displayName("Admin Zamanlanmış Bildirim Gönderimi")
                .description("Her 60 saniyede bir zamanı gelen admin bildirimlerini gönderir.")
                .sourceType(NotificationTrigger.SourceType.ADMIN_SCHEDULED)
                .cadenceType(NotificationTrigger.CadenceType.HOURLY)
                .fixedDelayMs(60_000L)
                .isActive(true).isPausable(false).isSystemCritical(true)
                .ownerModule("admin")
                .codeReference("ScheduledNotificationJob#run")
                .build()
        );

        for (NotificationTrigger trigger : triggers) {
            try {
                triggerService.upsert(trigger);
            } catch (Exception e) {
                log.warn("[TriggerRegistrar] Failed to upsert trigger {}: {}", trigger.getTriggerKey(), e.getMessage());
            }
        }
        log.info("[TriggerRegistrar] {} notification triggers registered.", triggers.size());
    }
}
