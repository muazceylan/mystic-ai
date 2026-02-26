package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prayer_set_items", indexes = {
        @Index(name = "idx_prayer_set_items_prayer", columnList = "prayer_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrayerSetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prayer_set_id", nullable = false)
    private Long prayerSetId;

    @Column(name = "prayer_id", nullable = false)
    private Long prayerId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "target_repeat_count")
    private Integer targetRepeatCount;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory;

    @Column(name = "reason_code", length = 64)
    private String reasonCode;

    @PrePersist
    void onCreate() {
        if (isMandatory == null) isMandatory = false;
    }
}

