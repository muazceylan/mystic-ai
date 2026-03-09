package com.mysticai.numerology.ingestion.repository;

import com.mysticai.numerology.ingestion.entity.NameSourceControl;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NameSourceControlRepository extends JpaRepository<NameSourceControl, SourceName> {
}
