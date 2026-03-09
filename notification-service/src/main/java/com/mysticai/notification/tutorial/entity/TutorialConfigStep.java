package com.mysticai.notification.tutorial.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "tutorial_config_steps",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_tutorial_steps_step_id", columnNames = {"tutorial_config_id", "step_id"}),
                @UniqueConstraint(name = "uk_tutorial_steps_order", columnNames = {"tutorial_config_id", "order_index"})
        },
        indexes = {
                @Index(name = "idx_tutorial_steps_target", columnList = "target_key")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "tutorialConfig")
@EqualsAndHashCode(of = "id")
public class TutorialConfigStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tutorial_config_id", nullable = false)
    private TutorialConfig tutorialConfig;

    @Column(name = "step_id", nullable = false, length = 120)
    private String stepId;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String body;

    @Column(name = "target_key", nullable = false, length = 160)
    private String targetKey;

    @Column(name = "icon_key", length = 120)
    private String iconKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "presentation_type", length = 40)
    private TutorialPresentationType presentationType;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
