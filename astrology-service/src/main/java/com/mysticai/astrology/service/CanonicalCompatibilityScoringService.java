package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CrossAspect;
import com.mysticai.astrology.dto.SynastryDisplayMetric;
import com.mysticai.astrology.dto.SynastryModuleScore;
import com.mysticai.astrology.dto.SynastryScoreSnapshot;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CanonicalCompatibilityScoringService {

    public static final String SCORING_VERSION = "synastry-v4.1.0";

    private static final double CONFIDENCE_HIGH_THRESHOLD = 0.75d;
    private static final double CONFIDENCE_MEDIUM_THRESHOLD = 0.55d;
    private static final double BIRTH_TIME_LIMITED_THRESHOLD = 0.72d;
    private static final double HOUSE_PRECISION_LIMITED_THRESHOLD = 0.50d;

    public record PartySignal(
            Map<String, Integer> planetHouses,
            boolean hasHouseData,
            boolean hasPlanetData,
            double birthTimeCertainty
    ) {
        public PartySignal {
            planetHouses = planetHouses == null ? Map.of() : Map.copyOf(planetHouses);
            birthTimeCertainty = clamp01(birthTimeCertainty);
        }

        public static PartySignal empty() {
            return new PartySignal(Map.of(), false, false, 0.45d);
        }
    }

    private enum ModuleKey {
        LOVE,
        WORK,
        FRIEND,
        FAMILY,
        RIVAL;

        static ModuleKey resolve(String value) {
            if (value == null || value.isBlank()) {
                return LOVE;
            }

            String normalized = value.trim().toUpperCase(Locale.ROOT);
            return switch (normalized) {
                case "LOVE", "ASK" -> LOVE;
                case "WORK", "BUSINESS", "IS" -> WORK;
                case "FRIEND", "FRIENDSHIP", "ARKADAS" -> FRIEND;
                case "FAMILY", "AILE" -> FAMILY;
                case "RIVAL", "RAKIP" -> RIVAL;
                default -> LOVE;
            };
        }
    }

    private record MetricSpec(
            String id,
            String title,
            Set<String> keyPlanets,
            Set<String> supportPlanets,
            Set<Integer> relevantHouses,
            int baseOffset
    ) {
        double relevance(CrossAspect aspect) {
            if (aspect == null) {
                return 0.0d;
            }

            String left = normalizePlanet(aspect.userPlanet());
            String right = normalizePlanet(aspect.partnerPlanet());
            boolean leftKey = keyPlanets.contains(left);
            boolean rightKey = keyPlanets.contains(right);
            boolean leftSupport = supportPlanets.contains(left);
            boolean rightSupport = supportPlanets.contains(right);

            if (leftKey && rightKey) return 1.42d;
            if ((leftKey && rightSupport) || (rightKey && leftSupport)) return 1.12d;
            if (leftKey || rightKey) return 0.84d;
            if (leftSupport || rightSupport) return 0.42d;
            return 0.0d;
        }
    }

    private record ModuleSpec(
            ModuleKey key,
            List<MetricSpec> metrics,
            double orbK
    ) {}

    private record ConfidenceSnapshot(
            double confidence,
            String confidenceLabel,
            double birthTimeCertainty,
            double houseReliability,
            String dataQuality
    ) {}

    public SynastryScoreSnapshot buildSnapshot(
            List<CrossAspect> aspects,
            PartySignal personA,
            PartySignal personB
    ) {
        List<CrossAspect> safeAspects = aspects == null ? List.of() : aspects;
        PartySignal safePersonA = personA == null ? PartySignal.empty() : personA;
        PartySignal safePersonB = personB == null ? PartySignal.empty() : personB;

        LinkedHashMap<String, SynastryModuleScore> moduleScores = new LinkedHashMap<>();
        for (ModuleKey moduleKey : ModuleKey.values()) {
            ModuleSpec spec = moduleSpec(moduleKey);
            List<SynastryDisplayMetric> metrics = spec.metrics().stream()
                    .map(metric -> new SynastryDisplayMetric(
                            metric.id(),
                            metric.title(),
                            computeMetricScore(metric, spec, safeAspects, safePersonA, safePersonB)
                    ))
                    .toList();
            moduleScores.put(moduleKey.name(), new SynastryModuleScore(
                    computeModuleOverall(spec, metrics),
                    metrics
            ));
        }

        int baseHarmonyScore = computeBaseHarmonyScore(safeAspects);
        ConfidenceSnapshot confidence = computeConfidence(safePersonA, safePersonB, safeAspects);
        String distributionWarning = resolveDistributionWarning(moduleScores, confidence);
        String missingBirthTimeImpact = resolveMissingBirthTimeImpact(confidence);

        return new SynastryScoreSnapshot(
                baseHarmonyScore,
                moduleScores,
                round2(confidence.confidence()),
                confidence.confidenceLabel(),
                confidence.dataQuality(),
                distributionWarning,
                missingBirthTimeImpact,
                SCORING_VERSION
        );
    }

    public Integer resolveModuleOverall(SynastryScoreSnapshot snapshot, String relationshipType) {
        if (snapshot == null || snapshot.moduleScores() == null || snapshot.moduleScores().isEmpty()) {
            return null;
        }
        String key = ModuleKey.resolve(relationshipType).name();
        SynastryModuleScore moduleScore = snapshot.moduleScores().get(key);
        if (moduleScore != null && moduleScore.overall() != null) {
            return clampScore(moduleScore.overall(), 20, 95);
        }
        return snapshot.baseHarmonyScore() == null ? null : clampScore(snapshot.baseHarmonyScore(), 20, 95);
    }

    public Integer resolveCompositeCommunication(SynastryScoreSnapshot snapshot) {
        return averageScores(
                metricScore(snapshot, "WORK", "work.communication"),
                metricScore(snapshot, "FRIEND", "friend.chatFlow"),
                metricScore(snapshot, "LOVE", "love.romanticFlow")
        );
    }

    public Integer resolveCompositeSpiritualBond(SynastryScoreSnapshot snapshot) {
        return averageScores(
                metricScore(snapshot, "LOVE", "love.emotionalBond"),
                metricScore(snapshot, "FAMILY", "family.bond"),
                metricScore(snapshot, "FAMILY", "family.repair")
        );
    }

    private int computeBaseHarmonyScore(List<CrossAspect> aspects) {
        if (aspects == null || aspects.isEmpty()) {
            return 50;
        }

        double supportive = 0.0d;
        double challenging = 0.0d;

        for (CrossAspect aspect : aspects) {
            double contribution = baseAspectWeight(aspect)
                    * orbDecay(aspect, 0.16d)
                    * basePlanetWeight(aspect)
                    * baseResonanceWeight(aspect);
            if (aspect.harmonious()) {
                supportive += contribution;
            } else {
                challenging += contribution;
            }
        }

        return composeScore(supportive, challenging, aspects.size(), 0);
    }

    private int computeMetricScore(
            MetricSpec metric,
            ModuleSpec module,
            List<CrossAspect> aspects,
            PartySignal personA,
            PartySignal personB
    ) {
        if (aspects == null || aspects.isEmpty()) {
            return clampScore(50 + metric.baseOffset(), 20, 95);
        }

        double supportive = 0.0d;
        double challenging = 0.0d;
        int matched = 0;

        for (CrossAspect aspect : aspects) {
            double relevance = metric.relevance(aspect);
            if (relevance <= 0.0d) {
                continue;
            }

            matched++;
            double houseWeight = houseWeight(metric, aspect, personA, personB);
            double contribution = aspectTypeWeight(module.key(), aspect)
                    * orbDecay(aspect, module.orbK())
                    * relevance
                    * houseWeight
                    * pairResonanceWeight(module.key(), aspect);

            if (aspect.harmonious()) {
                supportive += contribution;
            } else {
                challenging += contribution;
            }
        }

        if (matched == 0) {
            return clampScore(50 + metric.baseOffset(), 20, 95);
        }

        return composeScore(supportive, challenging, matched, metric.baseOffset());
    }

    private int computeModuleOverall(ModuleSpec spec, List<SynastryDisplayMetric> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return 50;
        }

        List<Integer> scores = metrics.stream()
                .map(SynastryDisplayMetric::score)
                .filter(Objects::nonNull)
                .map(score -> clampScore(score, 20, 95))
                .sorted()
                .toList();

        if (scores.isEmpty()) {
            return 50;
        }

        double avg = scores.stream().mapToInt(Integer::intValue).average().orElse(50.0d);
        double min = scores.getFirst();
        double max = scores.getLast();
        double lowerAvg = scores.stream()
                .limit(Math.max(2, scores.size() / 2))
                .mapToInt(Integer::intValue)
                .average()
                .orElse(avg);
        double upperAvg = scores.stream()
                .skip(Math.max(0, scores.size() - Math.max(2, scores.size() / 2)))
                .mapToInt(Integer::intValue)
                .average()
                .orElse(avg);

        double raw = switch (spec.key()) {
            case LOVE -> avg * 0.50d + upperAvg * 0.24d + max * 0.16d + min * 0.10d;
            case WORK -> avg * 0.44d + lowerAvg * 0.24d + min * 0.18d + upperAvg * 0.14d;
            case FRIEND -> avg * 0.52d + upperAvg * 0.18d + lowerAvg * 0.16d + max * 0.14d;
            case FAMILY -> avg * 0.48d + lowerAvg * 0.22d + min * 0.16d + upperAvg * 0.14d;
            case RIVAL -> avg * 0.42d + lowerAvg * 0.18d + upperAvg * 0.18d + max * 0.22d;
        };

        double signatureLift = switch (spec.key()) {
            case LOVE -> Math.max(0.0d, upperAvg - 78.0d) * 0.30d + Math.max(0.0d, max - 88.0d) * 0.20d;
            case WORK -> Math.max(0.0d, lowerAvg - 74.0d) * 0.18d + Math.max(0.0d, avg - 78.0d) * 0.20d;
            case FRIEND -> Math.max(0.0d, upperAvg - 76.0d) * 0.24d + Math.max(0.0d, avg - 80.0d) * 0.16d;
            case FAMILY -> Math.max(0.0d, upperAvg - 77.0d) * 0.22d + Math.max(0.0d, avg - 79.0d) * 0.16d;
            case RIVAL -> Math.max(0.0d, upperAvg - 74.0d) * 0.16d + Math.max(0.0d, max - 86.0d) * 0.14d;
        };
        double lowBandDrag = switch (spec.key()) {
            case LOVE -> Math.max(0.0d, 56.0d - lowerAvg) * 0.16d + Math.max(0.0d, 50.0d - min) * 0.18d;
            case WORK -> Math.max(0.0d, 54.0d - min) * 0.20d + Math.max(0.0d, 56.0d - lowerAvg) * 0.14d;
            case FRIEND -> Math.max(0.0d, 55.0d - lowerAvg) * 0.15d + Math.max(0.0d, 48.0d - min) * 0.12d;
            case FAMILY -> Math.max(0.0d, 55.0d - lowerAvg) * 0.18d + Math.max(0.0d, 49.0d - min) * 0.14d;
            case RIVAL -> Math.max(0.0d, 57.0d - lowerAvg) * 0.12d + Math.max(0.0d, 52.0d - min) * 0.16d;
        };
        double coherenceBonus = avg >= 78.0d && (max - min) <= 16.0d ? 2.0d : 0.0d;

        return normalizeScore(raw + signatureLift + coherenceBonus - lowBandDrag);
    }

    private int composeScore(double supportive, double challenging, int matched, int baseOffset) {
        double delta = supportive - challenging;
        double total = supportive + challenging;
        double dominance = total <= 0.0d ? 0.0d : delta / total;
        double densityFactor = 0.38d + 0.62d * Math.tanh(matched / 3.10d);
        double exactness = Math.tanh(total / (1.15d + matched * 0.08d));
        double directionalRange = (22.0d + Math.min(18.0d, matched * 2.20d)) * densityFactor;
        double convictionLift = Math.max(0.0d, Math.abs(dominance) - 0.30d) * (5.5d + matched * 0.30d);

        double score = 50.0d
                + dominance * directionalRange
                + Math.signum(delta) * exactness * (4.0d + matched * 0.45d)
                + Math.signum(delta) * convictionLift
                + baseOffset;

        if (supportive > challenging * 2.10d && matched >= 4) {
            score += 3.0d + Math.min(3.5d, (supportive - challenging) / 6.0d);
        } else if (challenging > supportive * 1.95d && matched >= 4) {
            score -= 3.0d + Math.min(3.5d, (challenging - supportive) / 6.0d);
        }

        if (matched <= 2) {
            score = 50.0d + (score - 50.0d) * 0.82d;
        }

        return normalizeScore(score);
    }

    private double baseAspectWeight(CrossAspect aspect) {
        if (aspect == null || aspect.aspectType() == null) {
            return 0.70d;
        }

        return switch (aspect.aspectType().toUpperCase(Locale.ROOT)) {
            case "TRINE" -> 1.45d;
            case "SEXTILE" -> 1.12d;
            case "CONJUNCTION" -> aspect.harmonious() ? 1.35d : 1.05d;
            case "SQUARE" -> 1.46d;
            case "OPPOSITION" -> 1.30d;
            default -> 0.80d;
        };
    }

    private double basePlanetWeight(CrossAspect aspect) {
        String left = normalizePlanet(aspect.userPlanet());
        String right = normalizePlanet(aspect.partnerPlanet());
        Set<String> core = Set.of("sun", "moon", "venus", "mars", "mercury", "jupiter", "saturn");
        boolean leftCore = core.contains(left);
        boolean rightCore = core.contains(right);
        if (leftCore && rightCore) return 1.16d;
        if (leftCore || rightCore) return 1.02d;
        return 0.86d;
    }

    private double baseResonanceWeight(CrossAspect aspect) {
        String left = normalizePlanet(aspect.userPlanet());
        String right = normalizePlanet(aspect.partnerPlanet());
        String aspectType = normalizeAspectType(aspect);

        if (aspect.harmonious()) {
            if (matchesPair(left, right, "venus", "mars") && isSoftOrConjunction(aspectType)) return 1.24d;
            if (matchesPair(left, right, "sun", "moon") && isSoftOrConjunction(aspectType)) return 1.20d;
            if (matchesPair(left, right, "moon", "moon") && isSoftOrConjunction(aspectType)) return 1.16d;
            if (matchesPair(left, right, "venus", "jupiter") && isSoftOrConjunction(aspectType)) return 1.12d;
            if (matchesPair(left, right, "moon", "jupiter") && isSoftOrConjunction(aspectType)) return 1.10d;
            if (matchesPair(left, right, "venus", "saturn") && isSoftOrConjunction(aspectType)) return 1.08d;
        } else {
            if (matchesPair(left, right, "mars", "saturn") && isHardAspect(aspectType)) return 1.26d;
            if (matchesPair(left, right, "moon", "pluto") && isHardAspect(aspectType)) return 1.24d;
            if (matchesPair(left, right, "venus", "uranus") && isHardAspect(aspectType)) return 1.18d;
            if (matchesPair(left, right, "sun", "saturn") && isHardAspect(aspectType)) return 1.16d;
            if (matchesPair(left, right, "mercury", "mars") && isHardAspect(aspectType)) return 1.14d;
        }
        return 1.0d;
    }

    private double aspectTypeWeight(ModuleKey module, CrossAspect aspect) {
        String aspectType = normalizeAspectType(aspect);

        return switch (module) {
            case LOVE -> switch (aspectType) {
                case "TRINE" -> 1.16d;
                case "SEXTILE" -> 0.92d;
                case "CONJUNCTION" -> 1.10d;
                case "SQUARE" -> 1.12d;
                case "OPPOSITION" -> 1.05d;
                default -> 0.74d;
            };
            case WORK -> switch (aspectType) {
                case "TRINE" -> 0.98d;
                case "SEXTILE" -> 0.90d;
                case "CONJUNCTION" -> 0.86d;
                case "SQUARE" -> 1.18d;
                case "OPPOSITION" -> 1.08d;
                default -> 0.74d;
            };
            case FRIEND -> switch (aspectType) {
                case "TRINE" -> 1.02d;
                case "SEXTILE" -> 0.95d;
                case "CONJUNCTION" -> 0.88d;
                case "SQUARE" -> 1.05d;
                case "OPPOSITION" -> 0.98d;
                default -> 0.72d;
            };
            case FAMILY -> switch (aspectType) {
                case "TRINE" -> 1.00d;
                case "SEXTILE" -> 0.86d;
                case "CONJUNCTION" -> 1.02d;
                case "SQUARE" -> 1.14d;
                case "OPPOSITION" -> 1.06d;
                default -> 0.72d;
            };
            case RIVAL -> switch (aspectType) {
                case "TRINE" -> 0.82d;
                case "SEXTILE" -> 0.78d;
                case "CONJUNCTION" -> 1.00d;
                case "SQUARE" -> 1.22d;
                case "OPPOSITION" -> 1.18d;
                default -> 0.76d;
            };
        };
    }

    private double pairResonanceWeight(ModuleKey module, CrossAspect aspect) {
        String left = normalizePlanet(aspect.userPlanet());
        String right = normalizePlanet(aspect.partnerPlanet());
        String aspectType = normalizeAspectType(aspect);

        return switch (module) {
            case LOVE -> {
                if (aspect.harmonious()) {
                    if (matchesPair(left, right, "venus", "mars") && isSoftOrConjunction(aspectType)) yield 1.34d;
                    if (matchesPair(left, right, "sun", "moon") && isSoftOrConjunction(aspectType)) yield 1.28d;
                    if (matchesPair(left, right, "moon", "moon") && isSoftOrConjunction(aspectType)) yield 1.20d;
                    if (matchesPair(left, right, "venus", "venus") && isSoftOrConjunction(aspectType)) yield 1.18d;
                    if (matchesPair(left, right, "venus", "jupiter") && isSoftOrConjunction(aspectType)) yield 1.16d;
                    if (matchesPair(left, right, "moon", "jupiter") && isSoftOrConjunction(aspectType)) yield 1.14d;
                } else if (isHardAspect(aspectType)) {
                    if (matchesPair(left, right, "mars", "saturn")) yield 1.30d;
                    if (matchesPair(left, right, "moon", "pluto")) yield 1.28d;
                    if (matchesPair(left, right, "venus", "uranus")) yield 1.22d;
                    if (matchesPair(left, right, "sun", "saturn")) yield 1.18d;
                    if (matchesPair(left, right, "mercury", "mars")) yield 1.18d;
                }
                yield 1.0d;
            }
            case WORK -> {
                if (aspect.harmonious()) {
                    if (matchesPair(left, right, "mercury", "saturn") && isSoftOrConjunction(aspectType)) yield 1.22d;
                    if (matchesPair(left, right, "mercury", "mercury") && isSoftOrConjunction(aspectType)) yield 1.18d;
                    if (matchesPair(left, right, "sun", "saturn") && isSoftOrConjunction(aspectType)) yield 1.14d;
                    if (matchesPair(left, right, "mars", "saturn") && isSoftOrConjunction(aspectType)) yield 1.12d;
                } else if (isHardAspect(aspectType)) {
                    if (matchesPair(left, right, "mercury", "mars")) yield 1.28d;
                    if (matchesPair(left, right, "mercury", "saturn")) yield 1.22d;
                    if (matchesPair(left, right, "sun", "uranus")) yield 1.14d;
                    if (matchesPair(left, right, "mars", "saturn")) yield 1.18d;
                }
                yield 1.0d;
            }
            case FRIEND -> {
                if (aspect.harmonious()) {
                    if (matchesPair(left, right, "mercury", "mercury") && isSoftOrConjunction(aspectType)) yield 1.18d;
                    if (matchesPair(left, right, "moon", "moon") && isSoftOrConjunction(aspectType)) yield 1.16d;
                    if (matchesPair(left, right, "venus", "jupiter") && isSoftOrConjunction(aspectType)) yield 1.14d;
                } else if (isHardAspect(aspectType)) {
                    if (matchesPair(left, right, "mercury", "mars")) yield 1.18d;
                    if (matchesPair(left, right, "moon", "saturn")) yield 1.16d;
                }
                yield 1.0d;
            }
            case FAMILY -> {
                if (aspect.harmonious()) {
                    if (matchesPair(left, right, "moon", "moon") && isSoftOrConjunction(aspectType)) yield 1.20d;
                    if (matchesPair(left, right, "moon", "venus") && isSoftOrConjunction(aspectType)) yield 1.16d;
                    if (matchesPair(left, right, "moon", "saturn") && isSoftOrConjunction(aspectType)) yield 1.12d;
                } else if (isHardAspect(aspectType)) {
                    if (matchesPair(left, right, "moon", "pluto")) yield 1.20d;
                    if (matchesPair(left, right, "moon", "saturn")) yield 1.18d;
                    if (matchesPair(left, right, "mars", "moon")) yield 1.14d;
                }
                yield 1.0d;
            }
            case RIVAL -> {
                if (aspect.harmonious()) {
                    if (matchesPair(left, right, "mars", "saturn") && isSoftOrConjunction(aspectType)) yield 1.12d;
                    if (matchesPair(left, right, "mercury", "pluto") && isSoftOrConjunction(aspectType)) yield 1.10d;
                } else if (isHardAspect(aspectType)) {
                    if (matchesPair(left, right, "mars", "pluto")) yield 1.24d;
                    if (matchesPair(left, right, "mars", "saturn")) yield 1.20d;
                    if (matchesPair(left, right, "sun", "mars")) yield 1.16d;
                    if (matchesPair(left, right, "mercury", "pluto")) yield 1.14d;
                }
                yield 1.0d;
            }
        };
    }

    private double orbDecay(CrossAspect aspect, double orbK) {
        double orb = aspect == null ? 0.0d : Math.max(0.0d, aspect.orb());
        return Math.max(0.28d, Math.exp(-orbK * orb));
    }

    private double houseWeight(
            MetricSpec metric,
            CrossAspect aspect,
            PartySignal personA,
            PartySignal personB
    ) {
        if (metric.relevantHouses().isEmpty()) {
            return 1.0d;
        }

        int matched = 0;
        Integer leftHouse = personA.planetHouses().get(normalizePlanet(aspect.userPlanet()));
        Integer rightHouse = personB.planetHouses().get(normalizePlanet(aspect.partnerPlanet()));
        if (leftHouse != null && metric.relevantHouses().contains(leftHouse)) {
            matched++;
        }
        if (rightHouse != null && metric.relevantHouses().contains(rightHouse)) {
            matched++;
        }

        if (matched == 2) return 1.20d;
        if (matched == 1) return 1.08d;
        if (personA.hasHouseData() || personB.hasHouseData()) return 0.96d;
        return 1.0d;
    }

    private ConfidenceSnapshot computeConfidence(PartySignal personA, PartySignal personB, List<CrossAspect> aspects) {
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

        String confidenceLabel = confidence >= CONFIDENCE_HIGH_THRESHOLD
                ? "Yüksek"
                : confidence >= CONFIDENCE_MEDIUM_THRESHOLD ? "Orta" : "Sınırlı";

        String dataQuality = confidence >= CONFIDENCE_HIGH_THRESHOLD
                ? "high"
                : confidence >= CONFIDENCE_MEDIUM_THRESHOLD ? "medium" : "limited";

        return new ConfidenceSnapshot(
                confidence,
                confidenceLabel,
                birthTimeCertainty,
                houseReliability,
                dataQuality
        );
    }

    private String resolveDistributionWarning(
            Map<String, SynastryModuleScore> moduleScores,
            ConfidenceSnapshot confidence
    ) {
        if (confidence.houseReliability() < HOUSE_PRECISION_LIMITED_THRESHOLD
                || confidence.birthTimeCertainty() < BIRTH_TIME_LIMITED_THRESHOLD) {
            return "house_precision_limited";
        }

        List<Integer> scores = moduleScores.values().stream()
                .map(SynastryModuleScore::overall)
                .filter(Objects::nonNull)
                .toList();
        if (scores.size() < 3) {
            return null;
        }

        double avg = scores.stream().mapToInt(Integer::intValue).average().orElse(50.0d);
        double variance = scores.stream()
                .mapToDouble(score -> Math.pow(score - avg, 2))
                .average()
                .orElse(0.0d);
        int min = scores.stream().mapToInt(Integer::intValue).min().orElse(50);
        int max = scores.stream().mapToInt(Integer::intValue).max().orElse(50);

        if (Math.sqrt(variance) < 6.0d && (max - min) <= 14) {
            return "scores_clustered";
        }
        return null;
    }

    private String resolveMissingBirthTimeImpact(ConfidenceSnapshot confidence) {
        if (confidence.birthTimeCertainty() >= BIRTH_TIME_LIMITED_THRESHOLD
                && confidence.houseReliability() >= HOUSE_PRECISION_LIMITED_THRESHOLD) {
            return null;
        }
        return "Doğum saati netliği sınırlı olduğunda özellikle ev bazlı yorumlar daha temkinli değerlendirilir.";
    }

    private Integer metricScore(SynastryScoreSnapshot snapshot, String moduleKey, String metricId) {
        if (snapshot == null || snapshot.moduleScores() == null) {
            return null;
        }

        SynastryModuleScore moduleScore = snapshot.moduleScores().get(moduleKey);
        if (moduleScore == null || moduleScore.metrics() == null) {
            return null;
        }

        return moduleScore.metrics().stream()
                .filter(metric -> Objects.equals(metric.id(), metricId))
                .map(SynastryDisplayMetric::score)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private Integer averageScores(Integer... scores) {
        List<Integer> values = Arrays.stream(scores)
                .filter(Objects::nonNull)
                .map(score -> clampScore(score, 20, 95))
                .toList();
        if (values.isEmpty()) {
            return null;
        }
        return clampScore((int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(50.0d)), 20, 95);
    }

    private ModuleSpec moduleSpec(ModuleKey module) {
        return switch (module) {
            case LOVE -> new ModuleSpec(
                    ModuleKey.LOVE,
                    List.of(
                            metric("love.attraction", "Çekim", kp("venus", "mars", "sun"), sp("moon", "pluto", "jupiter"), hs(5, 7, 8), 3),
                            metric("love.emotionalBond", "Duygusal Bağ", kp("moon", "venus", "sun"), sp("saturn", "jupiter"), hs(4, 7, 8), 2),
                            metric("love.trust", "Güven", kp("saturn", "moon", "venus"), sp("sun", "mercury", "jupiter"), hs(2, 4, 7, 8), -1),
                            metric("love.romanticFlow", "Romantik Akış", kp("venus", "moon", "neptune"), sp("sun", "jupiter"), hs(5, 7, 12), 1),
                            metric("love.proximityBalance", "Yakınlık Dengesi", kp("moon", "uranus", "venus"), sp("saturn", "mars"), hs(1, 7, 11), -2)
                    ),
                    0.24d
            );
            case WORK -> new ModuleSpec(
                    ModuleKey.WORK,
                    List.of(
                            metric("work.planFit", "Plan Uyumu", kp("saturn", "mercury", "sun"), sp("mars", "jupiter"), hs(6, 10, 3), 2),
                            metric("work.communication", "İletişim Netliği", kp("mercury", "sun"), sp("saturn", "jupiter", "moon"), hs(3, 6, 10), 1),
                            metric("work.execution", "Görev Tamamlama", kp("mars", "saturn", "sun"), sp("mercury", "jupiter"), hs(6, 10), 0),
                            metric("work.conflict", "Çatışma Yönetimi", kp("saturn", "mars", "mercury"), sp("moon", "sun"), hs(6, 10, 1), -2),
                            metric("work.decisionSpeed", "Karar Hızı Uyumu", kp("mercury", "mars", "saturn"), sp("sun", "jupiter"), hs(3, 6, 10), -1)
                    ),
                    0.18d
            );
            case FRIEND -> new ModuleSpec(
                    ModuleKey.FRIEND,
                    List.of(
                            metric("friend.chatFlow", "Sohbet Akışı", kp("mercury", "jupiter", "moon"), sp("sun", "venus"), hs(3, 11), 2),
                            metric("friend.funRhythm", "Eğlence Ritmi", kp("jupiter", "venus", "uranus"), sp("moon", "mars"), hs(5, 11), 1),
                            metric("friend.support", "Destek Gücü", kp("moon", "venus", "jupiter"), sp("saturn", "sun"), hs(4, 11), 0),
                            metric("friend.loyalty", "Sadakat", kp("saturn", "moon", "sun"), sp("venus", "jupiter"), hs(11, 4, 7), -1),
                            metric("friend.boundaryRespect", "Sınır Saygısı", kp("saturn", "uranus", "mercury"), sp("moon", "sun"), hs(1, 11, 3), -2)
                    ),
                    0.14d
            );
            case FAMILY -> new ModuleSpec(
                    ModuleKey.FAMILY,
                    List.of(
                            metric("family.bond", "Bağlılık", kp("moon", "venus", "sun"), sp("saturn", "jupiter"), hs(4, 7), 1),
                            metric("family.sensitivity", "Hassasiyet Yönetimi", kp("moon", "neptune", "venus"), sp("saturn", "mercury"), hs(4, 12, 7), -1),
                            metric("family.responsibility", "Sorumluluk Paylaşımı", kp("saturn", "sun", "mars"), sp("mercury", "moon"), hs(4, 6, 10), 0),
                            metric("family.boundary", "Sınır Dengesi", kp("saturn", "uranus", "moon"), sp("venus", "sun"), hs(1, 4, 7), -2),
                            metric("family.repair", "Kriz Sonrası Onarım", kp("moon", "saturn", "mercury"), sp("venus", "jupiter"), hs(4, 8, 3), -1)
                    ),
                    0.20d
            );
            case RIVAL -> new ModuleSpec(
                    ModuleKey.RIVAL,
                    List.of(
                            metric("rival.strategy", "Stratejik Okuma", kp("mercury", "saturn", "pluto"), sp("sun", "jupiter"), hs(1, 6, 10), 2),
                            metric("rival.tempo", "Tempo Dayanıklılığı", kp("mars", "saturn", "sun"), sp("pluto", "jupiter"), hs(1, 6, 10), 0),
                            metric("rival.trigger", "Tetiklenme Kontrolü", kp("mars", "pluto", "moon"), sp("saturn", "mercury"), hs(1, 8, 6), -2),
                            metric("rival.fairPlay", "Adil Oyun", kp("saturn", "jupiter", "sun"), sp("venus", "mercury"), hs(1, 7, 10), -1),
                            metric("rival.pressure", "Baskı Altı Performans", kp("saturn", "mars", "sun"), sp("pluto", "mercury"), hs(6, 10, 1), -1)
                    ),
                    0.24d
            );
        };
    }

    private static MetricSpec metric(
            String id,
            String title,
            Set<String> keyPlanets,
            Set<String> supportPlanets,
            Set<Integer> relevantHouses,
            int baseOffset
    ) {
        return new MetricSpec(id, title, keyPlanets, supportPlanets, relevantHouses, baseOffset);
    }

    private static Set<String> kp(String... planets) {
        return Arrays.stream(planets)
                .map(CanonicalCompatibilityScoringService::normalizePlanet)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<String> sp(String... planets) {
        return kp(planets);
    }

    private static Set<Integer> hs(Integer... houses) {
        return new LinkedHashSet<>(Arrays.asList(houses));
    }

    private static String normalizePlanet(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeAspectType(CrossAspect aspect) {
        return aspect == null || aspect.aspectType() == null
                ? ""
                : aspect.aspectType().toUpperCase(Locale.ROOT);
    }

    private static boolean matchesPair(String left, String right, String first, String second) {
        return (Objects.equals(left, first) && Objects.equals(right, second))
                || (Objects.equals(left, second) && Objects.equals(right, first));
    }

    private static boolean isSoftOrConjunction(String aspectType) {
        return switch (aspectType) {
            case "TRINE", "SEXTILE", "CONJUNCTION" -> true;
            default -> false;
        };
    }

    private static boolean isHardAspect(String aspectType) {
        return switch (aspectType) {
            case "SQUARE", "OPPOSITION" -> true;
            default -> false;
        };
    }

    private static int clampScore(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static int normalizeScore(double raw) {
        double adjusted = raw;
        if (raw > 84.0d) {
            adjusted = 84.0d + 11.0d * (1.0d - Math.exp(-(raw - 84.0d) / 12.0d));
        } else if (raw < 31.0d) {
            adjusted = 31.0d - 11.0d * (1.0d - Math.exp(-(31.0d - raw) / 10.0d));
        }
        return clampScore((int) Math.round(adjusted), 20, 95);
    }

    private static double clamp01(double value) {
        return Math.max(0.0d, Math.min(1.0d, value));
    }

    private static double round2(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }
}
