package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.StarMateFeedCandidateResponse;
import com.mysticai.astrology.dto.StarMateFeedResponse;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.*;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.StarMateLikeRepository;
import com.mysticai.astrology.repository.StarMateProfileRepository;
import com.mysticai.astrology.repository.StarMateScoreCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscoveryService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;
    private static final int CANDIDATE_POOL_MULTIPLIER = 8;
    private static final int MIN_CANDIDATE_POOL_SIZE = 200;

    private final StarMateProfileRepository profileRepository;
    private final StarMateLikeRepository likeRepository;
    private final StarMateScoreCacheRepository scoreCacheRepository;
    private final StarMateProfileService profileService;
    private final SynastryQueueService synastryQueueService;
    private final NatalChartRepository natalChartRepository;
    private final StarMateSupport support;

    @Transactional(readOnly = true)
    public StarMateFeedResponse getFeed(Long userId, Integer requestedLimit) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        int limit = clampLimit(requestedLimit);
        StarMateProfile viewer = profileService.findByUserIdOrThrow(userId);
        if (!viewer.isActive()) {
            return new StarMateFeedResponse(List.of(), "EMPTY", 0, 0);
        }

        StarMatePreference preference = profileService.getOrCreatePreference(userId);
        if (viewer.getBirthDate() == null) {
            throw new IllegalArgumentException("StarMate profile birthDate is required for discovery");
        }

        LocalDate oldestBirthDate = support.oldestBirthDateForAge(preference.getMaxAge());
        LocalDate youngestBirthDate = support.youngestBirthDateForAge(preference.getMinAge());

        int poolSize = Math.max(MIN_CANDIDATE_POOL_SIZE, limit * CANDIDATE_POOL_MULTIPLIER);
        List<StarMateProfile> pool = profileRepository.findDiscoveryCandidatePool(
                userId,
                oldestBirthDate,
                youngestBirthDate,
                PageRequest.of(0, poolSize)
        );

        Set<Long> swipedUserIds = new HashSet<>(likeRepository.findSwipedUserIdsByLikerId(userId));
        int viewerAge = support.age(viewer.getBirthDate());

        List<CandidateWithDistance> filteredCandidates = pool.stream()
                .filter(candidate -> !swipedUserIds.contains(candidate.getUserId()))
                .filter(candidate -> support.matchesViewerPreference(preference.getShowMe(), candidate.getGender()))
                .filter(candidate -> support.candidateAcceptsViewer(candidate.getInterestedIn(), viewer.getGender()))
                .filter(candidate -> viewerAge == 0 || ageCompatibleForCandidate(candidate, viewerAge))
                .map(candidate -> toCandidateWithDistance(viewer, preference, candidate))
                .filter(Objects::nonNull)
                .toList();

        if (filteredCandidates.isEmpty()) {
            return new StarMateFeedResponse(List.of(), "EMPTY", 0, 0);
        }

        List<Long> candidateUserIds = filteredCandidates.stream().map(c -> c.profile().getUserId()).toList();
        Map<Long, StarMateScoreCache> scoreByCandidateUserId = scoreCacheRepository
                .findAllByViewerUserIdAndCandidateUserIdInAndRelationshipType(userId, candidateUserIds, SynastryQueueService.LOVE_RELATIONSHIP)
                .stream()
                .collect(Collectors.toMap(StarMateScoreCache::getCandidateUserId, Function.identity(), (a, b) -> a));

        List<Long> missingScores = filteredCandidates.stream()
                .map(c -> c.profile().getUserId())
                .filter(candidateId -> {
                    StarMateScoreCache cache = scoreByCandidateUserId.get(candidateId);
                    return cache == null || cache.getStatus() != StarMateScoreCacheStatus.COMPLETED || cache.getCompatibilityScore() == null;
                })
                .distinct()
                .toList();

        if (!missingScores.isEmpty()) {
            synastryQueueService.warmMissingScoresForViewer(userId, missingScores);
        }

        List<CandidateRanked> ranked = filteredCandidates.stream()
                .map(candidate -> {
                    StarMateScoreCache cache = scoreByCandidateUserId.get(candidate.profile().getUserId());
                    if (cache == null || cache.getStatus() != StarMateScoreCacheStatus.COMPLETED || cache.getCompatibilityScore() == null) {
                        return null;
                    }
                    if (cache.getCompatibilityScore() < preference.getMinCompatibilityScore()) {
                        return null;
                    }
                    return new CandidateRanked(candidate.profile(), candidate.distanceKm(), cache);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing((CandidateRanked r) -> r.scoreCache().getCompatibilityScore(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(CandidateRanked::distanceKm, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(r -> Optional.ofNullable(r.scoreCache().getCalculatedAt()).orElse(LocalDate.MIN.atStartOfDay()), Comparator.reverseOrder()))
                .limit(limit)
                .toList();

        Map<Long, NatalChart> latestCharts = loadLatestCharts(ranked.stream().map(r -> r.profile().getUserId()).toList());

        List<StarMateFeedCandidateResponse> items = ranked.stream()
                .map(rankedCandidate -> toFeedCandidate(rankedCandidate, latestCharts.get(rankedCandidate.profile().getUserId())))
                .toList();

        String queueStatus = items.isEmpty()
                ? (!missingScores.isEmpty() ? "WARMING" : "EMPTY")
                : (!missingScores.isEmpty() ? "WARMING" : "READY");

        return new StarMateFeedResponse(items, queueStatus, items.size(), missingScores.size());
    }

    private int clampLimit(Integer requestedLimit) {
        if (requestedLimit == null) return DEFAULT_LIMIT;
        return Math.max(1, Math.min(MAX_LIMIT, requestedLimit));
    }

    private boolean ageCompatibleForCandidate(StarMateProfile candidate, int viewerAge) {
        Integer min = candidate.getMinCompatibilityAge();
        Integer max = candidate.getMaxCompatibilityAge();
        if (min == null || max == null) return true;
        return viewerAge >= min && viewerAge <= max;
    }

    private CandidateWithDistance toCandidateWithDistance(StarMateProfile viewer, StarMatePreference preference, StarMateProfile candidate) {
        Double viewerLat = viewer.getLatitude();
        Double viewerLon = viewer.getLongitude();
        Double candidateLat = candidate.getLatitude();
        Double candidateLon = candidate.getLongitude();

        if (viewerLat == null || viewerLon == null || candidateLat == null || candidateLon == null) {
            if (preference.isStrictDistance()) return null;
            return new CandidateWithDistance(candidate, null);
        }

        double distanceKm = support.haversineKm(viewerLat, viewerLon, candidateLat, candidateLon);
        if (preference.isStrictDistance() && distanceKm > preference.getMaxDistanceKm()) {
            return null;
        }
        return new CandidateWithDistance(candidate, distanceKm);
    }

    private Map<Long, NatalChart> loadLatestCharts(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Map.of();
        List<String> asStrings = userIds.stream().filter(Objects::nonNull).map(String::valueOf).distinct().toList();
        if (asStrings.isEmpty()) return Map.of();

        return natalChartRepository.findLatestForUserIds(asStrings).stream()
                .collect(Collectors.toMap(
                        c -> Long.valueOf(c.getUserId()),
                        Function.identity(),
                        (a, b) -> a
                ));
    }

    private StarMateFeedCandidateResponse toFeedCandidate(CandidateRanked ranked, NatalChart chart) {
        StarMateProfile profile = ranked.profile();
        StarMateScoreCache cache = ranked.scoreCache();

        String displayName = chart != null ? support.safeName(chart.getName()) : "Mistik Aday";
        String sunSign = chart != null ? chart.getSunSign() : null;
        String moonSign = chart != null ? chart.getMoonSign() : null;
        String risingSign = chart != null ? chart.getRisingSign() : null;

        return new StarMateFeedCandidateResponse(
                profile.getUserId(),
                profile.getId(),
                displayName,
                support.age(profile.getBirthDate()),
                profile.getGender() != null ? profile.getGender().name() : null,
                sunSign,
                moonSign,
                risingSign,
                profile.getLocationLabel(),
                ranked.distanceKm(),
                cache.getCompatibilityScore(),
                cache.getCompatibilitySummary(),
                support.parsePhotos(profile.getPhotosJson())
        );
    }

    private record CandidateWithDistance(StarMateProfile profile, Double distanceKm) {}

    private record CandidateRanked(StarMateProfile profile, Double distanceKm, StarMateScoreCache scoreCache) {}
}
