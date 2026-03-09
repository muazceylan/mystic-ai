package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findTop10ByOrderByCreatedAtDesc();
}
