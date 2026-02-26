package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences", indexes = {
        @Index(name = "idx_user_preferences_reminder_enabled", columnList = "reminder_enabled")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "content_language", nullable = false, length = 8)
    private String contentLanguage;

    @Column(name = "font_scale", nullable = false, precision = 3, scale = 2)
    private BigDecimal fontScale;

    @Column(name = "reading_mode_enabled", nullable = false)
    private Boolean readingModeEnabled;

    @Column(name = "keep_screen_awake", nullable = false)
    private Boolean keepScreenAwake;

    @Column(name = "tts_enabled", nullable = false)
    private Boolean ttsEnabled;

    @Column(name = "tts_default_lang", length = 8)
    private String ttsDefaultLang;

    @Column(name = "tts_voice_id", length = 120)
    private String ttsVoiceId;

    @Column(name = "prayer_counter_haptic", nullable = false)
    private Boolean prayerCounterHaptic;

    @Column(name = "reminder_enabled", nullable = false)
    private Boolean reminderEnabled;

    @Column(name = "reminder_schedule_json", columnDefinition = "jsonb")
    private String reminderScheduleJson;

    @Column(name = "short_prayers_enabled", nullable = false)
    private Boolean shortPrayersEnabled;

    @Column(name = "privacy_export_enabled", nullable = false)
    private Boolean privacyExportEnabled;

    @Column(name = "ab_overrides_json", columnDefinition = "jsonb")
    private String abOverridesJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (contentLanguage == null) contentLanguage = "tr";
        if (fontScale == null) fontScale = new BigDecimal("1.00");
        if (readingModeEnabled == null) readingModeEnabled = false;
        if (keepScreenAwake == null) keepScreenAwake = false;
        if (ttsEnabled == null) ttsEnabled = false;
        if (prayerCounterHaptic == null) prayerCounterHaptic = true;
        if (reminderEnabled == null) reminderEnabled = false;
        if (shortPrayersEnabled == null) shortPrayersEnabled = true;
        if (privacyExportEnabled == null) privacyExportEnabled = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

