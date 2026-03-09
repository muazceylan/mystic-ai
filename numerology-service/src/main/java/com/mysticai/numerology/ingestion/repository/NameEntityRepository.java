package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.model.NameStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NameEntityRepository extends JpaRepository<NameEntity, Long>, JpaSpecificationExecutor<NameEntity> {

    Optional<NameEntity> findByNormalizedName(String normalizedName);

    List<NameEntity> findByStatus(NameStatus status);

    Page<NameEntity> findByStatusIn(Collection<NameStatus> statuses, Pageable pageable);

    Page<NameEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
