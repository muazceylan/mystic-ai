package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.StarMateActionRequest;
import com.mysticai.astrology.dto.StarMateActionResponse;
import com.mysticai.astrology.entity.*;
import com.mysticai.astrology.event.StarMateMatchEvent;
import com.mysticai.astrology.repository.StarMateLikeRepository;
import com.mysticai.astrology.repository.StarMateMatchRepository;
import com.mysticai.astrology.repository.StarMateProfileRepository;
import com.mysticai.astrology.repository.StarMateScoreCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class StarMateActionService {

    private final StarMateLikeRepository likeRepository;
    private final StarMateMatchRepository matchRepository;
    private final StarMateProfileRepository profileRepository;
    private final StarMateScoreCacheRepository scoreCacheRepository;
    private final StarMateSupport support;
    private final SynastryQueueService synastryQueueService;
    private final SynastryService synastryService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public StarMateActionResponse processAction(StarMateActionRequest request) {
        if (Objects.equals(request.userId(), request.targetUserId())) {
            throw new IllegalArgumentException("You cannot swipe yourself");
        }

        profileRepository.findByUserId(request.userId())
                .orElseThrow(() -> new IllegalArgumentException("StarMate profile not found for userId=" + request.userId()));
        profileRepository.findByUserId(request.targetUserId())
                .orElseThrow(() -> new IllegalArgumentException("StarMate profile not found for targetUserId=" + request.targetUserId()));

        StarMateLikeType actionType = support.parseActionType(request.actionType());

        StarMateLike like = likeRepository.findByLikerIdAndLikedId(request.userId(), request.targetUserId())
                .orElseGet(() -> StarMateLike.builder()
                        .likerId(request.userId())
                        .likedId(request.targetUserId())
                        .build());
        like.setType(actionType);
        likeRepository.save(like);

        boolean mutual = false;
        Long matchId = null;
        Integer compatibilityScore = null;
        boolean notificationTriggered = false;

        if (actionType == StarMateLikeType.LIKE || actionType == StarMateLikeType.SUPERLIKE) {
            StarMateLike opposite = likeRepository.findByLikerIdAndLikedId(request.targetUserId(), request.userId()).orElse(null);
            if (opposite != null && (opposite.getType() == StarMateLikeType.LIKE || opposite.getType() == StarMateLikeType.SUPERLIKE)) {
                mutual = true;

                OrderedPair pair = OrderedPair.of(request.userId(), request.targetUserId());
                StarMateMatch match = matchRepository.findByUserAIdAndUserBId(pair.userA(), pair.userB()).orElse(null);
                boolean isNewMatch = false;

                if (match == null) {
                    ScoreSnapshot snapshot = resolveScoreSnapshot(request.userId(), request.targetUserId());
                    compatibilityScore = snapshot.score();
                    match = StarMateMatch.builder()
                            .userAId(pair.userA())
                            .userBId(pair.userB())
                            .compatibilityScore(snapshot.score())
                            .compatibilitySummary(snapshot.summary())
                            .isBlocked(false)
                            .build();
                    match = matchRepository.save(match);
                    isNewMatch = true;
                } else {
                    compatibilityScore = match.getCompatibilityScore();
                }

                matchId = match.getId();
                if (isNewMatch) {
                    notificationTriggered = true;
                    eventPublisher.publishEvent(new StarMateMatchEvent(
                            match.getId(),
                            match.getUserAId(),
                            match.getUserBId(),
                            match.getCompatibilityScore(),
                            match.getCompatibilitySummary(),
                            LocalDateTime.now()
                    ));
                    log.info("StarMate match created: matchId={}, users=({}, {}) score={}",
                            match.getId(), match.getUserAId(), match.getUserBId(), match.getCompatibilityScore());
                }
            }
        }

        return new StarMateActionResponse(
                true,
                actionType.name(),
                request.targetUserId(),
                mutual,
                matchId,
                compatibilityScore,
                notificationTriggered,
                LocalDateTime.now()
        );
    }

    private ScoreSnapshot resolveScoreSnapshot(Long viewerUserId, Long candidateUserId) {
        StarMateScoreCache cache = scoreCacheRepository
                .findByViewerUserIdAndCandidateUserIdAndRelationshipType(viewerUserId, candidateUserId, SynastryQueueService.LOVE_RELATIONSHIP)
                .orElse(null);

        if (cache != null && cache.getStatus() == StarMateScoreCacheStatus.COMPLETED && cache.getCompatibilityScore() != null) {
            return new ScoreSnapshot(cache.getCompatibilityScore(), cache.getCompatibilitySummary());
        }

        try {
            synastryQueueService.computeAndStore(viewerUserId, candidateUserId);
            StarMateScoreCache refreshed = scoreCacheRepository
                    .findByViewerUserIdAndCandidateUserIdAndRelationshipType(viewerUserId, candidateUserId, SynastryQueueService.LOVE_RELATIONSHIP)
                    .orElse(null);
            if (refreshed != null && refreshed.getCompatibilityScore() != null) {
                return new ScoreSnapshot(refreshed.getCompatibilityScore(), refreshed.getCompatibilitySummary());
            }
        } catch (Exception ignored) {
            // Fallback to direct compute below.
        }

        try {
            SynastryService.QuickSynastryScore quick = synastryService.computeQuickUserToUserLoveScore(viewerUserId, candidateUserId);
            return new ScoreSnapshot(quick.harmonyScore(), quick.summary());
        } catch (Exception e) {
            log.warn("Falling back to default StarMate match score for users ({}, {}): {}",
                    viewerUserId, candidateUserId, e.getMessage());
            return new ScoreSnapshot(50, "Varsayılan skor (synastry cache henüz hazır değil)");
        }
    }

    private record OrderedPair(Long userA, Long userB) {
        static OrderedPair of(Long left, Long right) {
            return left < right ? new OrderedPair(left, right) : new OrderedPair(right, left);
        }
    }

    private record ScoreSnapshot(Integer score, String summary) {}
}
