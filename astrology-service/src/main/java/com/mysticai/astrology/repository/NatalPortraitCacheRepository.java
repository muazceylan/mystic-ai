package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.NatalPortraitCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NatalPortraitCacheRepository extends JpaRepository<NatalPortraitCache, Long> {

    Optional<NatalPortraitCache> findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
            String userId, String chartSignature, String interpretationVersion, String locale);

    List<NatalPortraitCache> findByUserId(String userId);

    void deleteByUserIdAndChartSignature(String userId, String chartSignature);
}
