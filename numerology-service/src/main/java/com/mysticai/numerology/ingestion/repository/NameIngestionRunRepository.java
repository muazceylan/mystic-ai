package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameIngestionRun;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NameIngestionRunRepository extends JpaRepository<NameIngestionRun, Long> {

    Page<NameIngestionRun> findAllByOrderByStartedAtDesc(Pageable pageable);

    Page<NameIngestionRun> findBySourceNameOrderByStartedAtDesc(SourceName sourceName, Pageable pageable);

    List<NameIngestionRun> findTop20BySourceNameOrderByStartedAtDesc(SourceName sourceName);

    Optional<NameIngestionRun> findTop1BySourceNameOrderByStartedAtDesc(SourceName sourceName);

    Optional<NameIngestionRun> findTop1BySourceNameAndStatusInOrderByStartedAtDesc(
            SourceName sourceName,
            Collection<IngestionRunStatus> statuses
    );

    Optional<NameIngestionRun> findTop1BySourceNameAndStatusOrderByStartedAtDesc(
            SourceName sourceName,
            IngestionRunStatus status
    );
}
