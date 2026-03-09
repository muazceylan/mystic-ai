package com.mysticai.notification.entity.cms;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tracks the last successful ingest run per type and locale.
 * Used by the scheduler to decide whether to run ingest.
 */
@Entity
@Table(name = "ingest_log",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_ingest_log_type_locale",
                columnNames = {"ingest_type", "locale"}
        ))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngestLog {

    public enum IngestType {
        DAILY_HOROSCOPE, WEEKLY_HOROSCOPE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "ingest_type", nullable = false, length = 30)
    private IngestType ingestType;

    @Column(nullable = false, length = 10)
    private String locale;

    @Column(nullable = false)
    private LocalDate lastIngestDate;

    @Column(nullable = false)
    private LocalDateTime lastIngestAt;

    private int successCount;
    private int failureCount;
}
