package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameAdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NameAdminAuditLogRepository extends JpaRepository<NameAdminAuditLog, Long> {
}
