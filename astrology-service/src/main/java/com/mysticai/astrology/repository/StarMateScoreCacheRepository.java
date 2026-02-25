package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.StarMateScoreCache;
import com.mysticai.astrology.entity.StarMateScoreCacheStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StarMateScoreCacheRepository extends JpaRepository<StarMateScoreCache, Long> {

    Optional<StarMateScoreCache> findByViewerUserIdAndCandidateUserIdAndRelationshipType(
            Long viewerUserId,
            Long candidateUserId,
            String relationshipType
    );

    List<StarMateScoreCache> findAllByViewerUserIdAndCandidateUserIdInAndRelationshipType(
            Long viewerUserId,
            Collection<Long> candidateUserIds,
            String relationshipType
    );

    List<StarMateScoreCache> findAllByViewerUserIdAndStatus(Long viewerUserId, StarMateScoreCacheStatus status);
}
