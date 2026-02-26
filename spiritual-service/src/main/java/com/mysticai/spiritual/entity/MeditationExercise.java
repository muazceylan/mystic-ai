package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "meditation_exercises", indexes = {
        @Index(name = "idx_meditation_exercises_type_active", columnList = "type, active"),
        @Index(name = "idx_meditation_exercises_focus", columnList = "focus_theme")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeditationExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 24)
    private String type;

    @Column(name = "focus_theme", nullable = false, length = 64)
    private String focusTheme;

    @Column(name = "duration_sec", nullable = false)
    private Integer durationSec;

    @Column(name = "steps_json", columnDefinition = "TEXT", nullable = false)
    private String stepsJson;

    @Column(name = "breathing_pattern_json", columnDefinition = "TEXT")
    private String breathingPatternJson;

    @Column(name = "animation_mode", length = 32)
    private String animationMode;

    @Column(name = "background_audio_enabled_by_default", nullable = false)
    private Boolean backgroundAudioEnabledByDefault;

    @Column(name = "disclaimer_text", columnDefinition = "TEXT")
    private String disclaimerText;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (active == null) active = true;
        if (backgroundAudioEnabledByDefault == null) backgroundAudioEnabledByDefault = false;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

