package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.SavedPerson;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SavedPersonRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchTraitsService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(15);
    private static final String CALCULATION_VERSION = "compare-v3.1.0";
    private static final double SCORE_CENTER = 60.0d;
    private static final double SCORE_MIN = 22.0d;
    private static final double SCORE_MAX = 93.0d;
    private static final double CONFIDENCE_HIGH_THRESHOLD = 0.75d;
    private static final double CONFIDENCE_MEDIUM_THRESHOLD = 0.55d;
    private static final double BIRTH_TIME_LIMITED_THRESHOLD = 0.72d;
    private static final double HOUSE_PRECISION_LIMITED_THRESHOLD = 0.50d;
    private static final double CLUSTERED_STDDEV_THRESHOLD = 4.60d;

    private final SynastryRepository synastryRepository;
    private final NatalChartRepository natalChartRepository;
    private final SavedPersonRepository savedPersonRepository;
    private final ObjectMapper objectMapper;
    private final TraitScoringEngine traitScoringEngine;
    private final LlmNotesService llmNotesService;

    private final ConcurrentHashMap<String, CachedEntry> cache = new ConcurrentHashMap<>();

    public MatchTraitsResponse getTraitsForMatch(Long matchId, String requestedModule) {
        if (matchId == null) {
            throw new IllegalArgumentException("matchId is required");
        }

        evictExpiredCacheEntries();

        Synastry synastry = synastryRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));

        CompareModule module = CompareModule.resolve(requestedModule, synastry.getRelationshipType());
        String cacheKey = matchId + ":" + module.name() + ":" + CALCULATION_VERSION;

        PartyData personA = loadPartyData(synastry, true);
        PartyData personB = loadPartyData(synastry, false);

        int fingerprint = Objects.hash(
                synastry.getCrossAspectsJson(),
                synastry.getHarmonyScore(),
                synastry.getStatus(),
                synastry.getRelationshipType(),
                module.name(),
                CALCULATION_VERSION,
                personA.fingerprintPart(),
                personB.fingerprintPart()
        );

        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired() && cached.fingerprint() == fingerprint) {
            return cached.response();
        }

        List<CrossAspect> aspects = parseCrossAspects(synastry.getCrossAspectsJson());

        MatchTraitsResponse response;
        try {
            LegacyPayload legacyPayload = buildLegacyPayload(matchId, synastry, aspects);
            V3Payload v3Payload = buildV3Payload(matchId, module, aspects, personA, personB, synastry.getHarmonyScore());

            response = new MatchTraitsResponse(
                    matchId,
                    synastry.getHarmonyScore(),
                    legacyPayload.categories(),
                    legacyPayload.cardAxes(),
                    legacyPayload.cardSummary(),
                    module.name(),
                    v3Payload.overall(),
                    v3Payload.summary(),
                    v3Payload.metricCards(),
                    v3Payload.topDrivers(),
                    v3Payload.themeSections(),
                    v3Payload.explainability()
            );
        } catch (Exception e) {
            log.error("Match traits v3 generation failed, returning fallback payload. matchId={}, module={}", matchId, module, e);
            response = fallbackResponse(matchId, synastry, module);
        }

        cache.put(cacheKey, new CachedEntry(response, fingerprint, System.currentTimeMillis() + CACHE_TTL.toMillis()));
        return response;
    }

    private LegacyPayload buildLegacyPayload(Long matchId, Synastry synastry, List<CrossAspect> aspects) {
        try {
            List<CategoryGroup> categories = traitScoringEngine.scoreCategories(aspects, synastry.getHarmonyScore());
            List<TraitAxis> allAxes = categories.stream().flatMap(g -> g.items().stream()).toList();

            Map<String, String> notesByAxisId = Map.of();
            String cardSummary = null;
            try {
                LlmNotesService.NotesResult notesResult = llmNotesService.generateNotes(allAxes, synastry.getHarmonyScore());
                if (notesResult != null) {
                    notesByAxisId = notesResult.notesByAxisId() != null ? notesResult.notesByAxisId() : Map.of();
                    cardSummary = notesResult.cardSummary();
                }
            } catch (Exception llmError) {
                log.warn("Match traits LLM notes failed, continuing with rule-based categories. matchId={}", matchId, llmError);
            }

            List<CategoryGroup> categoriesWithNotes = traitScoringEngine.applyNotes(categories, notesByAxisId);
            List<TraitAxis> cardAxes = traitScoringEngine.selectCardAxes(categoriesWithNotes, 8);
            List<TraitAxis> cardAxesWithNotes = traitScoringEngine.applyNotesToAxes(cardAxes, notesByAxisId);

            if (cardSummary == null || cardSummary.isBlank()) {
                cardSummary = buildFallbackSummary(synastry, cardAxesWithNotes);
            }

            return new LegacyPayload(categoriesWithNotes, cardAxesWithNotes, cardSummary);
        } catch (Exception e) {
            log.warn("Legacy trait payload failed, fallback to empty payload. matchId={}", matchId, e);
            return new LegacyPayload(List.of(), List.of(), buildFallbackSummary(synastry, List.of()));
        }
    }

    private V3Payload buildV3Payload(
            Long matchId,
            CompareModule module,
            List<CrossAspect> aspects,
            PartyData personA,
            PartyData personB,
            Integer persistedScore
    ) {
        ModuleProfile profile = ModuleProfile.forModule(module);
        ConfidenceComputation confidence = computeConfidence(personA, personB, aspects);

        List<MetricComputation> rawMetrics = profile.metricProfiles().stream()
                .map(metric -> computeMetric(metric, profile, aspects, personA, personB, confidence.confidence()))
                .toList();

        List<MetricComputation> separatedMetrics = enforceMetricSeparation(rawMetrics, 4);
        List<MetricComputation> metricComputations = calibrateMetricDistribution(
                separatedMetrics,
                profile,
                confidence
        );

        int rawModuleScore = composeOverallRawScore(metricComputations, profile);
        int moduleMappedScore = mapRawToModuleBand(rawModuleScore, profile.moduleBias(), profile.module());
        int seeded = blendPersistedScore(moduleMappedScore, persistedScore, profile.module());
        int rebalancedSeed = applyOverallCalibration(seeded, metricComputations, profile, confidence);
        int finalScore = applyConfidenceDamping(rebalancedSeed, confidence.confidence(), profile.spreadBase());
        int percentile = scoreToPercentile(finalScore);
        String levelLabel = mapLevelLabel(finalScore);

        String distributionWarning = resolveDistributionWarning(separatedMetrics, metricComputations, confidence);
        String missingBirthTimeImpact = resolveMissingBirthTimeImpact(confidence);

        List<MatchTraitsResponse.MetricCard> metricCards = metricComputations.stream()
                .map(metric -> new MatchTraitsResponse.MetricCard(
                        metric.id(),
                        metric.title(),
                        metric.score(),
                        metric.status(),
                        metric.insight()
                ))
                .toList();

        MatchTraitsResponse.TopDrivers topDrivers = buildTopDrivers(metricComputations, profile);
        List<MatchTraitsResponse.ThemeSection> themeSections = buildThemeSections(metricComputations, profile);

        int narrativeSeed = Objects.hash(matchId, module.name(), finalScore,
                metricComputations.stream().map(MetricComputation::id).collect(Collectors.joining("|")));

        MatchTraitsResponse.Summary summary = buildSummary(profile, metricComputations, finalScore, confidence, narrativeSeed);

        MatchTraitsResponse.Overall overall = new MatchTraitsResponse.Overall(
                finalScore,
                levelLabel,
                round2(confidence.confidence()),
                confidence.confidenceLabel(),
                percentile
        );

        MatchTraitsResponse.Explainability explainability = new MatchTraitsResponse.Explainability(
                CALCULATION_VERSION,
                List.of(
                        "aspect_type",
                        "planet_pair_weight",
                        "orb_decay",
                        "house_context_weight",
                        "module_weight",
                        "supportive_challenging_split",
                        "confidence_damping"
                ),
                confidence.dataQualityLabel(),
                LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                distributionWarning,
                missingBirthTimeImpact,
                profile.profileId()
        );

        return new V3Payload(overall, summary, metricCards, topDrivers, themeSections, explainability);
    }

    private MetricComputation computeMetric(
            MetricProfile metric,
            ModuleProfile profile,
            List<CrossAspect> aspects,
            PartyData personA,
            PartyData personB,
            double confidence
    ) {
        if (aspects == null || aspects.isEmpty()) {
            int baseline = applyConfidenceDamping(58 + metric.baseOffset(), confidence, profile.spreadBase());
            String status = resolveStatus(baseline, 0.0, 0.0);
            return new MetricComputation(
                    metric.id(),
                    metric.title(),
                    baseline,
                    status,
                    buildMetricInsight(metric, status, baseline)
            );
        }

        double supportive = 0.0d;
        double challenging = 0.0d;

        for (CrossAspect aspect : aspects) {
            double moduleWeight = metric.moduleWeight(aspect);
            if (moduleWeight <= 0.0d) {
                continue;
            }

            double polarity = aspectPolarity(aspect);
            double aspectWeight = aspectWeight(aspect.aspectType(), profile.module());
            double orbDecay = Math.max(0.20d, Math.exp(-profile.orbK() * Math.max(0.0d, aspect.orb())));
            double houseWeight = computeHouseWeight(aspect, metric, personA, personB);
            double planetPairWeight = planetPairWeight(aspect, metric);
            double contextWeight = moduleContextWeight(aspect, metric, profile.module());
            double relevance = moduleWeight * planetPairWeight * houseWeight * contextWeight;
            if (relevance < relevanceFloor(profile.module())) {
                continue;
            }

            double contribution = polarity * aspectWeight * orbDecay * houseWeight * moduleWeight * planetPairWeight * contextWeight;

            if (contribution >= 0) {
                supportive += contribution * supportiveScale(profile.module());
            } else {
                challenging += Math.abs(contribution) * challengingScale(profile.module(), aspect, metric);
            }
        }

        double total = supportive + challenging;
        double delta = supportive - challenging;
        double normalized = Math.tanh(delta / (2.2d + aspects.size() * 0.14d));
        double volatility = Math.tanh(total / (2.8d + aspects.size() * 0.12d));
        double supportiveShare = total <= 0.0d ? 0.5d : supportive / total;
        double challengingShare = total <= 0.0d ? 0.5d : challenging / total;

        double metricRaw = 55.0d
                + normalized * 20.0d
                + metric.baseOffset()
                + (supportiveShare - 0.5d) * 3.2d
                - challengingShare * 6.2d
                - Math.max(0.0d, volatility - 0.42d) * 2.4d;
        int score = applyConfidenceDamping((int) Math.round(metricRaw), confidence, profile.spreadBase());
        String status = resolveStatus(score, normalized, volatility);

        return new MetricComputation(
                metric.id(),
                metric.title(),
                score,
                status,
                buildMetricInsight(metric, status, score)
        );
    }

    private List<MetricComputation> enforceMetricSeparation(List<MetricComputation> metrics, int minDiff) {
        if (metrics == null || metrics.size() < 2 || minDiff <= 0) {
            return metrics == null ? List.of() : metrics;
        }

        List<MetricComputation> sorted = new ArrayList<>(metrics);
        sorted.sort(Comparator.comparingInt(MetricComputation::score));

        for (int i = 1; i < sorted.size(); i++) {
            MetricComputation prev = sorted.get(i - 1);
            MetricComputation current = sorted.get(i);
            int diff = current.score() - prev.score();
            if (diff >= minDiff) {
                continue;
            }
            int adjustedScore = clampScore(current.score() + (minDiff - diff), (int) SCORE_MIN, (int) SCORE_MAX);
            sorted.set(i, current.withScore(adjustedScore));
        }

        Map<String, MetricComputation> byId = sorted.stream()
                .collect(Collectors.toMap(MetricComputation::id, m -> m));

        return metrics.stream()
                .map(metric -> {
                    MetricComputation adjusted = byId.getOrDefault(metric.id(), metric);
                    String status = resolveStatus(adjusted.score(), 0.0d, "intense".equals(adjusted.status()) ? 0.9d : 0.2d);
                    return adjusted.withStatusAndInsight(status, buildMetricInsight(metricFromId(metric.id(), metric.title()), status, adjusted.score()));
                })
                .toList();
    }

    private List<MetricComputation> calibrateMetricDistribution(
            List<MetricComputation> metrics,
            ModuleProfile profile,
            ConfidenceComputation confidence
    ) {
        if (metrics == null || metrics.isEmpty()) {
            return List.of();
        }

        double topHeavyPenalty = computeTopHeavyPenalty(metrics, profile, confidence);
        List<MetricComputation> sorted = metrics.stream()
                .sorted(Comparator.comparingInt(MetricComputation::score).reversed().thenComparing(MetricComputation::id))
                .toList();

        List<MetricComputation> adjusted = new ArrayList<>();
        int highCount = (int) metrics.stream().filter(metric -> metric.score() >= 73).count();
        int veryHighCount = (int) metrics.stream().filter(metric -> metric.score() >= 85).count();
        double currentStddev = computeStdDev(metrics);
        int currentSpread = metrics.stream().mapToInt(MetricComputation::score).max().orElse(60)
                - metrics.stream().mapToInt(MetricComputation::score).min().orElse(60);
        boolean needsWidening = currentStddev < 6.0d || currentSpread < 16;

        for (int index = 0; index < sorted.size(); index++) {
            MetricComputation metric = sorted.get(index);
            double score = compressMetricUpperTail(metric.score(), profile.module());

            if (topHeavyPenalty > 0.0d && score >= 68.0d) {
                double rankFactor = 0.55d + (index * 0.30d);
                score -= topHeavyPenalty * rankFactor;
            }

            if (highCount >= Math.max(3, sorted.size() - 1) && index >= Math.max(1, sorted.size() - 3)) {
                score -= 3.0d + (index - Math.max(1, sorted.size() - 3)) * 1.8d;
            }

            if (veryHighCount >= 2 && score >= 78.0d) {
                score -= (veryHighCount - 1) * 2.1d;
            }

            if (needsWidening) {
                double centerIndex = (sorted.size() - 1) / 2.0d;
                double wideningShift = (centerIndex - index) * 1.15d;
                score += wideningShift;
            }

            int adjustedScore = clampScore((int) Math.round(score), (int) SCORE_MIN, (int) SCORE_MAX);
            adjusted.add(metric.withScore(adjustedScore));
        }

        Map<String, MetricComputation> byId = adjusted.stream()
                .collect(Collectors.toMap(MetricComputation::id, metric -> metric));

        List<MetricComputation> reordered = metrics.stream()
                .map(metric -> byId.getOrDefault(metric.id(), metric))
                .toList();

        return enforceMetricSeparation(reordered, 4);
    }

    private double computeTopHeavyPenalty(
            List<MetricComputation> metrics,
            ModuleProfile profile,
            ConfidenceComputation confidence
    ) {
        if (metrics == null || metrics.isEmpty()) {
            return 0.0d;
        }

        double avg = metrics.stream().mapToInt(MetricComputation::score).average().orElse(SCORE_CENTER);
        double variance = metrics.stream()
                .mapToDouble(metric -> Math.pow(metric.score() - avg, 2))
                .average()
                .orElse(0.0d);
        double stddev = Math.sqrt(variance);

        int highCount = (int) metrics.stream().filter(metric -> metric.score() >= 73).count();
        int veryHighCount = (int) metrics.stream().filter(metric -> metric.score() >= 85).count();
        int minScore = metrics.stream().mapToInt(MetricComputation::score).min().orElse((int) SCORE_CENTER);

        double penalty = 0.0d;
        if (highCount >= 3) {
            penalty += 2.4d + (highCount - 3) * 1.3d;
        }
        if (avg >= 72.0d) {
            penalty += (avg - 71.0d) * 0.48d;
        }
        if (stddev < 6.2d) {
            penalty += (6.2d - stddev) * 0.85d;
        }
        if (veryHighCount >= 2) {
            penalty += 1.8d + (veryHighCount - 2) * 1.4d;
        }
        if (minScore >= 65) {
            penalty += 2.2d;
        }

        if (profile.module() == CompareModule.LOVE || profile.module() == CompareModule.FRIEND) {
            penalty *= 1.25d;
        }
        if (confidence.confidence() < 0.70d) {
            penalty += 1.0d;
        }

        return Math.min(11.0d, penalty);
    }

    private double compressMetricUpperTail(int score, CompareModule module) {
        if (score <= 68) {
            return score;
        }

        double midFactor = switch (module) {
            case LOVE -> 0.56d;
            case FRIEND -> 0.58d;
            case WORK, FAMILY -> 0.62d;
            case RIVAL -> 0.66d;
        };
        double highFactor = switch (module) {
            case LOVE -> 0.36d;
            case FRIEND -> 0.38d;
            case WORK, FAMILY -> 0.44d;
            case RIVAL -> 0.48d;
        };

        if (score <= 82) {
            return 68.0d + (score - 68.0d) * midFactor;
        }

        return 68.0d + 14.0d * midFactor + (score - 82.0d) * highFactor;
    }

    private int composeOverallRawScore(List<MetricComputation> metrics, ModuleProfile profile) {
        if (metrics == null || metrics.isEmpty()) {
            return 60;
        }

        List<Integer> sorted = metrics.stream()
                .map(MetricComputation::score)
                .sorted()
                .toList();

        double avg = sorted.stream().mapToInt(Integer::intValue).average().orElse(60.0d);
        double min = sorted.getFirst();
        double max = sorted.getLast();
        double lowerAvg = sorted.stream()
                .limit(Math.max(2, sorted.size() / 2))
                .mapToInt(Integer::intValue)
                .average()
                .orElse(avg);
        double upperAvg = sorted.stream()
                .skip(Math.max(0, sorted.size() - Math.max(2, sorted.size() / 2)))
                .mapToInt(Integer::intValue)
                .average()
                .orElse(avg);

        double raw = switch (profile.module()) {
            case LOVE -> avg * 0.46d + upperAvg * 0.40d + min * 0.14d;
            case WORK -> avg * 0.40d + lowerAvg * 0.38d + min * 0.22d;
            case FRIEND -> avg * 0.46d + lowerAvg * 0.28d + upperAvg * 0.16d + min * 0.10d;
            case FAMILY -> avg * 0.42d + lowerAvg * 0.34d + min * 0.16d + max * 0.08d;
            case RIVAL -> avg * 0.38d + min * 0.28d + lowerAvg * 0.18d + max * 0.16d;
        };

        return clampScore((int) Math.round(raw), 0, 100);
    }

    private int blendPersistedScore(int moduleMappedScore, Integer persistedScore, CompareModule module) {
        if (persistedScore == null) {
            return moduleMappedScore;
        }

        int persisted = clampScore(persistedScore, 0, 100);
        double anchorWeight = switch (module) {
            case LOVE -> 0.08d;
            case FRIEND, FAMILY -> 0.06d;
            case WORK, RIVAL -> 0.04d;
        };

        if (Math.abs(moduleMappedScore - persisted) >= 14) {
            anchorWeight *= 0.5d;
        }

        return clampScore((int) Math.round(moduleMappedScore * (1.0d - anchorWeight) + persisted * anchorWeight),
                (int) SCORE_MIN,
                (int) SCORE_MAX);
    }

    private int applyOverallCalibration(
            int seededScore,
            List<MetricComputation> metrics,
            ModuleProfile profile,
            ConfidenceComputation confidence
    ) {
        if (metrics == null || metrics.isEmpty()) {
            return seededScore;
        }

        double avg = metrics.stream().mapToInt(MetricComputation::score).average().orElse(seededScore);
        double variance = metrics.stream()
                .mapToDouble(metric -> Math.pow(metric.score() - avg, 2))
                .average()
                .orElse(0.0d);
        double stddev = Math.sqrt(variance);
        int highCount = (int) metrics.stream().filter(metric -> metric.score() >= 73).count();
        int veryHighCount = (int) metrics.stream().filter(metric -> metric.score() >= 85).count();

        double penalty = 0.0d;
        if (seededScore >= 72) {
            penalty += (seededScore - 71) * 0.24d;
        }
        if (highCount >= 3) {
            penalty += 2.2d + (highCount - 3) * 1.0d;
        }
        if (veryHighCount >= 2) {
            penalty += 1.8d + (veryHighCount - 2) * 1.0d;
        }
        if (stddev < 6.0d) {
            penalty += (6.0d - stddev) * 0.65d;
        }
        if ((profile.module() == CompareModule.LOVE || profile.module() == CompareModule.FRIEND) && avg >= 70.0d) {
            penalty += 2.2d + (avg - 70.0d) * 0.25d;
        }
        int minScore = metrics.stream().mapToInt(MetricComputation::score).min().orElse((int) SCORE_CENTER);
        if (minScore >= 63) {
            penalty += 1.8d;
        }
        if (confidence.confidence() < 0.65d && seededScore >= 70) {
            penalty += 1.4d;
        }

        return clampScore((int) Math.round(seededScore - Math.min(9.5d, penalty)), (int) SCORE_MIN, (int) SCORE_MAX);
    }

    private MatchTraitsResponse.TopDrivers buildTopDrivers(List<MetricComputation> metrics, ModuleProfile profile) {
        if (metrics == null || metrics.isEmpty()) {
            MatchTraitsResponse.DriverItem empty = new MatchTraitsResponse.DriverItem(
                    "Veri Hazırlanıyor",
                    0,
                    "Yeterli karşılaştırma sinyali henüz oluşmadı.",
                    "Doğum bilgilerini netleştirip tekrar analiz edin."
            );
            return new MatchTraitsResponse.TopDrivers(List.of(empty), List.of(empty), List.of(empty));
        }

        List<MetricComputation> sortedDesc = metrics.stream()
                .sorted(Comparator.comparingInt(MetricComputation::score).reversed().thenComparing(MetricComputation::id))
                .toList();
        List<MetricComputation> sortedAsc = metrics.stream()
                .sorted(Comparator.comparingInt(MetricComputation::score).thenComparing(MetricComputation::id))
                .toList();

        MetricComputation supportive = sortedDesc.getFirst();
        MetricComputation challenging = sortedAsc.stream()
                .filter(metric -> !metric.id().equals(supportive.id()))
                .findFirst()
                .orElse(sortedAsc.getFirst());

        Set<String> reservedIds = new HashSet<>();
        reservedIds.add(supportive.id());
        reservedIds.add(challenging.id());

        MetricComputation growth = metrics.stream()
                .filter(metric -> !reservedIds.contains(metric.id()))
                .sorted(
                        Comparator.comparingInt((MetricComputation metric) -> Math.abs(metric.score() - 58))
                                .thenComparing(MetricComputation::id)
                )
                .findFirst()
                .orElse(challenging);

        MatchTraitsResponse.DriverItem strength = new MatchTraitsResponse.DriverItem(
                safeText(supportive.title(), "Destekleyici Alan"),
                Math.max(0, supportive.score() - 60),
                safeText(supportive.title(), "Bu alan") + " alanında birlikte daha kolay ritim yakalanıyor.",
                profile.actionHintForMetric(supportive.id())
        );

        MatchTraitsResponse.DriverItem tension = new MatchTraitsResponse.DriverItem(
                safeText(challenging.title(), "Dikkat Alanı"),
                Math.max(0, 60 - challenging.score()),
                safeText(challenging.title(), "Bu başlık") + " başlığında beklenti farkı daha hızlı tetiklenebiliyor.",
                profile.actionHintForMetric(challenging.id())
        );

        MatchTraitsResponse.DriverItem growthItem = new MatchTraitsResponse.DriverItem(
                safeText(growth.title(), "Gelişim Alanı"),
                Math.max(0, Math.abs(growth.score() - 60)),
                safeText(growth.title(), "Bu alan") + " doğru alışkanlıkla en hızlı iyileşebilecek alanlardan biri.",
                profile.actionHintForMetric(growth.id())
        );

        return new MatchTraitsResponse.TopDrivers(
                List.of(strength),
                List.of(tension),
                List.of(growthItem)
        );
    }

    private List<MatchTraitsResponse.ThemeSection> buildThemeSections(List<MetricComputation> metrics, ModuleProfile profile) {
        if (metrics == null || metrics.isEmpty()) {
            return List.of();
        }

        Map<String, MetricComputation> byId = metrics.stream()
                .collect(Collectors.toMap(MetricComputation::id, metric -> metric));

        List<MatchTraitsResponse.ThemeSection> sections = new ArrayList<>();
        for (ThemeBlueprint theme : profile.themes()) {
            List<MetricComputation> themeMetrics = theme.metricIds().stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .toList();
            if (themeMetrics.isEmpty()) {
                continue;
            }

            int themeScore = (int) Math.round(themeMetrics.stream().mapToInt(MetricComputation::score).average().orElse(60.0d));
            String miniInsight = buildThemeMiniInsight(profile, theme.title(), themeMetrics);

            List<MatchTraitsResponse.ThemeSectionCard> cards = themeMetrics.stream()
                    .map(metric -> new MatchTraitsResponse.ThemeSectionCard(
                            safeText(metric.title(), "Tema Kartı"),
                            safeText(metric.insight(), "Bu başlıkta küçük ve düzenli adımlar dengeyi güçlendirebilir."),
                            profile.actionHintForMetric(metric.id())
                    ))
                    .filter(card -> card.title() != null && !card.title().isBlank())
                    .distinct()
                    .toList();

            if (cards.isEmpty()) {
                continue;
            }

            sections.add(new MatchTraitsResponse.ThemeSection(
                    safeText(theme.title(), "Tema"),
                    clampScore(themeScore, (int) SCORE_MIN, (int) SCORE_MAX),
                    miniInsight,
                    cards
            ));
        }

        if (!sections.isEmpty()) {
            return sections;
        }

        MetricComputation fallbackMetric = metrics.getFirst();
        MatchTraitsResponse.ThemeSectionCard fallbackCard = new MatchTraitsResponse.ThemeSectionCard(
                safeText(fallbackMetric.title(), "Genel Denge"),
                safeText(fallbackMetric.insight(), "Bu başlıkta ilişki ritmi dengede ilerliyor."),
                profile.actionHintForMetric(fallbackMetric.id())
        );

        return List.of(
                new MatchTraitsResponse.ThemeSection(
                        "Genel Denge",
                        clampScore(fallbackMetric.score(), (int) SCORE_MIN, (int) SCORE_MAX),
                        "Bu modülde temel ritim korunuyor; küçük ayarlar netlik sağlayabilir.",
                        List.of(fallbackCard)
                )
        );
    }

    private MatchTraitsResponse.Summary buildSummary(
            ModuleProfile profile,
            List<MetricComputation> metrics,
            int finalScore,
            ConfidenceComputation confidence,
            int seed
    ) {
        if (metrics == null || metrics.isEmpty()) {
            String fallbackHeadline = ensureWordRange("Denge korunuyor, netlik artabilir", 4, 8, "Dengeli uyum, netlik gelişebilir");
            String fallbackNarrative = ensureLengthRange(
                    "Bu modülde temel uyum dengeli görünse de yorum güvenini artırmak için daha fazla veri gerekli olabilir. Günlük hayatta beklentileri açık konuşmak ve küçük adımlarla ilerlemek ilişki akışını korumayı kolaylaştırır.",
                    220,
                    360,
                    "Özellikle karar anlarında kısa netleştirme cümleleri kullanmak faydalı olur."
            );
            String fallbackHint = ensureLengthRange(
                    "Küçük ama düzenli iletişim ritmi kurmak bu modülde dengeyi korumaya yardımcı olur.",
                    60,
                    110,
                    "Varsayım yerine kısa netleştirme cümleleri kullanın."
            );
            return new MatchTraitsResponse.Summary(fallbackHeadline, fallbackNarrative, fallbackHint);
        }

        MetricComputation strongest = metrics.stream()
                .max(Comparator.comparingInt(MetricComputation::score))
                .orElse(metrics.getFirst());
        MetricComputation weakest = metrics.stream()
                .min(Comparator.comparingInt(MetricComputation::score))
                .orElse(metrics.getFirst());

        String headline = ensureWordRange(
                buildExpertHeadline(profile, strongest, weakest, confidence, finalScore, seed),
                4,
                8,
                "Denge güçlü, ritim iyi ayarlanmalı"
        );

        String shortNarrative = ensureLengthRange(
                buildExpertNarrative(profile, strongest, weakest, confidence, seed),
                220,
                360,
                "Bu eşleşmede güçlü taraf ile hassas nokta aynı anda çalışıyor; açık ve sakin konuşmalar ritmi korur."
        );

        String dailyHint = ensureLengthRange(
                buildExpertDailyHint(profile, strongest, weakest, confidence, seed),
                60,
                110,
                "Beklentileri yalnız gerilimde değil, sakin bir anda konuşmanız ilişkiyi rahatlatır."
        );

        return new MatchTraitsResponse.Summary(
                headline,
                shortNarrative,
                dailyHint
        );
    }

    private String buildThemeMiniInsight(ModuleProfile profile, String themeTitle, List<MetricComputation> metrics) {
        MetricComputation strongest = metrics.stream().max(Comparator.comparingInt(MetricComputation::score)).orElse(metrics.getFirst());
        MetricComputation weakest = metrics.stream().min(Comparator.comparingInt(MetricComputation::score)).orElse(metrics.getFirst());

        boolean tension = weakest.score() <= 59 || strongest.score() - weakest.score() >= 12;
        return trimRange(buildThemeInsightCopy(profile.module(), themeTitle, strongest, weakest, tension), 130, 210);
    }

    private String buildExpertHeadline(
            ModuleProfile profile,
            MetricComputation strongest,
            MetricComputation weakest,
            ConfidenceComputation confidence,
            int finalScore,
            int seed
    ) {
        if (confidence.confidence() < 0.42d) {
            return "Potansiyel var, net veri beklenmeli";
        }

        String leading = headlineStrengthPhrase(profile.module(), strongest.id(), finalScore);
        String tension = headlineTensionPhrase(profile.module(), weakest.id(), confidence.confidence(), seed);
        return (leading + ", " + tension).trim();
    }

    private String buildExpertNarrative(
            ModuleProfile profile,
            MetricComputation strongest,
            MetricComputation weakest,
            ConfidenceComputation confidence,
            int seed
    ) {
        String cautionPrefix = confidence.confidence() < CONFIDENCE_MEDIUM_THRESHOLD
                ? "Veri netliği tam olmadığı için bu tabloyu biraz daha temkinli okumak gerekir. "
                : "";

        return switch (profile.module()) {
            case LOVE -> cautionPrefix
                    + loveStrengthSentence(strongest.id()) + " "
                    + loveTensionSentence(weakest.id(), seed) + " "
                    + "Sürtünme çıktığında mesele çoğu zaman sevginin eksikliği değil, yakınlığın hangi hızda kurulacağıdır. "
                    + "İkinizin de rahat ettiği ritmi sakin zamanda konuşmanız ilişkiyi daha az yorarak taşır.";
            case WORK -> cautionPrefix
                    + workStrengthSentence(strongest.id()) + " "
                    + workTensionSentence(weakest.id(), seed) + " "
                    + "Aynı hedefe bakıp farklı tempolarda ilerlediğinizde iyi niyet bile yetersizlik gibi okunabilir. "
                    + "Karar, teslim ve rol sınırını görünür tuttuğunuzda iş birliği daha sakin çalışır.";
            case FRIEND -> cautionPrefix
                    + friendStrengthSentence(strongest.id()) + " "
                    + friendTensionSentence(weakest.id(), seed) + " "
                    + "Kırılma çoğu zaman iyi niyet eksikliğinden değil, temas ve öncelik ritminin farklı kurulmasından çıkar. "
                    + "Küçük ama düzenli temas bu arkadaşlığı tahmine değil güvene yaslar.";
            case FAMILY -> cautionPrefix
                    + familyStrengthSentence(strongest.id()) + " "
                    + familyTensionSentence(weakest.id(), seed) + " "
                    + "Biriniz anlaşılmış olmak isterken diğeriniz yükü sessizce taşımayı seçerse kırgınlık görünmeden birikebilir. "
                    + "Duyguyu ve sorumluluğu aynı konuşmada buluşturmanız bağı daha sağlam tutar.";
            case RIVAL -> cautionPrefix
                    + rivalStrengthSentence(strongest.id()) + " "
                    + rivalTensionSentence(weakest.id(), seed) + " "
                    + "Bu eşleşmede farkı yaratan şey yalnız güç değil, gücün ne zaman ve hangi sınırla kullanılacağıdır. "
                    + "Çerçeve baştan netse rekabet daha temiz, daha öğretici ve daha kontrollü ilerler.";
        };
    }

    private String buildExpertDailyHint(
            ModuleProfile profile,
            MetricComputation strongest,
            MetricComputation weakest,
            ConfidenceComputation confidence,
            int seed
    ) {
        String base = switch (profile.module()) {
            case LOVE -> switch (weakest.id()) {
                case "love.trust" -> "Söz, ilgi ve görünür davranış beklentisini aynı konuşmada netleştirmeniz güveni daha hızlı toplar.";
                case "love.proximityBalance" -> "Yakınlık ve alan ihtiyacını kırgınlık yükselmeden konuşmanız geri çekilme hissini azaltır.";
                case "love.romanticFlow" -> "İlgi gösterme biçimini tahmine bırakmayıp açık konuşmanız romantik akışı daha rahat taşır.";
                case "love.emotionalBond" -> "Duyguları yalnız yoğun anlarda değil, sakin zamanda paylaşmanız bağın derinleşmesini kolaylaştırır.";
                default -> "İlgi ve yakınlaşma hızını aynı ritimde tutmak için küçük ama düzenli temas alanı açın.";
            };
            case WORK -> switch (weakest.id()) {
                case "work.decisionSpeed" -> "Kararları tek hamlede kapatmak yerine iki kısa turda netleştirmeniz hız farkını daha iyi dengeler.";
                case "work.conflict" -> "Gerilim yükseldiğinde önce konuyu daraltıp sonra çözüm konuşmanız gereksiz sertliği azaltır.";
                case "work.communication" -> "Toplantı sonunda tek cümlelik karar özeti çıkarmanız yanlış okumaları ciddi biçimde azaltır.";
                default -> "Teslim, sorumluluk ve öncelik sırasını görünür tutmanız iş akışını daha sakin hale getirir.";
            };
            case FRIEND -> switch (weakest.id()) {
                case "friend.boundaryRespect" -> "Yanıt süresi ve kişisel alan beklentisini baştan konuşmanız kırgınlık yerine netlik üretir.";
                case "friend.loyalty" -> "Öncelik ve sadakat beklentisini varsayım yerine açık cümleyle kurmanız ilişkiyi rahatlatır.";
                case "friend.support" -> "Destek ihtiyacını ima etmek yerine doğrudan söylemeniz bu bağı daha güvenli hissettirir.";
                default -> "Sohbet ve buluşma temposunu iki tarafın ritmine göre dengelemeniz arkadaşlığı daha akıcı kılar.";
            };
            case FAMILY -> switch (weakest.id()) {
                case "family.boundary" -> "Yakınlık ve kişisel alan ihtiyacını yalnız gerilimde değil, sakin zamanda konuşmanız evi rahatlatır.";
                case "family.responsibility" -> "Yük paylaşımını görünür hale getirmeniz sessiz kırgınlıkların birikmesini ciddi biçimde azaltır.";
                case "family.sensitivity" -> "Hassas konularda önce duygu sonra ihtiyaç cümlesi kurmanız konuşmayı yumuşatır.";
                default -> "Aidiyet ve sorumluluğu aynı cümlede konuşmanız aile içi dengeyi daha güvenli tutar.";
            };
            case RIVAL -> switch (weakest.id()) {
                case "rival.trigger" -> "Tetiklenme anında kısa bir duraklama koymanız güç savaşını gereksiz sertleşmeden korur.";
                case "rival.fairPlay" -> "Kural ve ihlal sınırını en başta net konuşmanız rekabetin adil kalmasını kolaylaştırır.";
                case "rival.pressure" -> "Baskı anı için kısa bir karar protokolü belirlemeniz hata payını hissedilir biçimde düşürür.";
                default -> "Hamle zamanını ve sınırlarını önceden konuşmanız rekabeti daha temiz ve okunur hale getirir.";
            };
        };

        if (confidence.confidence() < CONFIDENCE_MEDIUM_THRESHOLD && seed % 2 == 0) {
            return base + " Veri netleştikçe bu önerinin tonu daha da keskinleşir.";
        }
        return base;
    }

    private String buildThemeInsightCopy(
            CompareModule module,
            String themeTitle,
            MetricComputation strongest,
            MetricComputation weakest,
            boolean tension
    ) {
        return switch (module) {
            case LOVE -> switch (themeTitle) {
                case "Duygusal Yakınlık" -> tension
                        ? "Bir taraf yakınlığı daha açık ve hızlı kurmak isterken, diğer taraf duyguyu önce içinde toplamayı seçebilir. Bu fark ilk anda soğukluk gibi okunabilir. Teması yoğunlaştırmak yerine düzenli tutmak ilişkiyi daha güvenli taşır."
                        : "Yakınlık kurulduğunda iki taraf da birbirine kolay cevap veriyor. Duygu dili birebir aynı değil ama bağ sıcak kaldığı sürece ilişki sağlam ilerliyor. Küçük jestlerin düzenli olması bu tarafı uzun süre besler.";
                case "Güven ve Romantik Akış" -> tension
                        ? "Romantik taraf kolay açılabilir ama güven aynı hızda yerleşmeyebilir. Biriniz sıcaklıkla rahat ederken diğeriniz davranışta tutarlılık arayabilir. Beklentiyi his üzerinden değil, günlük davranış üzerinden konuşmanız bu farkı yumuşatır."
                        : "İlgi gösterme biçimi ile güven duygusu birbirini taşıyabiliyor. Bu da ilişkiyi sadece heyecanla değil, iç rahatlığıyla besliyor. Küçük sözlerin tutulması bu tarafı daha da sağlamlaştırır.";
                default -> tension
                        ? "Yakınlaşma dozu aynı olmadığında biriniz geri çekilmiş, diğeriniz fazla yüklenmiş gibi görünebilir. Buradaki mesele çoğu zaman ilgisizlik değil, tempo farkıdır. Temas sıklığı için küçük ama net bir ortak kural belirlemek rahatlatır."
                        : "Yakınlık ve alan ihtiyacı birbirini fazla zorlamadan ilerleyebiliyor. İkiniz de nefes alacak yer bulduğunuzda ilişki daha sıcak akıyor. Ritim şaştığında kısa netleştirmeler çoğu zaman yeterli olur.";
            };
            case WORK -> switch (themeTitle) {
                case "Plan ve İcra" -> tension
                        ? "Bir taraf işi erkenden çerçevelemek isterken, diğer taraf ilerledikçe netleşmeye yatkın olabilir. Bu fark konuşulmadığında biriniz yavaşlatılmış, diğeriniz baskı altında kalmış hissedebilir. Adımları görünür bölmek işi toparlar."
                        : "Plan ve uygulama birbirini taşıyabiliyor; biriniz çerçeveyi kurarken diğeriniz işi akıtıyor. Bu sayede verim sadece hızdan değil, düzen duygusundan da besleniyor. Ara kontrol noktaları bu gücü korur.";
                case "İletişim ve Karar" -> tension
                        ? "Biri karar cümlesini erken duymak isterken, diğeri seçenekleri biraz daha dolaşmayı seçebilir. Aynı konuşma birine net, diğerine erken kapanmış gelebilir. Kararı iki aşamada almak bu farkı yumuşatır."
                        : "Konuşma ve karar verme ritmi birbirini çok yormuyor. Bu da küçük problemler çıksa bile aynı hedefte kalmayı kolaylaştırıyor. Kısa yazılı özetler bu avantajı daha görünür hale getirir.";
                default -> tension
                        ? "Gerilim yükseldiğinde biriniz çözümü hemen masaya koymak, diğeriniz önce tonu sakinleştirmek isteyebilir. Zamanlama ayrışınca mesele olduğundan büyük görünür. Konuyu tek başlıkta tutmak daha iyi çalışır."
                        : "Sorun çıktığında tamamen dağılmadan çözüm tarafına dönülebiliyor. Bu, ekip hissini koruyan güçlü bir işaret. Tepki yerine süreç konuşulduğunda ilişki daha verimli kalır.";
            };
            case FRIEND -> switch (themeTitle) {
                case "Sohbet ve Keyif" -> tension
                        ? "Bir taraf sohbeti ve buluşmayı daha sık isterken, diğer taraf akışa bırakmayı tercih edebilir. Bu fark birinize ilgisizlik, diğerinize baskı gibi gelebilir. Temas sıklığını küçük bir ortak ritimle netlemek iyi gelir."
                        : "Sohbet ve birlikte keyif alma tarafı kolay açılıyor. Bu da arkadaşlığı çaba değil rahatlık üzerinden besliyor. Planların fazla ağırlaşmaması bu sıcaklığı korur.";
                case "Destek ve Sadakat" -> tension
                        ? "Destek verme biçimi ve sadakat beklentisi aynı değilse kırgınlık sessizce birikebilir. Biri yanında olunmasını daha görünür isterken, diğeri niyetin zaten bilindiğini düşünebilir. Açık beklenti konuşması bağı rahatlatır."
                        : "Zor zamanlarda birbirine dönme refleksi güçlü görünüyor. Bu, arkadaşlığın yüzeyde kalmadığını gösterir. Küçük ama zamanında destek bu tarafı uzun süre ayakta tutar.";
                default -> tension
                        ? "Yakınlık ve kişisel alan aynı ölçüde istenmediğinde temas ritmi karışabilir. Biri hızlı cevap beklerken diğeri biraz nefes almak isteyebilir. Mesafe ihtiyacını kişisel algılamamak bu bağı korur."
                        : "Sınırlar konuşulmadan da büyük ölçüde anlaşılabiliyor. Bu rahatlık arkadaşlığı hafif tutarken güveni de koruyor. Tempo değiştiğinde kısa netleştirme yeterli olur.";
            };
            case FAMILY -> switch (themeTitle) {
                case "Aidiyet ve Hassasiyet" -> tension
                        ? "Bir taraf duygusal yakınlığı daha görünür hissetmek isterken, diğer taraf hassas konularda içine dönmeyi seçebilir. Bu fark sessiz yanlış anlamalar yaratabilir. Önce duygu sonra ihtiyaç cümlesiyle konuşmak rahatlatır."
                        : "Aidiyet hissi ile duygusal hassasiyet birbirini taşıyabiliyor. Bu, aynı evde ya da aynı bağ içinde daha yumuşak bir atmosfer kurar. Küçük duygusal teyitlerin etkisi büyüktür.";
                case "Sorumluluk ve Sınırlar" -> tension
                        ? "Biri yükü net paylaşmak isterken, diğeri işi kendi içinde toparlamaya daha yatkın olabilir. Bu durumda emek görünmezleşirse kırgınlık hızla büyür. Görev ve alan sınırını açık tutmak iyi gelir."
                        : "Sorumluluk paylaşımı ile sınır koruma arasında makul bir denge kurulabiliyor. Bu da aynı bağ içinde boğulmadan yakın kalmayı kolaylaştırır. Düzenli kısa konuşmalar bu yapıyı korur.";
                default -> tension
                        ? "Kırgınlık sonrası toparlanma hızı aynı olmayabilir; biri hemen konuşmak isterken diğeri zamana ihtiyaç duyabilir. Bu fark iyi okunmazsa mesafe uzar. Onarım konuşmasının zamanını önceden belirlemek işe yarar."
                        : "Krizden sonra yeniden toparlanma kapasitesi bu bağın önemli gücü. Bu sayede sorunlar kalıcı küslüğe dönüşmeden ele alınabiliyor. Doğru zamanlama bu tarafı daha da kuvvetlendirir.";
            };
            case RIVAL -> switch (themeTitle) {
                case "Strateji ve Tempo" -> tension
                        ? "Biri oyunu erken okumak isterken, diğeri doğru anı beklemeyi tercih edebilir. Bu fark baskı altında tempo çatışmasına dönebilir. Hamle zamanını önceden çerçevelemek rekabeti netleştirir."
                        : "Strateji okuma ile tempo taşıma kapasitesi birbirini destekliyor. Bu da rekabeti yalnız sert değil, akıllı hale getiriyor. Hamle planını görünür tutmak avantajı korur.";
                case "Gerilim ve Kontrol" -> tension
                        ? "Gerilim yükseldiğinde biri tepkiyi hemen dışa vurabilir, diğeri kontrolü korumak için içine çekilebilir. Bu ayrışma oyunun psikolojik yükünü artırır. Kısa duraklama kuralı tansiyonu düşürür."
                        : "Baskı ve gerilim aynı anda artsa bile kontrol tamamen kaybolmuyor. Bu, rekabetin çizgiyi aşmadan sürmesine yardım eder. Tepki yerine planı hatırlamak iyi sonuç verir.";
                default -> tension
                        ? "Kuralın nasıl yorumlanacağı aynı görülmediğinde rekabet kolayca kişiselleşebilir. Biri sınırı sert, diğeri esnek okuyabilir. Çerçeveyi baştan net kurmak gereksiz sürtüşmeyi azaltır."
                        : "Adil oyun hissi korunduğunda rekabet daha temiz ve öğretici hale geliyor. Bu da performansı yükseltirken yıpranmayı azaltıyor. Net kurallar oyunun kalitesini belirgin biçimde artırır.";
            };
        };
    }

    private String buildMetricInsightCopy(String metricId, String title, String status, int score) {
        String normalizedId = metricId == null ? "" : metricId;
        String insight;

        if (normalizedId.contains("attraction") || normalizedId.contains("romanticFlow") || normalizedId.contains("funRhythm")) {
            insight = switch (status) {
                case "strong" -> "İlgi hızlı karşılık buluyor ve bu tema ilişkiye canlılık katıyor.";
                case "balanced" -> "İlgi karşılıklı, fakat yakınlaşmanın hangi hızda yaşanacağı hâlâ fark yaratıyor.";
                case "watch" -> "İlgi hissediliyor ama yaklaşma temposu tam aynı çalışmayabilir.";
                case "growth" -> "Çekim tek başına yetmeyebilir; ritim konuşulmadığında mesafe artar.";
                default -> "Çekim yüksek; aynı hızda ilerlemediğinizde kırılganlık da büyüyebilir.";
            };
        } else if (normalizedId.contains("emotionalBond") || normalizedId.endsWith(".bond") || normalizedId.contains(".support")) {
            insight = switch (status) {
                case "strong" -> "Duygusal temas kolay kuruluyor ve ilişki daha çabuk yumuşuyor.";
                case "balanced" -> "Bağ kuruluyor; onu besleyen şey daha çok düzenli temas oluyor.";
                case "watch" -> "Duygular aynı hızda açılmadığında biri anlaşılmamış hissedebilir.";
                case "growth" -> "İçeride tutulan ihtiyaçlar konuşulmadığında mesafe sessizce büyür.";
                default -> "Duygusal bağ güçlü; iniş çıkışlarda yanlış okuma riski de artıyor.";
            };
        } else if (normalizedId.contains("trust") || normalizedId.contains("loyalty") || normalizedId.contains("fairPlay")) {
            insight = switch (status) {
                case "strong" -> "Tutarlılık hissi güçlü; söz ve davranış birbirini iyi taşıyor.";
                case "balanced" -> "Güven var, fakat onu sürdüren şey konuşmaktan çok istikrar.";
                case "watch" -> "Küçük tutarsızlıklar burada basit bir hata değil, güven kaybı gibi okunabilir.";
                case "growth" -> "Beklentiler açık değilse güven sessizce aşınabilir.";
                default -> "Güven ya da kural duygusu çok hassas; küçük kırılmalar hızla büyüyebilir.";
            };
        } else if (normalizedId.contains("proximityBalance") || normalizedId.contains("boundary")) {
            insight = switch (status) {
                case "strong" -> "Yakınlık ve alan ihtiyacı birbirini fazla zorlamadan ilerliyor.";
                case "balanced" -> "Mesafe ayarı genel olarak korunuyor, ama tempo hâlâ önemli.";
                case "watch" -> "Biriniz temas isterken diğeriniz nefes alanı aradığında gerilim çıkabilir.";
                case "growth" -> "Sınır ve yakınlık konuşulmadığında biri yüklenmiş, diğeri sıkışmış hisseder.";
                default -> "Yakınlık isteği de alan ihtiyacı da güçlü; bu yüzden tepki döngüsü hızlanabilir.";
            };
        } else if (normalizedId.contains("communication") || normalizedId.contains("chatFlow")) {
            insight = switch (status) {
                case "strong" -> "Konuşma kolay açılıyor; fikir ve duygu birbirine rahatça ulaşıyor.";
                case "balanced" -> "İletişim akıyor, ancak netlik çoğu zaman son cümlede kazanılıyor.";
                case "watch" -> "Hız farkı arttığında aynı konuşma iki tarafta farklı yankılanabilir.";
                case "growth" -> "Konuşmayı tahmine bıraktığınızda yanlış anlama ihtimali artar.";
                default -> "Söz akışı çok hızlı; ton ayarı kaçarsa sertlik çabuk büyüyebilir.";
            };
        } else if (normalizedId.contains("planFit") || normalizedId.contains("execution") || normalizedId.contains("responsibility")) {
            insight = switch (status) {
                case "strong" -> "İş ve sorumluluk dağılımı netleştiğinde düzen hissi hızla kuruluyor.";
                case "balanced" -> "Plan tarafı fena değil; asıl fark takip disiplininde çıkabiliyor.";
                case "watch" -> "Kimin neyi ne zaman taşıdığı net değilse yük duygusu artabilir.";
                case "growth" -> "Sorumluluk görünmez kaldığında kırgınlık ya da gecikme birikir.";
                default -> "Yüksek tempo altında iş bölümü sertleşirse denge hızla bozulabilir.";
            };
        } else if (normalizedId.contains("decisionSpeed") || normalizedId.endsWith(".tempo")) {
            insight = switch (status) {
                case "strong" -> "Karar ve tempo birbirini taşıyor; biri hızlandığında diğeri tamamen kopmuyor.";
                case "balanced" -> "Ritim yakın, fakat kritik anlarda küçük hız farkı yine masaya gelir.";
                case "watch" -> "Biri hemen ilerlemek isterken diğeri biraz daha düşünmek isteyebilir.";
                case "growth" -> "Tempo farkı konuşulmadığında iki taraf da kendini yanlış yerde hisseder.";
                default -> "Hız yükseldiğinde denge kolay bozuluyor; durup hizalanmak şart oluyor.";
            };
        } else if (normalizedId.contains("conflict") || normalizedId.contains("sensitivity") || normalizedId.contains("trigger") || normalizedId.contains("pressure")) {
            insight = switch (status) {
                case "strong" -> "Gerilim yükselse bile tamamen dağılmadan toparlanma şansı var.";
                case "balanced" -> "Baskı yönetiliyor, ama bunu koruyan şey bilinçli yavaşlama.";
                case "watch" -> "Tepki hızı arttığında mesele olduğundan daha sert yaşanabilir.";
                case "growth" -> "Gerilim anında hız değil düzen seçilmezse aynı döngü tekrarlar.";
                default -> "Tansiyon ve tepki aynı anda büyüdüğünde kırılma çok hızlı gelebilir.";
            };
        } else if (normalizedId.contains("repair")) {
            insight = switch (status) {
                case "strong" -> "Kırgınlık sonrası yeniden konuşabilme kapasitesi bu bağı ayakta tutuyor.";
                case "balanced" -> "Toparlanma var; onu hızlandıran şey doğru zamanlama oluyor.";
                case "watch" -> "Biriniz hemen konuşmak isterken diğeriniz zamana ihtiyaç duyabilir.";
                case "growth" -> "Onarım geciktikçe küçük meseleler kalıcı kırgınlığa dönebilir.";
                default -> "Toparlanma isteği yüksek, fakat zamanlama kaçtığında yeniden sertleşebilir.";
            };
        } else if (normalizedId.contains("strategy")) {
            insight = switch (status) {
                case "strong" -> "Hamleyi okuma becerisi güçlü; rakibin niyeti kolay çözülüyor.";
                case "balanced" -> "Strateji var, fakat onun etkisi zamanlamaya bağlı kalıyor.";
                case "watch" -> "Doğru hamle bilinse bile doğru an her zaman aynı okunmayabilir.";
                case "growth" -> "Plan görünür değilse rekabet kolayca dağınık hissettirebilir.";
                default -> "Strateji kuvvetli ama sertleştiğinde oyun zihinsel olarak çok yorucu olabilir.";
            };
        } else {
            insight = switch (status) {
                case "strong" -> safeText(title, "Bu tema") + " tarafı ilişkiye net bir güç katıyor.";
                case "balanced" -> safeText(title, "Bu tema") + " için ritim korunuyor, ama bilinçli bakım istiyor.";
                case "watch" -> safeText(title, "Bu tema") + " küçük tempo farklarını daha hızlı görünür kılabilir.";
                case "growth" -> safeText(title, "Bu tema") + " tarafında açık konuşma ve düzen ihtiyacı yükseliyor.";
                default -> safeText(title, "Bu tema") + " yoğun çalışıyor; bu yüzden tepki eşiği düşebilir.";
            };
        }

        if (score >= 85 && !insight.contains("nadir")) {
            insight = insight + " Bu yüzden etkisi günlük akışta daha çabuk fark edilir.";
        }
        return insight;
    }

    private String headlineStrengthPhrase(CompareModule module, String metricId, int score) {
        return switch (module) {
            case LOVE -> switch (metricId) {
                case "love.attraction" -> "Güçlü çekim var";
                case "love.emotionalBond" -> "Duygusal bağ güçlü";
                case "love.trust" -> "Güven zemini sağlam";
                case "love.romanticFlow" -> "Romantik akış canlı";
                default -> score >= 80 ? "Yakınlık isteği yüksek" : "Bağ kuruluyor";
            };
            case WORK -> switch (metricId) {
                case "work.planFit" -> "Plan zemini sağlam";
                case "work.communication" -> "İletişim net akıyor";
                case "work.execution" -> "İş takibi güçlü";
                case "work.conflict" -> "Gerilim yönetilebiliyor";
                default -> "Karar ritmi yakın";
            };
            case FRIEND -> switch (metricId) {
                case "friend.chatFlow" -> "Sohbet kolay akıyor";
                case "friend.funRhythm" -> "Keyif ritmi canlı";
                case "friend.support" -> "Destek hissi güçlü";
                case "friend.loyalty" -> "Sadakat zemini iyi";
                default -> "Alan saygısı var";
            };
            case FAMILY -> switch (metricId) {
                case "family.bond" -> "Aidiyet hissi güçlü";
                case "family.sensitivity" -> "Duygu tonu yumuşak";
                case "family.responsibility" -> "Sorumluluk dengeleniyor";
                case "family.boundary" -> "Sınırlar korunabiliyor";
                default -> "Toparlanma kapasitesi yüksek";
            };
            case RIVAL -> switch (metricId) {
                case "rival.strategy" -> "Strateji okuması kuvvetli";
                case "rival.tempo" -> "Tempo direnci yüksek";
                case "rival.trigger" -> "Tepki kontrolü sağlam";
                case "rival.fairPlay" -> "Çerçeve net kalıyor";
                default -> "Baskı iyi taşınıyor";
            };
        };
    }

    private String headlineTensionPhrase(CompareModule module, String metricId, double confidence, int seed) {
        if (confidence < CONFIDENCE_MEDIUM_THRESHOLD && seed % 3 == 0) {
            return "net veriyle daha iyi okunur";
        }

        return switch (module) {
            case LOVE -> switch (metricId) {
                case "love.trust" -> "güven dili aynı değil";
                case "love.romanticFlow" -> "ifade biçimi ayrışıyor";
                case "love.emotionalBond" -> "duygu hızı eşleşmiyor";
                case "love.attraction" -> "çekim tek başına yetmez";
                default -> "tempo farkı yönetilmeli";
            };
            case WORK -> switch (metricId) {
                case "work.planFit" -> "plan değişimi yorabilir";
                case "work.communication" -> "ifade tonu ayrışıyor";
                case "work.execution" -> "takip disiplini kayabiliyor";
                case "work.conflict" -> "gerilim dili yorabilir";
                default -> "karar temposu ayrışıyor";
            };
            case FRIEND -> switch (metricId) {
                case "friend.chatFlow" -> "yanıt temposu ayrışıyor";
                case "friend.funRhythm" -> "keyif beklentisi değişiyor";
                case "friend.support" -> "destek dili aynı değil";
                case "friend.loyalty" -> "sadakat tanımı ayrışıyor";
                default -> "mesafe dozu konuşulmalı";
            };
            case FAMILY -> switch (metricId) {
                case "family.bond" -> "bağlılık beklentisi değişiyor";
                case "family.sensitivity" -> "hassasiyet çabuk yükseliyor";
                case "family.responsibility" -> "yük paylaşımı konuşulmalı";
                case "family.repair" -> "onarım zamanı gecikebiliyor";
                default -> "yakınlık dozu ayrışıyor";
            };
            case RIVAL -> switch (metricId) {
                case "rival.strategy" -> "hamle zamanı şaşabiliyor";
                case "rival.tempo" -> "hız farkı yorabiliyor";
                case "rival.trigger" -> "tepkiler çabuk yükseliyor";
                case "rival.fairPlay" -> "kural yorumu ayrışıyor";
                default -> "baskı hata payını artırıyor";
            };
        };
    }

    private String loveStrengthSentence(String metricId) {
        return switch (metricId) {
            case "love.attraction" -> "Aranızdaki ilgi hızlı karşılık buluyor; bu da ilişkiye ilk andan itibaren canlılık veriyor.";
            case "love.emotionalBond" -> "Duygusal temas kolay kuruluyor; bu yüzden kırgınlık sonrası bile birbirinize dönme şansı yüksek kalıyor.";
            case "love.trust" -> "Tutarlılık görüldüğünde bağ hızlı derinleşiyor ve ilişki daha güvende ilerliyor.";
            case "love.romanticFlow" -> "Romantik ifade birbirini beslediğinde ilişki yalnız sıcak değil, aynı zamanda akıcı da kalıyor.";
            default -> "Birbirinize yaklaşma isteği güçlü; temas kurulduğunda aradaki enerji hemen toparlanıyor.";
        };
    }

    private String loveTensionSentence(String metricId, int seed) {
        return switch (metricId) {
            case "love.trust" -> seed % 2 == 0
                    ? "Daha hassas nokta, güvenin aynı hızda kurulmamasi; biri netlik ararken diğeri duygunun akışına daha çok güvenebilir."
                    : "Asıl pürüz, güveni neyin beslediğinde çıkıyor; biriniz davranışta istikrar ararken diğeriniz sıcaklığı yeterli sayabilir.";
            case "love.romanticFlow" -> "Daha hassas nokta, ilginin nasıl gösterildiği; biri açık jest beklerken diğeri bunu daha dolaylı yaşatabilir.";
            case "love.emotionalBond" -> "Duygular aynı hızda açılmadığında biri daha görünür temas isterken diğeri içinden toparlanmayı seçebilir.";
            case "love.attraction" -> "Çekim olsa bile yaklaşma cesareti aynı anda yükselmediğinde biri istekli, diğeri temkinli görünebilir.";
            default -> "Yakınlık ve alan ihtiyacı aynı anda çalışmadığında biri teması artırmak, diğeri biraz nefes almak isteyebilir.";
        };
    }

    private String workStrengthSentence(String metricId) {
        return switch (metricId) {
            case "work.planFit" -> "İşi çerçeveleme biçiminiz birbirini desteklediğinde düzen hissi hızla kuruluyor.";
            case "work.communication" -> "Konuşma tarafında netlik var; önemli başlıklar fazla dağılmadan toparlanabiliyor.";
            case "work.execution" -> "Görev takibi iyi çalıştığında birlikte üretmek yorucu değil, akıcı hissettiriyor.";
            case "work.conflict" -> "Gerilim çıktığında tamamen dağılmadan çözüm tarafına dönebilme kapasitesi var.";
            default -> "Karar verirken birbirinizi tamamen yavaşlatmadan ilerleyebiliyorsunuz.";
        };
    }

    private String workTensionSentence(String metricId, int seed) {
        return switch (metricId) {
            case "work.planFit" -> "Daha dikkat isteyen yer, planın ne kadar erken netleşeceği; biriniz çerçeveyi başta kurmak isterken diğeriniz hareket ederek netleşebilir.";
            case "work.communication" -> seed % 2 == 0
                    ? "Daha hassas nokta, aynı cümlenin iki tarafta farklı sertlikte duyulabilmesi."
                    : "Daha hassas nokta, ifade tonu; hızlı netlik arayışı bazen gereğinden sert okunabilir.";
            case "work.execution" -> "Teslim ve takip yükü eşit görünmediğinde biri taşıyan, diğeri geciktiren tarafa itilmiş hissedebilir.";
            case "work.conflict" -> "Gerilim yükseldiğinde biriniz çözümü hemen duymak, diğeriniz önce tansiyonu düşürmek isteyebilir.";
            default -> "Karar temposu ayrıştığında biri bekletilmiş, diğeri köşeye sıkışmış hissedebilir.";
        };
    }

    private String friendStrengthSentence(String metricId) {
        return switch (metricId) {
            case "friend.chatFlow" -> "Sohbet doğal açılıyor; bu da ilişkinin çabasız ama sıcak kalmasını sağlıyor.";
            case "friend.funRhythm" -> "Birlikte keyif alma tarafı canlı olduğunda arkadaşlık kendini kolayca yeniliyor.";
            case "friend.support" -> "Zor zamanda birbirine dönme refleksi bu bağı yüzeyde bırakmıyor.";
            case "friend.loyalty" -> "Sadakat hissi güçlü olduğunda ilişkinin omurgası daha net hissediliyor.";
            default -> "Alan tanıma ile yakın kalma arasında fena olmayan bir rahatlık var.";
        };
    }

    private String friendTensionSentence(String metricId, int seed) {
        return switch (metricId) {
            case "friend.chatFlow" -> "Daha hassas nokta, yanıt ve temas temposu; biri daha sık bağ kurmak isterken diğeri biraz daha akışta kalabilir.";
            case "friend.funRhythm" -> "Ortak keyif beklentisi aynı olmayınca biri daha hevesli, diğeri daha mesafeli görünebilir.";
            case "friend.support" -> seed % 2 == 0
                    ? "Destek dili aynı olmadığında iyi niyet bile karşı tarafa eksik ilgi gibi gelebilir."
                    : "Biriniz destek ihtiyacını açık isterken diğeriniz niyetin anlaşılacağını varsayabilir.";
            case "friend.loyalty" -> "Sadakat ve öncelik tanımı aynı değilse kırgınlık ses çıkarmadan büyüyebilir.";
            default -> "Alan ihtiyacı ile yakınlık beklentisi çakıştığında biri bunaltılmış, diğeri dışarıda kalmış hissedebilir.";
        };
    }

    private String familyStrengthSentence(String metricId) {
        return switch (metricId) {
            case "family.bond" -> "Aidiyet hissi oluştuğunda bu bağ kolayca sıcak ve sahiplenici bir tona geçiyor.";
            case "family.sensitivity" -> "Hassas konular tamamen kopmadan yumuşatılabildiğinde ilişki nefes alıyor.";
            case "family.responsibility" -> "Sorumluluk paylaşımı kurulduğunda düzen duygusu kırgınlığı ciddi biçimde azaltıyor.";
            case "family.boundary" -> "Yakınlık ile kişisel alan arasında belli bir saygı korunabiliyor.";
            default -> "Kriz sonrası toparlanma kapasitesi bu bağı kolay dağılmaktan koruyor.";
        };
    }

    private String familyTensionSentence(String metricId, int seed) {
        return switch (metricId) {
            case "family.bond" -> "Daha hassas nokta, bağlılığın nasıl gösterileceği; biriniz görünür teyit isterken diğeriniz bunu daha sessiz yaşayabilir.";
            case "family.sensitivity" -> "Ton farkı büyüdüğünde küçük bir konu bile eski kırgınlıkları yeniden açabilir.";
            case "family.responsibility" -> seed % 2 == 0
                    ? "Yük paylaşımı net değilse biri sessizce yorulurken diğeri bunu geç fark edebilir."
                    : "Sorumluluk görünür olmadığında emek eşitsizliği duygusu hızlıca büyüyebilir.";
            case "family.boundary" -> "Yakınlık dozu aynı değilse biri daha fazla temas, diğeri daha çok alan isteyebilir.";
            default -> "Kırgınlıktan sonra konuşma zamanı ayrıştığında onarım gecikip sessiz mesafe uzayabilir.";
        };
    }

    private String rivalStrengthSentence(String metricId) {
        return switch (metricId) {
            case "rival.strategy" -> "Hamleyi okuma gücü yüksek olduğunda rekabet daha akıllı ve kontrollü akıyor.";
            case "rival.tempo" -> "Baskı altında tempoyu taşıyabilmek bu eşleşmenin önemli gücü.";
            case "rival.trigger" -> "Tetiklenme anında bile tamamen dağılmadan kontrolü toplama kapasitesi var.";
            case "rival.fairPlay" -> "Kurallar net kaldığında rekabet çizgiyi aşmadan sertleşebiliyor.";
            default -> "Baskı anında performans tamamen çökmüyor; bu da dengeyi koruyor.";
        };
    }

    private String rivalTensionSentence(String metricId, int seed) {
        return switch (metricId) {
            case "rival.strategy" -> "Daha hassas nokta, doğru hamlenin ne zaman yapılacağı; biriniz erken, diğeriniz daha beklemeli ilerleyebilir.";
            case "rival.tempo" -> "Hız farkı büyüdüğünde bir taraf oyundan düşmüş, diğeri gereğinden fazla yük taşımış gibi kalabilir.";
            case "rival.trigger" -> seed % 2 == 0
                    ? "Tepki eşiği düştüğünde oyun kolayca kişisel tona kayabilir."
                    : "Gerilim hızla yükseldiğinde rekabet stratejiden çok reaksiyona dönebilir.";
            case "rival.fairPlay" -> "Kural yorumu aynı değilse mesele oyundan çıkıp adalet tartışmasına dönebilir.";
            default -> "Baskı arttığında küçük hata payları bile tahammülü daha hızlı düşürebilir.";
        };
    }

    private ConfidenceComputation computeConfidence(PartyData personA, PartyData personB, List<CrossAspect> aspects) {
        double birthTimeCertainty = (personA.birthTimeCertainty() + personB.birthTimeCertainty()) / 2.0d;

        double dataCompleteness = 0.25d;
        if (personA.hasPlanetData()) dataCompleteness += 0.2d;
        if (personB.hasPlanetData()) dataCompleteness += 0.2d;
        if (aspects != null && !aspects.isEmpty()) dataCompleteness += 0.25d;
        if (personA.hasHouseData() || personB.hasHouseData()) dataCompleteness += 0.1d;
        dataCompleteness = clamp01(dataCompleteness);

        double aspectDensity = clamp01((aspects == null ? 0 : aspects.size()) / 18.0d);

        double houseReliability;
        if (personA.hasHouseData() && personB.hasHouseData()) {
            houseReliability = 0.82d;
        } else if (personA.hasHouseData() || personB.hasHouseData()) {
            houseReliability = 0.62d;
        } else {
            houseReliability = 0.38d;
        }
        houseReliability = clamp01(houseReliability * (0.75d + birthTimeCertainty * 0.35d));

        double confidence = clamp01(
                0.35d * birthTimeCertainty
                        + 0.25d * dataCompleteness
                        + 0.20d * aspectDensity
                        + 0.20d * houseReliability
        );

        String confidenceLabel = mapConfidenceLabel(confidence);
        String dataQualityLabel = mapDataQualityLabel(confidence);

        return new ConfidenceComputation(
                confidence,
                confidenceLabel,
                birthTimeCertainty,
                dataCompleteness,
                aspectDensity,
                houseReliability,
                dataQualityLabel
        );
    }

    private PartyData loadPartyData(Synastry synastry, boolean personA) {
        String rawType = personA
                ? (synastry.getPersonAType() != null ? synastry.getPersonAType() : "USER")
                : (synastry.getPersonBType() != null ? synastry.getPersonBType() : "SAVED_PERSON");
        String type = rawType.toUpperCase(Locale.ROOT);

        if ("USER".equals(type)) {
            String userId = synastry.getUserId() == null ? null : synastry.getUserId().toString();
            Optional<NatalChart> chartOptional = userId == null
                    ? Optional.empty()
                    : natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId);

            if (chartOptional.isEmpty()) {
                return PartyData.empty();
            }

            NatalChart chart = chartOptional.get();
            List<PlanetPosition> planets = parsePlanets(chart.getPlanetPositionsJson());
            Map<String, Integer> houses = extractPlanetHouses(planets);

            double birthTimeCertainty;
            if (chart.getBirthTime() == null) {
                birthTimeCertainty = 0.45d;
            } else if (LocalTime.NOON.equals(chart.getBirthTime())) {
                birthTimeCertainty = 0.70d;
            } else {
                birthTimeCertainty = 0.88d;
            }

            boolean hasHouseData = hasJsonData(chart.getHousePlacementsJson());

            return new PartyData(
                    houses,
                    hasHouseData,
                    !planets.isEmpty(),
                    birthTimeCertainty,
                    chart.getCalculatedAt() != null ? chart.getCalculatedAt().toString() : ""
            );
        }

        Long personId = personA
                ? synastry.getPersonAId()
                : (synastry.getPersonBId() != null ? synastry.getPersonBId() : synastry.getSavedPersonId());

        if (personId == null) {
            return PartyData.empty();
        }

        Optional<SavedPerson> personOptional = savedPersonRepository.findById(personId);
        if (personOptional.isEmpty()) {
            return PartyData.empty();
        }

        SavedPerson person = personOptional.get();
        List<PlanetPosition> planets = parsePlanets(person.getPlanetPositionsJson());
        Map<String, Integer> houses = extractPlanetHouses(planets);

        double birthTimeCertainty;
        if (person.getBirthTime() == null) {
            birthTimeCertainty = 0.40d;
        } else if (LocalTime.NOON.equals(person.getBirthTime())) {
            birthTimeCertainty = 0.66d;
        } else {
            birthTimeCertainty = 0.84d;
        }

        boolean hasHouseData = hasJsonData(person.getHousePlacementsJson());

        return new PartyData(
                houses,
                hasHouseData,
                !planets.isEmpty(),
                birthTimeCertainty,
                person.getUpdatedAt() != null ? person.getUpdatedAt().toString() : ""
        );
    }

    private String resolveDistributionWarning(
            List<MetricComputation> rawMetrics,
            List<MetricComputation> metrics,
            ConfidenceComputation confidence
    ) {
        if (metrics == null || metrics.isEmpty()) {
            return null;
        }

        if (confidence.confidence() < CONFIDENCE_MEDIUM_THRESHOLD) {
            return "low_confidence_damped";
        }

        if (confidence.houseReliability() < HOUSE_PRECISION_LIMITED_THRESHOLD
                || confidence.birthTimeCertainty() < BIRTH_TIME_LIMITED_THRESHOLD) {
            return "house_precision_limited";
        }

        double calibratedStddev = computeStdDev(metrics);
        double rawStddev = rawMetrics == null || rawMetrics.isEmpty()
                ? calibratedStddev
                : computeStdDev(rawMetrics);
        double rawAverage = rawMetrics == null || rawMetrics.isEmpty()
                ? metrics.stream().mapToInt(MetricComputation::score).average().orElse(60.0d)
                : rawMetrics.stream().mapToInt(MetricComputation::score).average().orElse(60.0d);
        int spread = metrics.stream().mapToInt(MetricComputation::score).max().orElse(60)
                - metrics.stream().mapToInt(MetricComputation::score).min().orElse(60);
        int rawSpread = rawMetrics == null || rawMetrics.isEmpty()
                ? spread
                : rawMetrics.stream().mapToInt(MetricComputation::score).max().orElse(60)
                - rawMetrics.stream().mapToInt(MetricComputation::score).min().orElse(60);

        long strongMetricCount = metrics.stream().filter(metric -> metric.score() >= 78).count();
        boolean tightlyClustered = calibratedStddev < CLUSTERED_STDDEV_THRESHOLD
                && rawStddev < 5.0d
                && spread <= 12
                && rawSpread <= 14;
        boolean midBandProfile = rawAverage >= 52.0d && rawAverage <= 74.0d;

        if (tightlyClustered && midBandProfile && strongMetricCount <= 1) {
            return "scores_clustered";
        }
        return null;
    }

    private double computeStdDev(List<MetricComputation> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return 0.0d;
        }
        double avg = metrics.stream().mapToInt(MetricComputation::score).average().orElse(60.0d);
        double variance = metrics.stream()
                .mapToDouble(metric -> Math.pow(metric.score() - avg, 2))
                .average()
                .orElse(0.0d);
        return Math.sqrt(variance);
    }

    private String resolveMissingBirthTimeImpact(ConfidenceComputation confidence) {
        if (confidence.birthTimeCertainty() >= BIRTH_TIME_LIMITED_THRESHOLD
                && confidence.houseReliability() >= HOUSE_PRECISION_LIMITED_THRESHOLD) {
            return null;
        }
        return "Doğum saati netliği sınırlı olduğunda özellikle ev bazlı yorumlar daha temkinli değerlendirilir.";
    }

    private String resolveStatus(int score, double normalized, double volatility) {
        if (volatility > 0.78d && Math.abs(normalized) > 0.55d) {
            return mapMetricStatus(score, true);
        }
        return mapMetricStatus(score, false);
    }

    private String buildMetricInsight(MetricProfile metric, String status, int score) {
        return trimRange(buildMetricInsightCopy(metric.id(), metric.title(), status, score), 45, 90);
    }

    private MetricProfile metricFromId(String id, String fallbackTitle) {
        return ModuleProfile.ALL_METRICS.getOrDefault(id,
                new MetricProfile(
                        id,
                        fallbackTitle,
                        Set.of(),
                        Set.of(),
                        Set.of(),
                        0,
                        "Bu başlık ilişkiye güçlü bir renk katıyor.",
                        "Bu başlıkta ritim genel olarak dengede kalıyor.",
                        "Bu başlıkta küçük tempo farkları daha çabuk sorun gibi okunabilir.",
                        "Bu başlıkta net beklenti konuşması fark yaratır.",
                        "Bu başlık hem çekimi hem kırılganlığı aynı anda yükseltebilir."
                ));
    }

    private int mapRawToModuleBand(int score, int moduleBias, CompareModule module) {
        int clamped0to100 = clampScore(score + moduleBias, 0, 100);
        double mapped = SCORE_MIN + (clamped0to100 / 100.0d) * (SCORE_MAX - SCORE_MIN);
        if (mapped < 58.0d) {
            double lowFactor = switch (module) {
                case LOVE -> 1.08d;
                case FRIEND -> 1.14d;
                case FAMILY -> 1.18d;
                case WORK -> 1.24d;
                case RIVAL -> 1.26d;
            };
            mapped = 58.0d - (58.0d - mapped) * lowFactor;
        }
        if (mapped > 68.0d) {
            double midFactor = switch (module) {
                case LOVE -> 0.60d;
                case FRIEND -> 0.62d;
                case WORK, FAMILY -> 0.66d;
                case RIVAL -> 0.70d;
            };
            double highFactor = switch (module) {
                case LOVE -> 0.34d;
                case FRIEND -> 0.36d;
                case WORK, FAMILY -> 0.42d;
                case RIVAL -> 0.46d;
            };

            if (mapped <= 82.0d) {
                mapped = 68.0d + (mapped - 68.0d) * midFactor;
            } else {
                mapped = 68.0d + 14.0d * midFactor + (mapped - 82.0d) * highFactor;
            }
        }
        return (int) Math.round(mapped);
    }

    private int applyConfidenceDamping(int rawScore, double confidence, double spreadBase) {
        double spread = spreadBase * (0.55d + confidence * 0.70d);
        double damped = SCORE_CENTER + (rawScore - SCORE_CENTER) * spread;
        return clampScore((int) Math.round(damped), (int) SCORE_MIN, (int) SCORE_MAX);
    }

    private int scoreToPercentile(int score) {
        double normalized = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
        int percentile = (int) Math.round(1 + clamp01(normalized) * 98);
        return clampScore(percentile, 1, 99);
    }

    private String mapLevelLabel(int score) {
        if (score <= 39) return "Yüksek Problem";
        if (score <= 54) return "Zorlayıcı Denge";
        if (score <= 69) return "Dengeli Uyum";
        if (score <= 84) return "Güçlü Eşleşme";
        return "Nadir Uyum";
    }

    private String mapMetricStatus(int score, boolean intenseSignal) {
        if (intenseSignal) {
            return "intense";
        }
        if (score >= 80) {
            return "strong";
        }
        if (score >= 65) {
            return "balanced";
        }
        if (score >= 50) {
            return "watch";
        }
        return "growth";
    }

    private String mapConfidenceLabel(double confidence) {
        if (confidence >= CONFIDENCE_HIGH_THRESHOLD) {
            return "Yüksek";
        }
        if (confidence >= CONFIDENCE_MEDIUM_THRESHOLD) {
            return "Orta";
        }
        return "Sınırlı";
    }

    private String mapDataQualityLabel(double confidence) {
        if (confidence >= CONFIDENCE_HIGH_THRESHOLD) {
            return "high";
        }
        if (confidence >= CONFIDENCE_MEDIUM_THRESHOLD) {
            return "medium";
        }
        return "limited";
    }

    private double aspectPolarity(CrossAspect aspect) {
        return aspect != null && aspect.harmonious() ? 1.0d : -1.0d;
    }

    private double aspectWeight(String aspectType, CompareModule module) {
        if (aspectType == null) return 0.65d;
        return switch (module) {
            case LOVE -> switch (aspectType.toUpperCase(Locale.ROOT)) {
                case "TRINE" -> 1.06d;
                case "SEXTILE" -> 0.88d;
                case "CONJUNCTION" -> 1.08d;
                case "SQUARE" -> 1.10d;
                case "OPPOSITION" -> 1.02d;
                default -> 0.60d;
            };
            case WORK -> switch (aspectType.toUpperCase(Locale.ROOT)) {
                case "TRINE" -> 0.94d;
                case "SEXTILE" -> 0.90d;
                case "CONJUNCTION" -> 0.86d;
                case "SQUARE" -> 1.14d;
                case "OPPOSITION" -> 1.04d;
                default -> 0.58d;
            };
            case FRIEND -> switch (aspectType.toUpperCase(Locale.ROOT)) {
                case "TRINE" -> 0.98d;
                case "SEXTILE" -> 0.92d;
                case "CONJUNCTION" -> 0.84d;
                case "SQUARE" -> 1.02d;
                case "OPPOSITION" -> 0.94d;
                default -> 0.58d;
            };
            case FAMILY -> switch (aspectType.toUpperCase(Locale.ROOT)) {
                case "TRINE" -> 0.97d;
                case "SEXTILE" -> 0.80d;
                case "CONJUNCTION" -> 1.02d;
                case "SQUARE" -> 1.12d;
                case "OPPOSITION" -> 1.04d;
                default -> 0.60d;
            };
            case RIVAL -> switch (aspectType.toUpperCase(Locale.ROOT)) {
                case "TRINE" -> 0.90d;
                case "SEXTILE" -> 0.84d;
                case "CONJUNCTION" -> 0.82d;
                case "SQUARE" -> 1.16d;
                case "OPPOSITION" -> 1.08d;
                default -> 0.62d;
            };
        };
    }

    private double relevanceFloor(CompareModule module) {
        return switch (module) {
            case LOVE -> 0.30d;
            case FRIEND -> 0.38d;
            case FAMILY -> 0.40d;
            case WORK -> 0.44d;
            case RIVAL -> 0.46d;
        };
    }

    private double supportiveScale(CompareModule module) {
        return switch (module) {
            case LOVE -> 1.18d;
            case FRIEND -> 0.98d;
            case FAMILY -> 0.94d;
            case WORK -> 0.92d;
            case RIVAL -> 0.90d;
        };
    }

    private double challengingScale(CompareModule module, CrossAspect aspect, MetricProfile metric) {
        double scale = switch (module) {
            case LOVE -> 1.04d;
            case FRIEND -> 1.10d;
            case FAMILY -> 1.20d;
            case WORK -> 1.26d;
            case RIVAL -> 1.08d;
        };

        if (module == CompareModule.RIVAL && isHardAspect(aspect)
                && (containsPair(aspect, "mars", "pluto")
                || containsPair(aspect, "mars", "saturn")
                || containsPair(aspect, "sun", "mars"))) {
            return scale * 0.86d;
        }

        if (metric.id().contains("trust") || metric.id().contains("boundary") || metric.id().contains("conflict")) {
            scale += 0.06d;
        }

        return scale;
    }

    private double computeHouseWeight(CrossAspect aspect, MetricProfile metric, PartyData personA, PartyData personB) {
        if (aspect == null || metric.relevantHouses().isEmpty()) {
            return 1.0d;
        }

        Integer houseA = personA.planetHouse(aspect.userPlanet());
        Integer houseB = personB.planetHouse(aspect.partnerPlanet());

        boolean aRelevant = houseA != null && metric.relevantHouses().contains(houseA);
        boolean bRelevant = houseB != null && metric.relevantHouses().contains(houseB);

        if (aRelevant && bRelevant) return 1.36d;
        if (aRelevant || bRelevant) return 1.06d;
        if (personA.hasHouseData() || personB.hasHouseData()) return 0.64d;
        return 1.0d;
    }

    private double planetPairWeight(CrossAspect aspect, MetricProfile metric) {
        if (aspect == null) return 0.90d;

        String left = normalizePlanet(aspect.userPlanet());
        String right = normalizePlanet(aspect.partnerPlanet());

        if (metric.keyPlanets().contains(left) && metric.keyPlanets().contains(right)) {
            return 1.36d;
        }
        if ((metric.keyPlanets().contains(left) && metric.supportPlanets().contains(right))
                || (metric.keyPlanets().contains(right) && metric.supportPlanets().contains(left))) {
            return 1.04d;
        }
        if (metric.keyPlanets().contains(left) || metric.keyPlanets().contains(right)) {
            return 0.74d;
        }
        if (metric.supportPlanets().contains(left) || metric.supportPlanets().contains(right)) {
            return 0.38d;
        }
        return 0.0d;
    }

    private double moduleContextWeight(CrossAspect aspect, MetricProfile metric, CompareModule module) {
        if (aspect == null) {
            return 1.0d;
        }

        boolean hard = isHardAspect(aspect);
        return switch (module) {
            case LOVE -> {
                if (containsPair(aspect, "venus", "mars")) yield hard ? 0.96d : 1.42d;
                if (containsPair(aspect, "moon", "venus")) yield hard ? 0.92d : 1.34d;
                if (containsPair(aspect, "sun", "moon")) yield hard ? 0.98d : 1.28d;
                if (containsPair(aspect, "venus", "neptune")) yield hard ? 0.88d : 1.22d;
                if (containsPair(aspect, "moon", "jupiter") || containsPair(aspect, "venus", "jupiter")) yield hard ? 0.90d : 1.18d;
                if (containsPair(aspect, "moon", "saturn") || containsPair(aspect, "venus", "uranus")) yield hard ? 1.26d : 0.94d;
                if (containsPair(aspect, "mercury", "saturn")
                        || containsPair(aspect, "mercury", "mars")
                        || containsPair(aspect, "sun", "mercury")
                        || containsPair(aspect, "sun", "saturn")
                        || containsPair(aspect, "mars", "saturn")) yield 0.58d;
                yield 1.0d;
            }
            case WORK -> {
                if (containsPair(aspect, "mercury", "saturn")) yield hard ? 1.28d : 1.30d;
                if (containsPair(aspect, "sun", "mercury")) yield hard ? 1.22d : 1.18d;
                if (containsPair(aspect, "mars", "saturn")) yield hard ? 1.32d : 1.14d;
                if (containsPair(aspect, "mercury", "mars")) yield hard ? 1.30d : 0.94d;
                if (containsPair(aspect, "venus", "mars") || containsPair(aspect, "moon", "venus")) yield 0.56d;
                yield 1.0d;
            }
            case FRIEND -> {
                if (containsPair(aspect, "mercury", "jupiter")) yield hard ? 0.92d : 1.24d;
                if (containsPair(aspect, "moon", "mercury")) yield hard ? 0.94d : 1.18d;
                if (containsPair(aspect, "venus", "jupiter")) yield hard ? 0.90d : 1.18d;
                if (containsPair(aspect, "saturn", "moon")) yield hard ? 1.18d : 0.90d;
                if (containsPair(aspect, "venus", "mars")) yield 0.74d;
                yield 1.0d;
            }
            case FAMILY -> {
                if (containsPair(aspect, "moon", "venus")) yield hard ? 0.92d : 1.22d;
                if (containsPair(aspect, "moon", "saturn")) yield hard ? 1.24d : 1.18d;
                if (containsPair(aspect, "sun", "moon")) yield hard ? 0.96d : 1.16d;
                if (containsPair(aspect, "moon", "uranus") || containsPair(aspect, "moon", "pluto")) yield hard ? 1.28d : 0.86d;
                if (containsPair(aspect, "mercury", "saturn")) yield 0.82d;
                yield 1.0d;
            }
            case RIVAL -> {
                if (containsPair(aspect, "mars", "pluto")) yield hard ? 1.26d : 0.90d;
                if (containsPair(aspect, "mars", "saturn")) yield hard ? 1.18d : 1.04d;
                if (containsPair(aspect, "sun", "mars")) yield hard ? 1.18d : 0.98d;
                if (containsPair(aspect, "saturn", "jupiter")) yield hard ? 0.92d : 1.14d;
                if (containsPair(aspect, "venus", "moon")) yield 0.54d;
                yield 1.0d;
            }
        };
    }

    private boolean isHardAspect(CrossAspect aspect) {
        if (aspect == null || aspect.aspectType() == null) {
            return false;
        }
        String type = aspect.aspectType().toUpperCase(Locale.ROOT);
        return "SQUARE".equals(type) || "OPPOSITION".equals(type);
    }

    private boolean containsPair(CrossAspect aspect, String first, String second) {
        String left = normalizePlanet(aspect.userPlanet());
        String right = normalizePlanet(aspect.partnerPlanet());
        return (left.equals(first) && right.equals(second)) || (left.equals(second) && right.equals(first));
    }

    private String normalizePlanet(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private MatchTraitsResponse fallbackResponse(Long matchId, Synastry synastry, CompareModule module) {
        String fallbackBody = "Karşılaştırma verisi hazırlanırken bazı sinyaller eksik kaldı. Yine de bu modülde temel akış dengeli görünüyor; sonuçları birkaç gün içinde tekrar kontrol etmek daha net tablo verebilir.";

        return new MatchTraitsResponse(
                matchId,
                synastry.getHarmonyScore(),
                List.of(),
                List.of(),
                "Karşılaştırma eksenleri hazırlanamadı. Ana sinastri analizi kullanılabilir.",
                module.name(),
                new MatchTraitsResponse.Overall(60, mapLevelLabel(60), 0.52d, mapConfidenceLabel(0.52d), 50),
                new MatchTraitsResponse.Summary(
                        "Denge korunuyor, netlik gelişebilir",
                        fallbackBody,
                        "Doğum saati ve temel verileri güncelledikten sonra analizi tekrar alın."
                ),
                List.of(),
                new MatchTraitsResponse.TopDrivers(List.of(), List.of(), List.of()),
                List.of(),
                new MatchTraitsResponse.Explainability(
                        CALCULATION_VERSION,
                        List.of("aspect_type", "orb_decay", "confidence_damping"),
                        mapDataQualityLabel(0.52d),
                        LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                        "low_confidence_damped",
                        "Doğum saati belirsizliği ev bazlı hassasiyeti düşürebilir.",
                        module.name().toLowerCase(Locale.ROOT) + "-fallback"
                )
        );
    }

    private String buildFallbackSummary(Synastry synastry, List<TraitAxis> cardAxes) {
        Integer score = synastry.getHarmonyScore();
        if (score == null) {
            return "Uyum eksenleri hazırlandı; detaylar skor tamamlandıkça netleşir.";
        }
        if (cardAxes == null || cardAxes.isEmpty()) {
            return score >= 70
                    ? "Genelde uyumlu bir akış görülüyor; farklılıklar dengeyle güçlenebilir."
                    : "Farklılıklar belirgin; iletişimle dengeli bir ritim kurulabilir.";
        }
        TraitAxis strongest = cardAxes.stream()
                .max(Comparator.comparingInt(a -> Math.abs((a.score0to100() == null ? 50 : a.score0to100()) - 50)))
                .orElse(cardAxes.getFirst());
        int strongestScore = strongest.score0to100() == null ? 50 : strongest.score0to100();
        String emphasis = strongestScore < 50 ? strongest.leftLabel() : strongest.rightLabel();
        return (score >= 70
                ? "Uyum yüksek; "
                : score >= 50
                ? "Uyum dengeli; "
                : "Uyum dalgalı; ")
                + emphasis + " tarafı bu eşleşmede daha görünür olabilir.";
    }

    private List<CrossAspect> parseCrossAspects(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, CrossAspect.class)
            );
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse synastry cross aspects for trait scoring", e);
            return List.of();
        }
    }

    private List<PlanetPosition> parsePlanets(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class)
            );
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private Map<String, Integer> extractPlanetHouses(List<PlanetPosition> planets) {
        if (planets == null || planets.isEmpty()) {
            return Map.of();
        }
        Map<String, Integer> map = new HashMap<>();
        for (PlanetPosition planet : planets) {
            String key = normalizePlanet(planet.planet());
            if (!key.isEmpty()) {
                map.put(key, planet.house());
            }
        }
        return map;
    }

    private boolean hasJsonData(String value) {
        if (value == null || value.isBlank()) return false;
        String trimmed = value.trim();
        return !"[]".equals(trimmed) && !"{}".equals(trimmed);
    }

    private void evictExpiredCacheEntries() {
        if (cache.isEmpty()) {
            return;
        }
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> entry.getValue().expiresAtMs() <= now);
    }

    private int clampScore(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double clamp01(double value) {
        if (value < 0.0d) return 0.0d;
        if (value > 1.0d) return 1.0d;
        return value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }

    private String trimWords(String text, int maxWords) {
        if (text == null || text.isBlank()) return "";
        String[] words = text.trim().split("\\s+");
        if (words.length <= maxWords) {
            return text.trim();
        }
        return String.join(" ", Arrays.copyOf(words, maxWords)).trim();
    }

    private String trimTo(String text, int maxLen) {
        if (text == null) return "";
        String clean = text.trim();
        if (clean.length() <= maxLen) return clean;

        int sentenceBreak = -1;
        for (int index = Math.min(maxLen - 1, clean.length() - 1); index >= 0; index--) {
            char current = clean.charAt(index);
            if ((current == '.' || current == '!' || current == '?') && index >= maxLen * 0.62d) {
                sentenceBreak = index + 1;
                break;
            }
        }
        if (sentenceBreak > 0) {
            return clean.substring(0, sentenceBreak).trim();
        }

        int wordBreak = clean.lastIndexOf(' ', maxLen);
        if (wordBreak >= maxLen * 0.62d) {
            return clean.substring(0, wordBreak).trim();
        }

        return clean.substring(0, maxLen).trim();
    }

    private String trimRange(String text, int minLen, int maxLen) {
        String clipped = trimTo(text, maxLen);
        if (clipped.length() >= minLen) {
            return clipped;
        }
        if (clipped.endsWith(".")) {
            return clipped + " Dengeyle güçlenebilir.";
        }
        return clipped + " Dengeyle güçlenebilir.";
    }

    private String safeText(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }

    private String ensureWordRange(String text, int minWords, int maxWords, String fallback) {
        String base = safeText(text, fallback);
        String clipped = trimWords(base, maxWords);
        int count = clipped.trim().isEmpty() ? 0 : clipped.trim().split("\\s+").length;
        if (count >= minWords) {
            return clipped;
        }

        String padded = trimWords((clipped + " " + fallback).trim(), maxWords);
        int paddedCount = padded.trim().isEmpty() ? 0 : padded.trim().split("\\s+").length;
        if (paddedCount >= minWords) {
            return padded;
        }
        return trimWords("Denge güçlü, netlik gelişmeye açık", maxWords);
    }

    private String ensureLengthRange(String text, int minLen, int maxLen, String tail) {
        String result = trimTo(safeText(text, tail), maxLen);
        String appendix = safeText(tail, "");

        while (result.length() < minLen && !appendix.isBlank()) {
            String candidate = trimTo((result + " " + appendix).trim(), maxLen);
            if (candidate.equals(result)) {
                break;
            }
            result = candidate;
        }

        if (result.length() >= minLen) {
            return result;
        }

        String fallback = "Bu modülde dengeyi korumak için kısa ve düzenli iletişim adımları fayda sağlayabilir.";
        return trimRange(fallback, minLen, maxLen);
    }

    private record CachedEntry(MatchTraitsResponse response, int fingerprint, long expiresAtMs) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAtMs;
        }
    }

    private record LegacyPayload(
            List<CategoryGroup> categories,
            List<TraitAxis> cardAxes,
            String cardSummary
    ) {}

    private record V3Payload(
            MatchTraitsResponse.Overall overall,
            MatchTraitsResponse.Summary summary,
            List<MatchTraitsResponse.MetricCard> metricCards,
            MatchTraitsResponse.TopDrivers topDrivers,
            List<MatchTraitsResponse.ThemeSection> themeSections,
            MatchTraitsResponse.Explainability explainability
    ) {}

    private record PartyData(
            Map<String, Integer> planetHouseMap,
            boolean hasHouseData,
            boolean hasPlanetData,
            double birthTimeCertainty,
            String freshnessTag
    ) {
        static PartyData empty() {
            return new PartyData(Map.of(), false, false, 0.42d, "");
        }

        Integer planetHouse(String planet) {
            if (planetHouseMap == null || planetHouseMap.isEmpty()) return null;
            return planetHouseMap.get(planet == null ? "" : planet.trim().toLowerCase(Locale.ROOT));
        }

        String fingerprintPart() {
            return hasHouseData + ":" + hasPlanetData + ":" + roundStatic(birthTimeCertainty) + ":" + freshnessTag;
        }

        private static double roundStatic(double value) {
            return Math.round(value * 100.0d) / 100.0d;
        }
    }

    private record ConfidenceComputation(
            double confidence,
            String confidenceLabel,
            double birthTimeCertainty,
            double dataCompleteness,
            double aspectDensity,
            double houseReliability,
            String dataQualityLabel
    ) {}

    private record MetricComputation(
            String id,
            String title,
            int score,
            String status,
            String insight
    ) {
        MetricComputation withScore(int nextScore) {
            return new MetricComputation(id, title, nextScore, status, insight);
        }

        MetricComputation withStatusAndInsight(String nextStatus, String nextInsight) {
            return new MetricComputation(id, title, score, nextStatus, nextInsight);
        }
    }

    private enum CompareModule {
        LOVE,
        WORK,
        FRIEND,
        FAMILY,
        RIVAL;

        static CompareModule resolve(String requestedModule, String fallbackRelationshipType) {
            String raw = requestedModule != null && !requestedModule.isBlank()
                    ? requestedModule
                    : fallbackRelationshipType;
            if (raw == null || raw.isBlank()) {
                return LOVE;
            }

            String key = raw.trim().toUpperCase(Locale.ROOT);
            return switch (key) {
                case "LOVE", "ASK" -> LOVE;
                case "WORK", "BUSINESS", "IS" -> WORK;
                case "FRIEND", "FRIENDSHIP", "ARKADAS" -> FRIEND;
                case "FAMILY", "AILE" -> FAMILY;
                case "RIVAL", "RAKIP" -> RIVAL;
                default -> LOVE;
            };
        }
    }

    private record ThemeBlueprint(
            String title,
            List<String> metricIds
    ) {}

    private record MetricProfile(
            String id,
            String title,
            Set<String> keyPlanets,
            Set<String> supportPlanets,
            Set<Integer> relevantHouses,
            int baseOffset,
            String strongInsight,
            String balancedInsight,
            String watchInsight,
            String growthInsight,
            String intenseInsight
    ) {
        double moduleWeight(CrossAspect aspect) {
            if (aspect == null) {
                return 0.0d;
            }

            String left = aspect.userPlanet() == null ? "" : aspect.userPlanet().toLowerCase(Locale.ROOT);
            String right = aspect.partnerPlanet() == null ? "" : aspect.partnerPlanet().toLowerCase(Locale.ROOT);

            boolean leftKey = keyPlanets.contains(left);
            boolean rightKey = keyPlanets.contains(right);
            boolean leftSupport = supportPlanets.contains(left);
            boolean rightSupport = supportPlanets.contains(right);

            if (leftKey && rightKey) return 1.38d;
            if ((leftKey && rightSupport) || (rightKey && leftSupport)) return 1.06d;
            if (leftKey || rightKey) return 0.72d;
            if (leftSupport || rightSupport) return 0.26d;
            return 0.0d;
        }
    }

    private static final class ModuleProfile {
        private static final Map<String, MetricProfile> ALL_METRICS = new HashMap<>();

        private final CompareModule module;
        private final String profileId;
        private final double orbK;
        private final double spreadBase;
        private final int moduleBias;
        private final String introText;
        private final String dailyPatternText;
        private final List<MetricProfile> metricProfiles;
        private final List<ThemeBlueprint> themes;
        private final List<String> headlinePool;
        private final List<String> dailyHints;
        private final Map<String, String> actionHints;

        private ModuleProfile(
                CompareModule module,
                String profileId,
                double orbK,
                double spreadBase,
                int moduleBias,
                String introText,
                String dailyPatternText,
                List<MetricProfile> metricProfiles,
                List<ThemeBlueprint> themes,
                List<String> headlinePool,
                List<String> dailyHints,
                Map<String, String> actionHints
        ) {
            this.module = module;
            this.profileId = profileId;
            this.orbK = orbK;
            this.spreadBase = spreadBase;
            this.moduleBias = moduleBias;
            this.introText = introText;
            this.dailyPatternText = dailyPatternText;
            this.metricProfiles = metricProfiles;
            this.themes = themes;
            this.headlinePool = headlinePool;
            this.dailyHints = dailyHints;
            this.actionHints = actionHints;

            for (MetricProfile metric : metricProfiles) {
                ALL_METRICS.putIfAbsent(metric.id(), metric);
            }
        }

        static ModuleProfile forModule(CompareModule module) {
            return switch (module) {
                case LOVE -> love();
                case WORK -> work();
                case FRIEND -> friend();
                case FAMILY -> family();
                case RIVAL -> rival();
            };
        }

        private static ModuleProfile love() {
            return new ModuleProfile(
                    CompareModule.LOVE,
                    "love-v3-venus-moon-mars",
                    0.24d,
                    0.98d,
                    8,
                    "Bu modülde çekim, güven ve yakınlık ritmi birlikte ölçülür.",
                    "Özellikle ilgi gösterme biçimi, yakınlaşma temposu ve kırgınlık sonrası toparlanma biçimi sonuçta doğrudan karşılık bulur.",
                    List.of(
                            metric("love.attraction", "Çekim", kp("venus", "mars", "sun"), sp("moon", "pluto", "jupiter"), hs(5, 7, 8), 3,
                                    "İlgi karşılıklı ve hızlı yükseliyor.",
                                    "Çekim tarafında doğal bir denge korunuyor.",
                                    "Çekim var ama beklenti ritmi zaman zaman ayrışıyor.",
                                    "Çekimi sürdürülebilir kılmak için tempo konuşması faydalı olur.",
                                    "Çekim güçlü; aynı anda hassas tetiklenmeler de oluşabilir."),
                            metric("love.emotionalBond", "Duygusal Bağ", kp("moon", "venus", "sun"), sp("saturn", "jupiter"), hs(4, 7, 8), 2,
                                    "Duygusal bağ güvenli ve besleyici ilerliyor.",
                                    "Bağ kuruluyor; düzenli temas bunu güçlendirir.",
                                    "Duygusal ihtiyaçlar aynı hızda ifade edilmeyebilir.",
                                    "Duygusal bağı güçlendirmek için niyet konuşmaları iyi gelir.",
                                    "Duygusal bağ yoğun; iniş çıkışlarda netlik ihtiyacı artabilir."),
                            metric("love.trust", "Güven", kp("saturn", "moon", "venus"), sp("sun", "mercury", "jupiter"), hs(2, 4, 7, 8), -1,
                                    "Güven duygusu tutarlılıkla hızla pekişiyor.",
                                    "Güven zemini var; küçük söz takibiyle güçlenir.",
                                    "Tutarlılık beklentisi zaman zaman öne çıkıyor.",
                                    "Güveni artırmak için sözleri kısa döngülerde kapatın.",
                                    "Güven başlığında hem yakınlık hem hassasiyet birlikte yükseliyor."),
                            metric("love.romanticFlow", "Romantik Akış", kp("venus", "moon", "neptune"), sp("sun", "jupiter"), hs(5, 7, 12), 1,
                                    "Romantik akışta sıcak ve doğal bir tempo var.",
                                    "Romantik beklentiler genel olarak uyumlu görünüyor.",
                                    "Romantik ifade biçimi farklılaşınca kırılma yaşanabiliyor.",
                                    "Romantik akışı korumak için beklentiyi baştan netleştirin.",
                                    "Romantik akış güçlü; idealizasyon artınca hassasiyet büyüyebilir."),
                            metric("love.proximityBalance", "Yakınlık Dengesi", kp("moon", "uranus", "venus"), sp("saturn", "mars"), hs(1, 7, 11), -2,
                                    "Yakınlık ve alan ihtiyacı iyi dengeleniyor.",
                                    "Yakınlık dengesi kurulmuş; küçük hatırlatmalar yeterli.",
                                    "Yakınlık ve alan beklentisi bazen aynı anda çatışabiliyor.",
                                    "Yakınlık dengesinde ortak kural belirlemek rahatlatır.",
                                    "Yakınlık ihtiyacı yoğun; alan talebi de eşzamanlı güçlenebilir.")
                    ),
                    List.of(
                            new ThemeBlueprint("Duygusal Yakınlık", List.of("love.attraction", "love.emotionalBond")),
                            new ThemeBlueprint("Güven ve Romantik Akış", List.of("love.trust", "love.romanticFlow")),
                            new ThemeBlueprint("Yakınlık Ritim Ayarı", List.of("love.proximityBalance"))
                    ),
                    List.of(
                            "Yakınlık güçlü, ritim ayarı belirleyici",
                            "Çekim yüksek, denge konuşması kritik",
                            "Bağ kuvvetli, tempo farkı yönetilmeli",
                            "Romantik akış iyi, güven ritmi önemli"
                    ),
                    List.of(
                            "Yoğun günlerde kısa ama net check-in yapmak bu modülde dengeyi korur.",
                            "Yakınlık beklentisini haftalık konuşmak kırgınlık birikimini azaltır.",
                            "Romantik jestleri tahmine bırakmadan netleştirmek akışı rahatlatır."
                    ),
                    Map.of(
                            "love.attraction", "Ortak keyif alanlarını planlı şekilde artırın.",
                            "love.emotionalBond", "Duygusal ihtiyaçları kısa ve açık cümlelerle paylaşın.",
                            "love.trust", "Söz verilen konuları aynı hafta içinde kapatın.",
                            "love.romanticFlow", "Beklenti farkını konuşup küçük ritüeller belirleyin.",
                            "love.proximityBalance", "Yakınlık ve kişisel alan için ortak sınır cümlesi belirleyin."
                    )
            );
        }

        private static ModuleProfile work() {
            return new ModuleProfile(
                    CompareModule.WORK,
                    "work-v3-mercury-saturn-mars",
                    0.18d,
                    0.82d,
                    -12,
                    "Bu modülde plan, iletişim ve iş tamamlama ritmi ölçülür.",
                    "Görev paylaşımı, karar hızı ve gerilim anında çözüm üretme biçimi bu skoru doğrudan etkiler.",
                    List.of(
                            metric("work.planFit", "Plan Uyumu", kp("saturn", "mercury", "sun"), sp("mars", "jupiter"), hs(6, 10, 3), 2,
                                    "Planlama tarzı birbirini destekliyor.",
                                    "Plan tarafında uyumlu bir yapı kuruluyor.",
                                    "Plan değişikliklerinde tempo farkı belirginleşebilir.",
                                    "Plan uyumu için roller ve teslim tarihi netleştirilmeli.",
                                    "Plan tarafında yoğun baskı altında ani kırılmalar görülebilir."),
                            metric("work.communication", "İletişim Netliği", kp("mercury", "sun"), sp("saturn", "jupiter", "moon"), hs(3, 6, 10), 1,
                                    "İletişim net ve çözüme odaklı ilerliyor.",
                                    "İletişimde genel netlik korunuyor.",
                                    "Konuşma temposu farklılaştığında yanlış anlama artabilir.",
                                    "Kritik konularda karar cümlesini yazılı netleştirmek faydalı olur.",
                                    "İletişim hızlı; gerilimde ton yönetimi kritik hale gelebilir."),
                            metric("work.execution", "Görev Tamamlama", kp("mars", "saturn", "sun"), sp("mercury", "jupiter"), hs(6, 10), 0,
                                    "Görev takibi güçlü ve sürdürülebilir görünüyor.",
                                    "Görev tamamlama ritmi dengeli ilerliyor.",
                                    "Teslim anlarında öncelik farkı gecikme yaratabilir.",
                                    "Haftalık teslim listesiyle görev tamamlama güvenceye alınabilir.",
                                    "Görev tamamlama temposu yüksek; yük paylaşımı konuşulmalı."),
                            metric("work.conflict", "Çatışma Yönetimi", kp("saturn", "mars", "mercury"), sp("moon", "sun"), hs(6, 10, 1), -2,
                                    "Gerilim anında çözüm odağı korunabiliyor.",
                                    "Çatışma anları yönetilebilir seviyede.",
                                    "Gerilimde hız farkı konuşmanın yönünü zorlayabiliyor.",
                                    "Çatışma anlarında kısa mola + tek konu kuralı etkili olur.",
                                    "Çatışma yönetimi yoğun; hızlı tepki döngüsü artabilir."),
                            metric("work.decisionSpeed", "Karar Hızı Uyumu", kp("mercury", "mars", "saturn"), sp("sun", "jupiter"), hs(3, 6, 10), -1,
                                    "Karar alma temposu birbirini tamamlıyor.",
                                    "Karar hızı genel olarak yakın seyrediyor.",
                                    "Karar hızındaki fark bazı başlıklarda problem yaratabilir.",
                                    "Kararları iki aşamaya bölmek hız farkını dengeler.",
                                    "Karar hızı yüksek; ani kararlar sonrası revizyon ihtiyacı artabilir.")
                    ),
                    List.of(
                            new ThemeBlueprint("Plan ve İcra", List.of("work.planFit", "work.execution")),
                            new ThemeBlueprint("İletişim ve Karar", List.of("work.communication", "work.decisionSpeed")),
                            new ThemeBlueprint("Gerilim Yönetimi", List.of("work.conflict"))
                    ),
                    List.of(
                            "İş akışı dengeli, tempo farkı izlenmeli",
                            "Plan güçlü, karar hızı ayarı kritik",
                            "Verim var, iletişim netliği belirleyici",
                            "İş uyumu iyi, çatışma protokolü önemli"
                    ),
                    List.of(
                            "Haftalık görevleri sahip-destek-teslim olarak netlemek iş akışını hızlandırır.",
                            "Kritik kararları kısa yazılı özetle kapatmak tempo farkını azaltır.",
                            "Gerilim anında tek konu kuralı kullanmak verimi korur."
                    ),
                    Map.of(
                            "work.planFit", "Haftalık planı iki kişinin tempo farkına göre iki fazda yapın.",
                            "work.communication", "Toplantı sonunda net karar cümlesini birlikte yazın.",
                            "work.execution", "Teslim günlerinden önce kısa ara kontrol noktası koyun.",
                            "work.conflict", "Gerilimde önce konu sınırı, sonra çözüm adımı belirleyin.",
                            "work.decisionSpeed", "Hızlı kararları ertesi gün 5 dakikalık gözden geçirme ile sabitleyin."
                    )
            );
        }

        private static ModuleProfile friend() {
            return new ModuleProfile(
                    CompareModule.FRIEND,
                    "friend-v3-mercury-jupiter-moon",
                    0.14d,
                    0.78d,
                    -4,
                    "Bu modülde sohbet akışı, destek ve sadakat ritmi ölçülür.",
                    "Günlük iletişim kolaylığı, birlikte eğlenme temposu ve sınır saygısı bu modülde ana belirleyicidir.",
                    List.of(
                            metric("friend.chatFlow", "Sohbet Akışı", kp("mercury", "jupiter", "moon"), sp("sun", "venus"), hs(3, 11), 2,
                                    "Sohbet kolay açılıyor ve doğal akıyor.",
                                    "Sohbet akışı rahat ve sürdürülebilir.",
                                    "Sohbet ritminde zaman zaman hız farkı daha açık ortaya çıkabilir.",
                                    "Sohbet dengesini korumak için net beklenti cümlesi kurun.",
                                    "Sohbet çok hızlı; yanlış anlaşmayı azaltmak için yavaşlama gerekebilir."),
                            metric("friend.funRhythm", "Eğlence Ritmi", kp("jupiter", "venus", "uranus"), sp("moon", "mars"), hs(5, 11), 1,
                                    "Birlikte eğlenme temposu yüksek görünüyor.",
                                    "Eğlence ritmi dengeli ve keyifli.",
                                    "Eğlence beklentisi farklılaştığında kopukluk hissi doğabilir.",
                                    "Ortak keyif alanını düzenli planlamak uyumu artırır.",
                                    "Eğlence temposu yoğun; beklenti konuşması şart olabilir."),
                            metric("friend.support", "Destek Gücü", kp("moon", "venus", "jupiter"), sp("saturn", "sun"), hs(4, 11), 0,
                                    "Destek verme-alma dengesi güçlü.",
                                    "Destek kapasitesi iyi seviyede korunuyor.",
                                    "Destek beklentisi ifade edilmediğinde kırılma oluşabilir.",
                                    "Zor günlerde destek ihtiyacını açık söylemek bağı güçlendirir.",
                                    "Destek akışı güçlü; hassas dönemlerde yanlış yorum riski artabilir."),
                            metric("friend.loyalty", "Sadakat", kp("saturn", "moon", "sun"), sp("venus", "jupiter"), hs(11, 4, 7), -1,
                                    "Sadakat zemini güçlü ve güven verici.",
                                    "Sadakat tarafında dengeli bir görünüm var.",
                                    "Sadakat beklentisi netleşmediğinde kırgınlık birikebilir.",
                                    "Sadakat beklentilerini karşılıklı açık cümleyle belirleyin.",
                                    "Sadakat alanı yoğun; sınır ihlali algısı hızla büyüyebilir."),
                            metric("friend.boundaryRespect", "Sınır Saygısı", kp("saturn", "uranus", "mercury"), sp("moon", "sun"), hs(1, 11, 3), -2,
                                    "Sınırlar karşılıklı saygıyla korunuyor.",
                                    "Sınır dengesi genel olarak sağlıklı.",
                                    "Yanıt hızı ve alan ihtiyacı konusunda problem oluşabilir.",
                                    "Sınır konuşmalarını varsayım yerine net ifadeyle yapın.",
                                    "Sınır başlığında güçlü tepki döngüleri tetiklenebilir.")
                    ),
                    List.of(
                            new ThemeBlueprint("Sohbet ve Keyif", List.of("friend.chatFlow", "friend.funRhythm")),
                            new ThemeBlueprint("Destek ve Sadakat", List.of("friend.support", "friend.loyalty")),
                            new ThemeBlueprint("Sınır Dengesi", List.of("friend.boundaryRespect"))
                    ),
                    List.of(
                            "Arkadaşlık akışı rahat, sınır dili önemli",
                            "Sohbet güçlü, destek ritmi belirleyici",
                            "Keyif var, sadakat beklentisi netleşmeli",
                            "Bağ sıcak, alan dengesi konuşulmalı"
                    ),
                    List.of(
                            "Yanıt süresi ve plan sıklığını netleştirmek arkadaşlık akışını korur.",
                            "Destek ihtiyacını tahmine bırakmadan söylemek bağı güçlendirir.",
                            "Ortak keyif ritmini haftalık kısa planla sabitlemek iyi gelir."
                    ),
                    Map.of(
                            "friend.chatFlow", "Sohbet yoğunluğunu iki tarafın temposuna göre dengeleyin.",
                            "friend.funRhythm", "Ortak keyif aktiviteleri için dönüşümlü plan yapın.",
                            "friend.support", "Zor günlerde destek beklentisini doğrudan ifade edin.",
                            "friend.loyalty", "Sadakat ve öncelik beklentilerini açık şekilde tanımlayın.",
                            "friend.boundaryRespect", "Mesaj temposu ve kişisel alan sınırını karşılıklı belirleyin."
                    )
            );
        }

        private static ModuleProfile family() {
            return new ModuleProfile(
                    CompareModule.FAMILY,
                    "family-v3-moon-saturn-venus",
                    0.20d,
                    0.80d,
                    -6,
                    "Bu modülde aidiyet, hassasiyet ve sorumluluk dengesi ölçülür.",
                    "Aile bağında duygusal güven, sorumluluk paylaşımı ve sınır konuşmaları sonuçları belirler.",
                    List.of(
                            metric("family.bond", "Bağlılık", kp("moon", "venus", "sun"), sp("saturn", "jupiter"), hs(4, 7), 1,
                                    "Bağlılık hissi güçlü ve besleyici görünüyor.",
                                    "Bağlılık zemini dengeli ilerliyor.",
                                    "Bağlılık beklentisinde zaman zaman hız farkı oluşabilir.",
                                    "Bağlılık göstergelerini açık konuşmak kırgınlığı azaltır.",
                                    "Bağlılık yüksek; hassas tetiklenme dönemleri yaşanabilir."),
                            metric("family.sensitivity", "Hassasiyet Yönetimi", kp("moon", "neptune", "venus"), sp("saturn", "mercury"), hs(4, 12, 7), -1,
                                    "Hassas konular yumuşak dille yönetilebiliyor.",
                                    "Hassasiyet yönetimi dengeli kalıyor.",
                                    "Hassas konularda ton farkı hızlı etkilenme yaratabilir.",
                                    "Hassas anlarda kısa mola sonrası konuşma daha iyi çalışır.",
                                    "Hassasiyet yüksek; yanlış anlamalar hızlı büyüyebilir."),
                            metric("family.responsibility", "Sorumluluk Paylaşımı", kp("saturn", "sun", "mars"), sp("mercury", "moon"), hs(4, 6, 10), 0,
                                    "Sorumluluk paylaşımı düzenli ilerliyor.",
                                    "Sorumluluk dağılımı genel olarak dengeli.",
                                    "Sorumluluk beklentisi netleşmediğinde gerilim oluşabilir.",
                                    "Sorumlulukları yazılı kısa görev listesiyle netleştirin.",
                                    "Sorumluluk yükü yoğun; tek tarafa yığılma hissi artabilir."),
                            metric("family.boundary", "Sınır Dengesi", kp("saturn", "uranus", "moon"), sp("venus", "sun"), hs(1, 4, 7), -2,
                                    "Sınır dengesi saygılı biçimde korunuyor.",
                                    "Sınır konuşmaları yönetilebilir seviyede.",
                                    "Alan ihtiyacı ve yakınlık beklentisi çakışabilir.",
                                    "Sınır dengesini korumak için birlikte kural belirleyin.",
                                    "Sınır başlığında güçlü tepkiler aynı anda yükseliyor olabilir."),
                            metric("family.repair", "Kriz Sonrası Onarım", kp("moon", "saturn", "mercury"), sp("venus", "jupiter"), hs(4, 8, 3), -1,
                                    "Kriz sonrası toparlanma kapasitesi güçlü.",
                                    "Onarım ritmi dengeli şekilde korunuyor.",
                                    "Kriz sonrası konuşma zamanlaması farklı olabilir.",
                                    "Onarım için konuşma zamanını önceden belirlemek etkili olur.",
                                    "Kriz sonrası onarım yoğun; doğru zamanlama kritik hale gelebilir.")
                    ),
                    List.of(
                            new ThemeBlueprint("Aidiyet ve Hassasiyet", List.of("family.bond", "family.sensitivity")),
                            new ThemeBlueprint("Sorumluluk ve Sınırlar", List.of("family.responsibility", "family.boundary")),
                            new ThemeBlueprint("Onarım Kapasitesi", List.of("family.repair"))
                    ),
                    List.of(
                            "Bağ güçlü, sorumluluk netliği kritik",
                            "Aidiyet iyi, sınır dili belirleyici",
                            "Aile akışı dengeli, onarım ritmi önemli",
                            "Hassasiyet yüksek, görev paylaşımı konuşulmalı"
                    ),
                    List.of(
                            "Aile içi beklentileri aylık kısa toplantıyla netlemek dengeyi korur.",
                            "Hassas konuşmalarda önce duygu, sonra ihtiyaç cümlesi kullanın.",
                            "Sorumluluk dağılımını görünür yapmak kırgınlık birikimini azaltır."
                    ),
                    Map.of(
                            "family.bond", "Aidiyet ihtiyacını düzenli ve açık geri bildirimle besleyin.",
                            "family.sensitivity", "Hassas konularda konuşma zamanını önceden belirleyin.",
                            "family.responsibility", "Sorumlulukları haftalık net görev listesiyle paylaşın.",
                            "family.boundary", "Yakınlık ve alan beklentisini birlikte yazılı netleştirin.",
                            "family.repair", "Gerilim sonrası onarım konuşmasını ertelemeden planlayın."
                    )
            );
        }

        private static ModuleProfile rival() {
            return new ModuleProfile(
                    CompareModule.RIVAL,
                    "rival-v3-mars-pluto-saturn",
                    0.24d,
                    0.90d,
                    -10,
                    "Bu modülde strateji, tempo ve baskı altı performans ölçülür.",
                    "Rekabet anında hamle zamanı, tetiklenme yönetimi ve adil oyun sınırları sonucu belirler.",
                    List.of(
                            metric("rival.strategy", "Stratejik Okuma", kp("mercury", "saturn", "pluto"), sp("sun", "jupiter"), hs(1, 6, 10), 2,
                                    "Rakibin hamlesini okuma kapasitesi güçlü.",
                                    "Stratejik okuma dengeli ilerliyor.",
                                    "Stratejik karar anlarında gecikme farkı oluşabilir.",
                                    "Rakip hamlesi için önceden B planı belirlemek faydalı olur.",
                                    "Stratejik oyun yoğun; ani kırılmalar dikkat isteyebilir."),
                            metric("rival.tempo", "Tempo Dayanıklılığı", kp("mars", "saturn", "sun"), sp("pluto", "jupiter"), hs(1, 6, 10), 0,
                                    "Tempo baskısında direnç güçlü görünüyor.",
                                    "Tempo dayanıklılığı dengeli seyrediyor.",
                                    "Hız farkı kritik anlarda performansı etkileyebilir.",
                                    "Tempo yönetimi için yük piklerini önceden konuşun.",
                                    "Tempo çok yüksek; yorgunluk kaynaklı hata riski artabilir."),
                            metric("rival.trigger", "Tetiklenme Kontrolü", kp("mars", "pluto", "moon"), sp("saturn", "mercury"), hs(1, 8, 6), -2,
                                    "Tetiklenme anında kontrol korunabiliyor.",
                                    "Tetiklenme yönetimi genel olarak dengede.",
                                    "Gerilim anında tepkiler hızla yükselme eğiliminde olabilir.",
                                    "Tetiklenme anında karar vermeden önce kısa duraklama koyun.",
                                    "Tetiklenme yüksek; karşılıklı reaksiyon döngüsü hızlanabilir."),
                            metric("rival.fairPlay", "Adil Oyun", kp("saturn", "jupiter", "sun"), sp("venus", "mercury"), hs(1, 7, 10), -1,
                                    "Adil oyun sınırları güçlü şekilde korunuyor.",
                                    "Adil oyun zemini dengeli görünüyor.",
                                    "Kural yorumunda fark oluştuğunda gerilim artabilir.",
                                    "Kuralları maç öncesi netleştirmek adil oyun hissini güçlendirir.",
                                    "Adil oyun başlığında hassasiyet yüksek; yorum farkı büyüyebilir."),
                            metric("rival.pressure", "Baskı Altı Performans", kp("saturn", "mars", "sun"), sp("pluto", "mercury"), hs(6, 10, 1), -1,
                                    "Baskı altında performans sürdürülebilir görünüyor.",
                                    "Baskı yönetiminde denge korunuyor.",
                                    "Baskı yükseldiğinde karar kalitesi dalgalanabilir.",
                                    "Baskı anı için kısa karar protokolü belirlemek etkiyi azaltır.",
                                    "Baskı altında performans yüksek; hata toleransı düşebilir.")
                    ),
                    List.of(
                            new ThemeBlueprint("Strateji ve Tempo", List.of("rival.strategy", "rival.tempo")),
                            new ThemeBlueprint("Gerilim ve Kontrol", List.of("rival.trigger", "rival.pressure")),
                            new ThemeBlueprint("Adil Oyun Çerçevesi", List.of("rival.fairPlay"))
                    ),
                    List.of(
                            "Rekabet canlı, kontrol dili belirleyici",
                            "Tempo yüksek, strateji netliği kritik",
                            "Baskı güçlü, adil oyun çerçevesi önemli",
                            "Hamle gücü var, tetiklenme yönetimi şart"
                    ),
                    List.of(
                            "Rekabet öncesi kuralları net konuşmak gereksiz gerilimi azaltır.",
                            "Baskı anında tek hedefe odaklanmak performansı stabilize eder.",
                            "Tetiklenme anında kısa duraklama kuralı oyunun dengesini korur."
                    ),
                    Map.of(
                            "rival.strategy", "Kritik hamleler için önceden alternatif plan belirleyin.",
                            "rival.tempo", "Tempo zirvelerinde görev ve enerji dağılımını netleyin.",
                            "rival.trigger", "Tetiklenmede karar öncesi 20 saniye kuralı uygulayın.",
                            "rival.fairPlay", "Kuralları ve ihlal sınırlarını maç öncesi yazılı netleştirin.",
                            "rival.pressure", "Baskı anı için kısa karar kontrol listesi kullanın."
                    )
            );
        }

        CompareModule module() {
            return module;
        }

        String profileId() {
            return profileId;
        }

        double orbK() {
            return orbK;
        }

        double spreadBase() {
            return spreadBase;
        }

        int moduleBias() {
            return moduleBias;
        }

        String introText() {
            return introText;
        }

        String dailyPatternText() {
            return dailyPatternText;
        }

        List<MetricProfile> metricProfiles() {
            return metricProfiles;
        }

        List<ThemeBlueprint> themes() {
            return themes;
        }

        String headline(int seed, int score, double confidence) {
            int index = Math.floorMod(seed, headlinePool.size());
            String candidate = headlinePool.get(index);
            if (confidence < 0.55d && score > 78) {
                return "Potansiyel yüksek, netlik tamamlanıyor";
            }
            if (confidence < 0.50d && score < 45) {
                return "Temkinli okuma, veri netliği artmalı";
            }
            return candidate;
        }

        String dailyHint(int seed) {
            return dailyHints.get(Math.floorMod(seed + 7, dailyHints.size()));
        }

        String actionHintForMetric(String metricId) {
            return actionHints.getOrDefault(metricId, "Bu başlıkta küçük ama düzenli iyileştirme adımları planlayın.");
        }

        private static MetricProfile metric(
                String id,
                String title,
                Set<String> keyPlanets,
                Set<String> supportPlanets,
                Set<Integer> relevantHouses,
                int baseOffset,
                String strongInsight,
                String balancedInsight,
                String watchInsight,
                String growthInsight,
                String intenseInsight
        ) {
            return new MetricProfile(
                    id,
                    title,
                    keyPlanets,
                    supportPlanets,
                    relevantHouses,
                    baseOffset,
                    strongInsight,
                    balancedInsight,
                    watchInsight,
                    growthInsight,
                    intenseInsight
            );
        }

        private static Set<String> kp(String... planets) {
            return Arrays.stream(planets)
                    .map(value -> value == null ? "" : value.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }

        private static Set<String> sp(String... planets) {
            return Arrays.stream(planets)
                    .map(value -> value == null ? "" : value.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }

        private static Set<Integer> hs(Integer... houses) {
            return new LinkedHashSet<>(Arrays.asList(houses));
        }
    }
}
