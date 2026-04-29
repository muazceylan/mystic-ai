package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "notification_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreference {

    public static final FrequencyLevel DEFAULT_FREQUENCY_LEVEL = FrequencyLevel.BALANCED;
    public static final TimeSlot DEFAULT_PREFERRED_TIME_SLOT = TimeSlot.MORNING;
    public static final LocalTime DEFAULT_QUIET_HOURS_START = LocalTime.of(22, 30);
    public static final LocalTime DEFAULT_QUIET_HOURS_END = LocalTime.of(8, 0);
    public static final String DEFAULT_TIMEZONE = "Europe/Istanbul";

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "daily_enabled")
    @Builder.Default
    private boolean dailyEnabled = true;

    @Column(name = "intraday_enabled")
    @Builder.Default
    private boolean intradayEnabled = false;

    @Column(name = "weekly_enabled")
    @Builder.Default
    private boolean weeklyEnabled = true;

    @Column(name = "planner_reminder_enabled")
    @Builder.Default
    private boolean plannerReminderEnabled = false;

    @Column(name = "prayer_reminder_enabled")
    @Builder.Default
    private boolean prayerReminderEnabled = false;

    @Column(name = "meditation_reminder_enabled")
    @Builder.Default
    private boolean meditationReminderEnabled = false;

    @Column(name = "dream_reminder_enabled")
    @Builder.Default
    private boolean dreamReminderEnabled = false;

    @Column(name = "evening_checkin_enabled")
    @Builder.Default
    private boolean eveningCheckinEnabled = false;

    @Column(name = "product_updates_enabled")
    @Builder.Default
    private boolean productUpdatesEnabled = true;

    @Column(name = "frequency_level")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FrequencyLevel frequencyLevel = DEFAULT_FREQUENCY_LEVEL;

    @Column(name = "preferred_time_slot")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TimeSlot preferredTimeSlot = DEFAULT_PREFERRED_TIME_SLOT;

    @Column(name = "quiet_hours_start")
    @Builder.Default
    private LocalTime quietHoursStart = DEFAULT_QUIET_HOURS_START;

    @Column(name = "quiet_hours_end")
    @Builder.Default
    private LocalTime quietHoursEnd = DEFAULT_QUIET_HOURS_END;

    @Column(name = "push_enabled")
    @Builder.Default
    private boolean pushEnabled = true;

    @Column(name = "timezone")
    @Builder.Default
    private String timezone = DEFAULT_TIMEZONE;

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public enum FrequencyLevel {
        LOW,
        BALANCED,
        FREQUENT
    }

    public enum TimeSlot {
        MORNING,
        NOON,
        EVENING
    }

    public boolean applyDefaults() {
        boolean changed = false;

        if (frequencyLevel == null) {
            frequencyLevel = DEFAULT_FREQUENCY_LEVEL;
            changed = true;
        }
        if (preferredTimeSlot == null) {
            preferredTimeSlot = DEFAULT_PREFERRED_TIME_SLOT;
            changed = true;
        }
        if (quietHoursStart == null) {
            quietHoursStart = DEFAULT_QUIET_HOURS_START;
            changed = true;
        }
        if (quietHoursEnd == null) {
            quietHoursEnd = DEFAULT_QUIET_HOURS_END;
            changed = true;
        }
        if (timezone == null || timezone.isBlank()) {
            timezone = DEFAULT_TIMEZONE;
            changed = true;
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
            changed = true;
        }

        return changed;
    }

    @PrePersist
    protected void onCreate() {
        applyDefaults();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        applyDefaults();
        this.updatedAt = LocalDateTime.now();
    }
}
