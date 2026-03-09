package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameIngestionJobLock;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NameIngestionJobLockRepository extends JpaRepository<NameIngestionJobLock, Long> {

    Optional<NameIngestionJobLock> findBySourceName(SourceName sourceName);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from NameIngestionJobLock l where l.sourceName = :sourceName")
    Optional<NameIngestionJobLock> findBySourceNameForUpdate(@Param("sourceName") SourceName sourceName);

    List<NameIngestionJobLock> findAllByOrderByUpdatedAtDesc();

    List<NameIngestionJobLock> findByStatusOrderByHeartbeatAtDesc(IngestionJobLockStatus status);
}
