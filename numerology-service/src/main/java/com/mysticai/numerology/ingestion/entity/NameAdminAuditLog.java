package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.NameAdminAuditActionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "name_admin_audit_logs", indexes = {
        @Index(name = "idx_name_admin_audit_name_id", columnList = "name_id"),
        @Index(name = "idx_name_admin_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameAdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_id", nullable = false)
    private Long nameId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 32)
    private NameAdminAuditActionType actionType;

    @Column(name = "actor_email", length = 255)
    private String actorEmail;

    @Column(name = "old_value_json", columnDefinition = "TEXT")
    private String oldValueJson;

    @Column(name = "new_value_json", columnDefinition = "TEXT")
    private String newValueJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
