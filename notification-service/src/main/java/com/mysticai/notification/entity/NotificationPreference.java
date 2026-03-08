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
    private boolean productUpdatesEnabled = false;

    @Column(name = "frequency_level")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FrequencyLevel frequencyLevel = FrequencyLevel.BALANCED;

    @Column(name = "preferred_time_slot")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TimeSlot preferredTimeSlot = TimeSlot.MORNING;

    @Column(name = "quiet_hours_start")
    @Builder.Default
    private LocalTime quietHoursStart = LocalTime.of(22, 30);

    @Column(name = "quiet_hours_end")
    @Builder.Default
    private LocalTime quietHoursEnd = LocalTime.of(8, 0);

    @Column(name = "push_enabled")
    @Builder.Default
    private boolean pushEnabled = true;

    @Column(name = "timezone")
    @Builder.Default
    private String timezone = "Europe/Istanbul";

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

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
