package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.IngestLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IngestLogRepository extends JpaRepository<IngestLog, Long> {

    Optional<IngestLog> findByIngestTypeAndLocale(IngestLog.IngestType ingestType, String locale);
}
