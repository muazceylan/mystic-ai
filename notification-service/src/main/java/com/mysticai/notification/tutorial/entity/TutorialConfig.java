package com.mysticai.notification.tutorial.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "tutorial_configs",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_tutorial_configs_tutorial_id", columnNames = {"tutorial_id"})
        },
        indexes = {
                @Index(name = "idx_tutorial_configs_screen", columnList = "screen_key"),
                @Index(name = "idx_tutorial_configs_status", columnList = "status"),
                @Index(name = "idx_tutorial_configs_active", columnList = "is_active")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "steps")
@EqualsAndHashCode(of = "id")
public class TutorialConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tutorial_id", nullable = false, length = 120, unique = true)
    private String tutorialId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "screen_key", nullable = false, length = 120)
    private String screenKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TutorialPlatform platform = TutorialPlatform.MOBILE;

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TutorialConfigStatus status = TutorialConfigStatus.DRAFT;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private int priority = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "presentation_type", nullable = false, length = 40)
    @Builder.Default
    private TutorialPresentationType presentationType = TutorialPresentationType.SPOTLIGHT_CARD;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @Column(length = 1000)
    private String description;

    @Column(name = "audience_rules", columnDefinition = "TEXT")
    private String audienceRules;

    @Column(name = "min_app_version", length = 40)
    private String minAppVersion;

    @Column(name = "max_app_version", length = 40)
    private String maxAppVersion;

    @Column(length = 12)
    private String locale;

    @Column(name = "experiment_key", length = 120)
    private String experimentKey;

    @Column(name = "rollout_percentage")
    private Integer rolloutPercentage;

    @Column(length = 120)
    private String createdBy;

    @Column(length = 120)
    private String updatedBy;

    private LocalDateTime publishedAt;

    @OneToMany(mappedBy = "tutorialConfig", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<TutorialConfigStep> steps = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public void replaceSteps(List<TutorialConfigStep> nextSteps) {
        this.steps.clear();
        if (nextSteps == null) {
            return;
        }

        for (TutorialConfigStep step : nextSteps) {
            addStep(step);
        }
    }

    public void addStep(TutorialConfigStep step) {
        if (step == null) {
            return;
        }

        step.setTutorialConfig(this);
        this.steps.add(step);
    }
}
