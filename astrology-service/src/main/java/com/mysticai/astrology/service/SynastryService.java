package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.dto.PlanetaryAspect.AspectType;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.SavedPerson;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SavedPersonRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SynastryService {

    private final SynastryRepository synastryRepository;
    private final NatalChartRepository natalChartRepository;
    private final SavedPersonRepository savedPersonRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final CanonicalCompatibilityScoringService canonicalCompatibilityScoringService;

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";
    private static final String LEGACY_SCORING_VERSION = "synastry-legacy";

    // ─── Planets considered key for each relationship type ─────────────────────
    private static final Set<String> LOVE_KEY_PLANETS     = Set.of("Venus", "Mars", "Moon", "Sun");
    private static final Set<String> BUSINESS_KEY_PLANETS = Set.of("Saturn", "Mercury", "Jupiter", "Sun");
    private static final Set<String> FRIEND_KEY_PLANETS   = Set.of("Jupiter", "Sun", "Moon", "Mercury", "Venus");
    private static final Set<String> FAMILY_KEY_PLANETS   = Set.of("Moon", "Sun", "Saturn", "Venus", "Jupiter");
    private static final Set<String> RIVAL_KEY_PLANETS    = Set.of("Mars", "Saturn", "Pluto", "Sun");
    private static final Pattern CANNED_HARMONY_INSIGHT_PATTERN = Pattern.compile(
            "(?is).*bu\\s+iki\\s+haritan[ıi]n\\s+uyumu\\s*\\d+\\s*puan.*güçlü\\s+bir\\s+çekim\\s+yarat[ıi]yor.*"
    );

    private enum PartyType { USER, SAVED_PERSON }

    private record PartyContext(
            Long id,
            PartyType type,
            String name,
            String gender,
            String sunSign,
            String moonSign,
            String risingSign,
            List<PlanetPosition> planets,
            Map<String, Integer> planetHouses,
            boolean hasHouseData,
            boolean hasPlanetData,
            double birthTimeCertainty
    ) {}

    private record PartySummary(
            Long id,
            PartyType type,
            String name
    ) {}

    public record QuickSynastryScore(
            int harmonyScore,
            String summary,
            int totalAspects,
            long harmoniousAspects,
            long challengingAspects
    ) {}

    @Transactional
    public SynastryResponse analyze(SynastryRequest req) {
        Long personBId = req.personBId() != null ? req.personBId() : req.savedPersonId();
        log.info("Synastry analysis: userId={}, personAId={}, personBId={}, legacySavedPersonId={}, type={}",
                req.userId(), req.personAId(), personBId, req.savedPersonId(), req.relationshipType());

        if (personBId == null) {
            throw new IllegalArgumentException("personBId (or savedPersonId) is required");
        }

        PartyContext personA = req.personAId() == null
                ? buildUserParty(req.userId(), req.userGender())
                : buildSavedParty(req.personAId());
        PartyContext personB = buildSavedParty(personBId);

        if (personA.type() == PartyType.SAVED_PERSON && Objects.equals(personA.id(), personB.id())) {
            throw new IllegalArgumentException("Person A and Person B cannot be the same saved person");
        }

        // Calculate cross-chart aspects
        List<CrossAspect> crossAspects = calculateCrossAspects(personA.planets(), personB.planets());

        SynastryScoreSnapshot scoreSnapshot = canonicalCompatibilityScoringService.buildSnapshot(
                crossAspects,
                toPartySignal(personA),
                toPartySignal(personB)
        );
        Integer activeModuleScore = canonicalCompatibilityScoringService.resolveModuleOverall(scoreSnapshot, req.relationshipType());
        int quickHarmonyScore = activeModuleScore != null
                ? activeModuleScore
                : computeHarmonyScore(crossAspects, req.relationshipType());

        // Persist initial Synastry with an immediate rule-based score.
        // AI may refine/override this later when async interpretation completes.
        String crossAspectsJson;
        String scoreSnapshotJson;
        try {
            crossAspectsJson = objectMapper.writeValueAsString(crossAspects);
            scoreSnapshotJson = objectMapper.writeValueAsString(scoreSnapshot);
        } catch (JsonProcessingException e) {
            crossAspectsJson = "[]";
            scoreSnapshotJson = null;
        }

        UUID correlationId = UUID.randomUUID();
        Synastry synastry = Synastry.builder()
                .userId(req.userId())
                .savedPersonId(personB.id()) // legacy compatibility alias for personB
                .personAId(personA.type() == PartyType.SAVED_PERSON ? personA.id() : null)
                .personBId(personB.id())
                .personAType(personA.type().name())
                .personBType(personB.type().name())
                .relationshipType(req.relationshipType())
                .harmonyScore(quickHarmonyScore)
                .baseHarmonyScore(scoreSnapshot.baseHarmonyScore())
                .crossAspectsJson(crossAspectsJson)
                .scoreSnapshotJson(scoreSnapshotJson)
                .scoringVersion(scoreSnapshot.scoringVersion())
                .status("PENDING")
                .correlationId(correlationId)
                .build();
        synastry = synastryRepository.save(synastry);

        // Build AI payload and send asynchronously
        sendToAiOrchestrator(synastry, personA, personB, crossAspects, req);

        return mapToResponse(
                synastry,
                new PartySummary(personA.id(), personA.type(), personA.name()),
                new PartySummary(personB.id(), personB.type(), personB.name()),
                crossAspects
        );
    }

    public SynastryResponse getById(Long id) {
        Synastry s = synastryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Synastry not found: " + id));
        List<CrossAspect> aspects = parseCrossAspects(s.getCrossAspectsJson());
        return mapToResponse(s, resolvePartySummary(s, true), resolvePartySummary(s, false), aspects);
    }

    public List<SynastryResponse> getByUser(Long userId) {
        return synastryRepository.findAllByUserIdOrderByCalculatedAtDesc(userId)
                .stream()
                .map(s -> mapToResponse(
                        s,
                        resolvePartySummary(s, true),
                        resolvePartySummary(s, false),
                        parseCrossAspects(s.getCrossAspectsJson())
                ))
                .toList();
    }

    /**
     * Fast, synchronous score computation for user-to-user discovery use cases.
     * Reuses the same cross-aspect engine as companion synastry but skips persistence + AI generation.
     */
    public QuickSynastryScore computeQuickUserToUserLoveScore(Long viewerUserId, Long candidateUserId) {
        if (viewerUserId == null || candidateUserId == null) {
            throw new IllegalArgumentException("viewerUserId and candidateUserId are required");
        }
        if (Objects.equals(viewerUserId, candidateUserId)) {
            throw new IllegalArgumentException("viewerUserId and candidateUserId cannot be the same");
        }

        PartyContext viewer = buildRealUserParty(viewerUserId, "Kullanıcı");
        PartyContext candidate = buildRealUserParty(candidateUserId, "Aday");

        List<CrossAspect> crossAspects = calculateCrossAspects(viewer.planets(), candidate.planets());
        SynastryScoreSnapshot scoreSnapshot = canonicalCompatibilityScoringService.buildSnapshot(
                crossAspects,
                toPartySignal(viewer),
                toPartySignal(candidate)
        );
        Integer loveScore = canonicalCompatibilityScoringService.resolveModuleOverall(scoreSnapshot, "LOVE");
        int score = loveScore != null ? loveScore : computeHarmonyScore(crossAspects, "LOVE");
        long harmonious = crossAspects.stream().filter(CrossAspect::harmonious).count();
        long challenging = Math.max(0, crossAspects.size() - harmonious);

        String summary = buildQuickScoreSummary(score, viewer, candidate, crossAspects, harmonious, challenging);
        return new QuickSynastryScore(score, summary, crossAspects.size(), harmonious, challenging);
    }

    // ─── Cross-aspect calculation ───────────────────────────────────────────────

    private List<CrossAspect> calculateCrossAspects(
            List<PlanetPosition> userPlanets,
            List<PlanetPosition> partnerPlanets) {

        List<CrossAspect> aspects = new ArrayList<>();

        for (PlanetPosition u : userPlanets) {
            for (PlanetPosition p : partnerPlanets) {
                double angle = Math.abs(u.absoluteLongitude() - p.absoluteLongitude());
                if (angle > 180) angle = 360 - angle;

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        boolean harmonious = isHarmonious(type, u.planet(), p.planet());
                        aspects.add(new CrossAspect(
                                u.planet(), p.planet(),
                                type.name(), type.getSymbol(), type.getTurkishName(),
                                Math.round(angle * 100.0) / 100.0,
                                Math.round(orb * 100.0) / 100.0,
                                harmonious
                        ));
                        break;
                    }
                }
            }
        }

        return aspects;
    }

    /**
     * Whether an aspect between two planets is harmonious.
     * Trine and Sextile are always harmonious.
     * Conjunction is harmonious unless both planets are traditionally malefic.
     * Square and Opposition are always challenging.
     */
    private boolean isHarmonious(AspectType type, String planet1, String planet2) {
        return switch (type) {
            case TRINE, SEXTILE -> true;
            case CONJUNCTION    -> !isMalefic(planet1) || !isMalefic(planet2);
            case SQUARE, OPPOSITION -> false;
        };
    }

    private boolean isMalefic(String planet) {
        return planet.equals("Mars") || planet.equals("Saturn") || planet.equals("Pluto");
    }

    // ─── Harmony score ──────────────────────────────────────────────────────────

    private int computeHarmonyScore(List<CrossAspect> aspects, String type) {
        Set<String> keyPlanets = switch (type.toUpperCase()) {
            case "LOVE"       -> LOVE_KEY_PLANETS;
            case "BUSINESS"   -> BUSINESS_KEY_PLANETS;
            case "FRIENDSHIP" -> FRIEND_KEY_PLANETS;
            case "FAMILY"     -> FAMILY_KEY_PLANETS;
            case "RIVAL"      -> RIVAL_KEY_PLANETS;
            default           -> Set.of("Sun", "Moon", "Venus", "Mars");
        };

        double score = 50.0;

        for (CrossAspect ca : aspects) {
            boolean isKey = keyPlanets.contains(ca.userPlanet())
                         || keyPlanets.contains(ca.partnerPlanet());
            double weight = isKey ? 1.5 : 0.5;

            score += switch (ca.aspectType()) {
                case "TRINE"       ->  5.0 * weight;
                case "SEXTILE"     ->  3.0 * weight;
                case "CONJUNCTION" ->  ca.harmonious() ? 4.0 * weight : -2.0 * weight;
                case "SQUARE"      -> -3.0 * weight;
                case "OPPOSITION"  -> -2.5 * weight;
                default            ->  0.0;
            };
        }

        // For RIVAL type — invert: high conflict means high rival score
        if ("RIVAL".equalsIgnoreCase(type)) {
            score = 100 - score;
        }

        return (int) Math.max(0, Math.min(100, Math.round(score)));
    }

    private record SectionComputation(
            int score,
            long harmoniousCount,
            long challengingCount,
            List<CrossAspect> topAspects
    ) {}

    private SynastryScoreBreakdown buildScoreBreakdown(
            List<CrossAspect> aspects,
            String relationshipType,
            Integer persistedHarmonyScore
    ) {
        int overall = persistedHarmonyScore != null
                ? Math.max(0, Math.min(100, persistedHarmonyScore))
                : computeHarmonyScore(aspects, relationshipType != null ? relationshipType : "FRIENDSHIP");

        int love = computeFocusedScore(
                aspects,
                Set.of("Venus", "Mars"),
                Set.of("Moon", "Sun"),
                "LOVE"
        );
        int communication = computeFocusedScore(
                aspects,
                Set.of("Mercury", "Jupiter"),
                Set.of("Moon", "Sun"),
                "FRIENDSHIP"
        );
        int spiritual = computeFocusedScore(
                aspects,
                Set.of("Moon", "Saturn", "Pluto", "NorthNode"),
                Set.of("Sun", "Neptune", "Chiron"),
                "FAMILY"
        );

        return new SynastryScoreBreakdown(
                overall,
                love,
                communication,
                spiritual,
                null
        );
    }

    private int computeFocusedScore(
            List<CrossAspect> aspects,
            Set<String> primaryPlanets,
            Set<String> supportPlanets,
            String fallbackType
    ) {
        if (aspects == null || aspects.isEmpty()) {
            return 50;
        }

        double score = 50.0;
        int matched = 0;

        for (CrossAspect aspect : aspects) {
            boolean userPrimary = primaryPlanets.contains(aspect.userPlanet());
            boolean partnerPrimary = primaryPlanets.contains(aspect.partnerPlanet());
            boolean userSupport = supportPlanets.contains(aspect.userPlanet());
            boolean partnerSupport = supportPlanets.contains(aspect.partnerPlanet());
            if (!(userPrimary || partnerPrimary || userSupport || partnerSupport)) {
                continue;
            }
            matched++;

            double base = switch (aspect.aspectType()) {
                case "TRINE" -> 8.0;
                case "SEXTILE" -> 6.0;
                case "CONJUNCTION" -> aspect.harmonious() ? 7.0 : -4.5;
                case "SQUARE" -> -7.0;
                case "OPPOSITION" -> -6.0;
                default -> 0.0;
            };

            double focusWeight;
            if (userPrimary && partnerPrimary) {
                focusWeight = 1.75;
            } else if ((userPrimary || partnerPrimary) && (userSupport || partnerSupport)) {
                focusWeight = 1.4;
            } else if (userPrimary || partnerPrimary) {
                focusWeight = 1.2;
            } else {
                focusWeight = 0.9;
            }

            double orbAllowance = getAspectOrbAllowance(aspect.aspectType());
            double exactness = Math.max(0.4, 1.15 - (Math.max(0.0, aspect.orb()) / Math.max(1.0, orbAllowance)));

            score += base * focusWeight * exactness;
        }

        if (matched == 0) {
            return computeHarmonyScore(aspects, fallbackType);
        }

        if (matched < 3) score -= 2.0;
        if (matched > 8) score += 2.0;

        return (int) Math.max(0, Math.min(100, Math.round(score)));
    }

    private double getAspectOrbAllowance(String aspectType) {
        return switch (aspectType) {
            case "CONJUNCTION", "OPPOSITION" -> 8.0;
            case "TRINE", "SQUARE" -> 7.0;
            case "SEXTILE" -> 6.0;
            default -> 6.0;
        };
    }

    private List<SynastryDisplayMetric> buildDisplayMetrics(
            List<CrossAspect> aspects,
            String relationshipType,
            SynastryScoreBreakdown scoreBreakdown
    ) {
        List<CrossAspect> safeAspects = aspects == null ? List.of() : aspects;
        String type = relationshipType == null ? "FRIENDSHIP" : relationshipType.toUpperCase(Locale.ROOT);

        int overall = scoreBreakdown != null && scoreBreakdown.overall() != null
                ? Math.max(0, Math.min(100, scoreBreakdown.overall()))
                : computeHarmonyScore(safeAspects, type);

        int trust = computeFocusedScore(
                safeAspects,
                Set.of("Moon", "Saturn", "Venus"),
                Set.of("Sun", "Jupiter", "Mercury", "NorthNode"),
                "FAMILY"
        );
        int support = computeFocusedScore(
                safeAspects,
                Set.of("Moon", "Jupiter", "Venus", "Sun"),
                Set.of("Mercury", "Saturn"),
                "FAMILY"
        );
        int passion = computeFocusedScore(
                safeAspects,
                Set.of("Mars", "Venus", "Pluto"),
                Set.of("Sun", "Moon"),
                "LOVE"
        );
        int fun = computeFocusedScore(
                safeAspects,
                Set.of("Jupiter", "Venus", "Uranus", "Mars"),
                Set.of("Mercury", "Sun", "Moon"),
                "FRIENDSHIP"
        );
        int cooperation = computeFocusedScore(
                safeAspects,
                Set.of("Saturn", "Sun", "Jupiter", "Venus"),
                Set.of("Mercury", "Moon"),
                "BUSINESS"
        );
        int strategy = computeFocusedScore(
                safeAspects,
                Set.of("Mercury", "Saturn", "Pluto", "Jupiter"),
                Set.of("Sun", "Mars"),
                "BUSINESS"
        );
        int compassion = computeFocusedScore(
                safeAspects,
                Set.of("Moon", "Venus", "Neptune"),
                Set.of("Sun", "Jupiter", "Saturn"),
                "FAMILY"
        );
        int solidarity = computeFocusedScore(
                safeAspects,
                Set.of("Saturn", "Moon", "Sun", "Jupiter"),
                Set.of("Venus", "Mercury"),
                "FAMILY"
        );
        int competition = computeActivationScore(
                safeAspects,
                Set.of("Mars", "Sun", "Pluto"),
                Set.of("Saturn", "Mercury")
        );
        int focus = computeFocusedScore(
                safeAspects,
                Set.of("Sun", "Saturn", "Mars"),
                Set.of("Mercury", "Pluto"),
                "BUSINESS"
        );
        int tension = computeTensionScore(
                safeAspects,
                Set.of("Mars", "Saturn", "Pluto", "Mercury", "Sun", "Uranus")
        );

        if (scoreBreakdown != null) {
            // Blend canonical breakdown scores into relationship-facing metrics for stability.
            if (scoreBreakdown.communication() != null) {
                strategy = averageRounded(strategy, scoreBreakdown.communication());
            }
            if (scoreBreakdown.spiritualBond() != null) {
                trust = averageRounded(trust, scoreBreakdown.spiritualBond());
                support = averageRounded(support, scoreBreakdown.spiritualBond());
                compassion = averageRounded(compassion, scoreBreakdown.spiritualBond());
            }
            if (scoreBreakdown.love() != null) {
                passion = averageRounded(passion, scoreBreakdown.love());
                fun = averageRounded(fun, scoreBreakdown.love());
            }
        }

        return switch (type) {
            case "LOVE" -> List.of(
                    metric("love", "Aşk", scoreBreakdown != null ? coalesceScore(scoreBreakdown.love(), passion) : passion),
                    metric("communication", "İletişim", scoreBreakdown != null ? coalesceScore(scoreBreakdown.communication(), strategy) : strategy),
                    metric("trust", "Güven", trust),
                    metric("passion", "Tutku", passion)
            );
            case "FRIENDSHIP" -> List.of(
                    metric("fun", "Eğlence", fun),
                    metric("communication", "İletişim", scoreBreakdown != null ? coalesceScore(scoreBreakdown.communication(), strategy) : strategy),
                    metric("trust", "Güven", trust),
                    metric("support", "Destek", support)
            );
            case "BUSINESS" -> List.of(
                    metric("cooperation", "İş Birliği", cooperation),
                    metric("communication", "İletişim", scoreBreakdown != null ? coalesceScore(scoreBreakdown.communication(), strategy) : strategy),
                    metric("strategy", "Strateji", strategy),
                    metric("trust", "Güven", trust)
            );
            case "FAMILY" -> List.of(
                    metric("compassion", "Şefkat", compassion),
                    metric("communication", "İletişim", scoreBreakdown != null ? coalesceScore(scoreBreakdown.communication(), strategy) : strategy),
                    metric("trust", "Güven", trust),
                    metric("solidarity", "Dayanışma", solidarity)
            );
            case "RIVAL" -> List.of(
                    metric("competition", "Rekabet", competition),
                    metric("strategy", "Strateji", strategy),
                    metric("focus", "Odak", focus),
                    metric("tension", "Gerilim", tension)
            );
            default -> List.of(
                    metric("overall", "Genel", overall),
                    metric("communication", "İletişim", scoreBreakdown != null ? coalesceScore(scoreBreakdown.communication(), strategy) : strategy),
                    metric("trust", "Güven", trust),
                    metric("support", "Destek", support)
            );
        };
    }

    private SynastryDisplayMetric metric(String id, String label, int score) {
        return new SynastryDisplayMetric(id, label, Math.max(0, Math.min(100, score)));
    }

    private int coalesceScore(Integer preferred, int fallback) {
        return preferred == null ? fallback : Math.max(0, Math.min(100, preferred));
    }

    private int averageRounded(int a, int b) {
        return (int) Math.max(0, Math.min(100, Math.round((a + b) / 2.0)));
    }

    private int computeActivationScore(
            List<CrossAspect> aspects,
            Set<String> primaryPlanets,
            Set<String> supportPlanets
    ) {
        if (aspects == null || aspects.isEmpty()) return 50;

        double score = 42.0;
        int matched = 0;
        for (CrossAspect aspect : aspects) {
            boolean userPrimary = primaryPlanets.contains(aspect.userPlanet());
            boolean partnerPrimary = primaryPlanets.contains(aspect.partnerPlanet());
            boolean userSupport = supportPlanets.contains(aspect.userPlanet());
            boolean partnerSupport = supportPlanets.contains(aspect.partnerPlanet());
            if (!(userPrimary || partnerPrimary || userSupport || partnerSupport)) continue;
            matched++;

            double base = switch (aspect.aspectType()) {
                case "CONJUNCTION" -> 10.0;
                case "OPPOSITION" -> 9.0;
                case "SQUARE" -> 8.5;
                case "TRINE" -> 6.5;
                case "SEXTILE" -> 5.5;
                default -> 2.0;
            };
            double weight = (userPrimary || partnerPrimary) && (userSupport || partnerSupport) ? 1.2
                    : (userPrimary && partnerPrimary) ? 1.35
                    : (userPrimary || partnerPrimary) ? 1.1 : 0.9;
            double exactness = Math.max(0.4, 1.15 - (Math.max(0.0, aspect.orb()) / Math.max(1.0, getAspectOrbAllowance(aspect.aspectType()))));
            score += base * weight * exactness;
        }

        if (matched == 0) return 50;
        if (matched > 8) score += 4;
        return (int) Math.max(0, Math.min(100, Math.round(score)));
    }

    private int computeTensionScore(List<CrossAspect> aspects, Set<String> focusPlanets) {
        if (aspects == null || aspects.isEmpty()) return 35;
        double score = 28.0;
        int matched = 0;

        for (CrossAspect aspect : aspects) {
            if (!(focusPlanets.contains(aspect.userPlanet()) || focusPlanets.contains(aspect.partnerPlanet()))) {
                continue;
            }
            matched++;
            double base = switch (aspect.aspectType()) {
                case "SQUARE" -> 11.0;
                case "OPPOSITION" -> 10.0;
                case "CONJUNCTION" -> aspect.harmonious() ? 5.0 : 8.5;
                case "TRINE" -> 2.5;
                case "SEXTILE" -> 2.0;
                default -> 1.5;
            };
            if (aspect.harmonious()) base *= 0.65;

            double exactness = Math.max(0.35, 1.15 - (Math.max(0.0, aspect.orb()) / Math.max(1.0, getAspectOrbAllowance(aspect.aspectType()))));
            score += base * exactness;
        }

        if (matched == 0) return 35;
        if (matched > 10) score += 4;
        return (int) Math.max(0, Math.min(100, Math.round(score)));
    }

    private List<SynastryAnalysisSection> buildAnalysisSections(List<CrossAspect> aspects, String relationshipType) {
        if (aspects == null || aspects.isEmpty()) {
            return List.of(
                    new SynastryAnalysisSection(
                            "overview",
                            "Kozmik Eşleşme Özeti",
                            "Yeterli çapraz açı verisi bulunamadı",
                            null,
                            "Bu eşleşmede yorum yapabilmek için daha fazla gezegen kesişimi gerekiyor. Doğum saati ve konum doğruluğunu kontrol etmek faydalı olur.",
                            "NÖTR",
                            List.of()
                    )
            );
        }

        return List.of(
                buildSection(
                        "kader_bagi",
                        "Kader Bağı (Satürn / Karma)",
                        "Uzun vadeli dersler, sabır ve sorumluluk",
                        aspects,
                        ca -> hasAnyPlanet(ca, Set.of("Saturn", "NorthNode", "Pluto", "Moon")),
                        "Bu bağ size sabrı, sınır koymayı ve birlikte olgunlaşmayı öğretebilir."
                ),
                buildSection(
                        "tutku_enerji",
                        "Tutku ve Enerji (Mars / Plüton)",
                        "Çekim gücü, motivasyon ve güç dinamikleri",
                        aspects,
                        ca -> hasAnyPlanet(ca, Set.of("Mars", "Pluto", "Venus", "Sun")),
                        "Aranızdaki çekim yüksek olabilir; yoğun enerji doğru yönetilirse üretken bir bağa dönüşür."
                ),
                buildSection(
                        "zihinsel_uyum",
                        "Zihinsel Uyum (Merkür)",
                        "İletişim ritmi, anlama ve ortak perspektif",
                        aspects,
                        ca -> hasAnyPlanet(ca, Set.of("Mercury", "Jupiter", "Moon", "Sun")),
                        "İletişim tonu ilişkinin yönünü belirler; doğru dil kullanımı bu alanı hızla güçlendirir."
                ),
                buildSection(
                        "duygusal_akis",
                        "Duygusal Akış (Ay / Venüs)",
                        "Güvende hissetme, hassasiyet ve yakınlık dili",
                        aspects,
                        ca -> hasAnyPlanet(ca, Set.of("Moon", "Venus", "Sun", "Neptune")),
                        relationshipType != null && "LOVE".equalsIgnoreCase(relationshipType)
                                ? "Yakınlık dili ve duygusal güven bu ilişkide romantik uyumu doğrudan etkiler."
                                : "Duygusal güven ve hassas iletişim bu bağın istikrarını belirleyen ana katmandır."
                )
        );
    }

    private SynastryAnalysisSection buildSection(
            String id,
            String title,
            String subtitle,
            List<CrossAspect> allAspects,
            java.util.function.Predicate<CrossAspect> filter,
            String baselineSummary
    ) {
        List<CrossAspect> filtered = allAspects.stream().filter(filter).toList();
        if (filtered.isEmpty()) {
            return new SynastryAnalysisSection(
                    id,
                    title,
                    subtitle,
                    null,
                    baselineSummary + " Bu başlıkta güçlü bir açı yoğunluğu görünmüyor; etki daha çok genel ilişki dinamiğinden geliyor.",
                    "NÖTR",
                    List.of()
            );
        }

        SectionComputation computed = computeSection(filtered);
        String tone = computed.harmoniousCount() > computed.challengingCount()
                ? "DESTEKLEYICI"
                : computed.harmoniousCount() == computed.challengingCount() ? "DENGELI" : "ZORLAYICI";

        String dynamicLine = switch (tone) {
            case "DESTEKLEYICI" -> "Bu alanda akış doğal; ilişkiyi besleyen davranışları bilinçli tekrar etmek büyük fark yaratır.";
            case "ZORLAYICI" -> "Bu alandandaki tartışmalar gelişim fırsatı taşır; tempo ve sınırlar konuşuldukça denge artar.";
            default -> "Bu alanda hem uyum hem gerilim birlikte çalışıyor; doğru zamanda doğru yaklaşım sonucu belirler.";
        };

        String balanceLine = computed.harmoniousCount() > computed.challengingCount()
                ? "İki tarafın da bu başlıkta birbirini destekleme kapasitesi daha baskın görünüyor."
                : computed.harmoniousCount() < computed.challengingCount()
                ? "Bu başlıkta tetiklenmeler daha yoğun; net sınırlar ve açık iletişim ilişkiyi rahatlatır."
                : "Bu başlıkta etki dengede; yaklaşım biçiminiz sonucu olumluya da zorlayıcıya da taşıyabilir.";

        String summary = String.format(
                "%s %d destekleyici, %d zorlayıcı açı tespit edildi. %s %s",
                baselineSummary,
                computed.harmoniousCount(),
                computed.challengingCount(),
                balanceLine,
                dynamicLine
        ).trim();

        return new SynastryAnalysisSection(
                id,
                title,
                subtitle,
                computed.score(),
                summary,
                tone,
                computed.topAspects()
        );
    }

    private SectionComputation computeSection(List<CrossAspect> aspects) {
        long harmonious = aspects.stream().filter(CrossAspect::harmonious).count();
        long challenging = Math.max(0, aspects.size() - harmonious);
        int score = computeHarmonyScore(aspects, "FRIENDSHIP");

        List<CrossAspect> topAspects = aspects.stream()
                .sorted(Comparator
                        .comparingDouble((CrossAspect ca) -> ca.orb())
                        .thenComparing(ca -> ca.harmonious() ? 0 : 1))
                .limit(6)
                .toList();
        return new SectionComputation(score, harmonious, challenging, topAspects);
    }

    private boolean hasAnyPlanet(CrossAspect ca, Set<String> planets) {
        return planets.contains(ca.userPlanet()) || planets.contains(ca.partnerPlanet());
    }

    // ─── AI Orchestrator ────────────────────────────────────────────────────────

    private void sendToAiOrchestrator(
            Synastry synastry,
            PartyContext personA,
            PartyContext personB,
            List<CrossAspect> aspects,
            SynastryRequest req
    ) {
        try {
            String personAName = safePartyName(personA.name(), personA.type(), true);
            String personBName = safePartyName(personB.name(), personB.type(), false);
            String userPlanetsText    = formatPlanetsText(personA.planets());
            String partnerPlanetsText = formatPlanetsText(personB.planets());

            // All cross-aspects as readable text
            String allAspectsText = aspects.stream()
                    .map(a -> String.format("%s(%s) %s %s(%s) — orb: %.1f°",
                            a.userPlanet(), personAName, a.aspectTurkish(),
                            a.partnerPlanet(), personBName, a.orb()))
                    .collect(Collectors.joining("\n"));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("synastryId",        synastry.getId());
            payload.put("relationshipType",  req.relationshipType());
            payload.put("userName",          personAName);
            if (personA.gender() != null && !personA.gender().isBlank()) {
                payload.put("userGender", personA.gender());
            }
            payload.put("userSunSign",       personA.sunSign());
            payload.put("userMoonSign",      personA.moonSign());
            payload.put("userRisingSign",    personA.risingSign());
            payload.put("userPlanetsText",   userPlanetsText);
            payload.put("partnerName",       personBName);
            if (personB.gender() != null && !personB.gender().isBlank()) {
                payload.put("partnerGender", personB.gender());
            }
            payload.put("partnerSunSign",    personB.sunSign());
            payload.put("partnerMoonSign",   personB.moonSign());
            payload.put("partnerRisingSign", personB.risingSign());
            payload.put("partnerPlanetsText", partnerPlanetsText);
            payload.put("allAspectsText",    allAspectsText);
            payload.put("totalAspects",      aspects.size());
            payload.put("baseHarmonyScore",  synastry.getBaseHarmonyScore());
            payload.put("selectedModuleScore", synastry.getHarmonyScore());
            payload.put("locale", "tr");
            if (req.locale() != null && !req.locale().isBlank()) {
                payload.put("requestedLocale", req.locale());
            }

            String payloadJson = objectMapper.writeValueAsString(payload);

            AiAnalysisEvent eventWithCorr = new AiAnalysisEvent(
                    synastry.getCorrelationId(),
                    req.userId(),
                    payloadJson,
                    AiAnalysisEvent.SourceService.ASTROLOGY,
                    AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS,
                    java.time.LocalDateTime.now()
            );

            rabbitTemplate.convertAndSend(AI_EXCHANGE, AI_REQUESTS_ROUTING_KEY, eventWithCorr);
            log.info("Sent synastry {} to AI Orchestrator", synastry.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to send synastry to AI Orchestrator", e);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private PartyContext buildUserParty(Long userId, String userGenderOverride) {
        NatalChart userChart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Natal chart not found for userId=" + userId + ". Calculate your chart first."));

        List<PlanetPosition> planets = parsePlanets(userChart.getPlanetPositionsJson());
        return new PartyContext(
                null,
                PartyType.USER,
                userChart.getName() != null && !userChart.getName().isBlank() ? userChart.getName() : "Sen",
                normalizeGender(userGenderOverride),
                userChart.getSunSign(),
                userChart.getMoonSign(),
                userChart.getRisingSign(),
                planets,
                extractPlanetHouses(planets),
                hasJsonData(userChart.getHousePlacementsJson()),
                !planets.isEmpty(),
                resolveBirthTimeCertainty(userChart.getBirthTime(), 0.45d, 0.70d, 0.88d)
        );
    }

    private PartyContext buildRealUserParty(Long userId, String fallbackName) {
        NatalChart chart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Natal chart not found for userId=" + userId + ". Calculate chart first."));

        String resolvedName = (chart.getName() != null && !chart.getName().isBlank())
                ? chart.getName()
                : fallbackName;
        List<PlanetPosition> planets = parsePlanets(chart.getPlanetPositionsJson());

        return new PartyContext(
                userId,
                PartyType.USER,
                resolvedName,
                null,
                chart.getSunSign(),
                chart.getMoonSign(),
                chart.getRisingSign(),
                planets,
                extractPlanetHouses(planets),
                hasJsonData(chart.getHousePlacementsJson()),
                !planets.isEmpty(),
                resolveBirthTimeCertainty(chart.getBirthTime(), 0.45d, 0.70d, 0.88d)
        );
    }

    private String buildQuickScoreSummary(
            int score,
            PartyContext viewer,
            PartyContext candidate,
            List<CrossAspect> aspects,
            long harmonious,
            long challenging
    ) {
        String level = score >= 80 ? "Yüksek" : score >= 65 ? "Orta" : "Düşük";
        String aspectHint = aspects.isEmpty()
                ? "Aspekt sayısı az; veri kalite kontrolü önerilir."
                : String.format("%d uyumlu / %d zorlayıcı ana kesişim görüldü.", harmonious, challenging);

        String signLine = String.format(
                "%s (%s güneş) ↔ %s (%s güneş)",
                safePartyName(viewer.name(), viewer.type(), true),
                viewer.sunSign() != null ? viewer.sunSign() : "Bilinmiyor",
                safePartyName(candidate.name(), candidate.type(), false),
                candidate.sunSign() != null ? candidate.sunSign() : "Bilinmiyor"
        );

        return String.format("%s uyum (%d/100). %s %s", level, score, signLine, aspectHint);
    }

    private PartyContext buildSavedParty(Long personId) {
        SavedPerson person = savedPersonRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Saved person not found: " + personId));
        List<PlanetPosition> planets = parsePlanets(person.getPlanetPositionsJson());

        return new PartyContext(
                person.getId(),
                PartyType.SAVED_PERSON,
                person.getName(),
                normalizeGender(person.getGender()),
                person.getSunSign(),
                person.getMoonSign(),
                person.getRisingSign(),
                planets,
                extractPlanetHouses(planets),
                hasJsonData(person.getHousePlacementsJson()),
                !planets.isEmpty(),
                resolveBirthTimeCertainty(person.getBirthTime(), 0.40d, 0.66d, 0.84d)
        );
    }

    private PartySummary resolvePartySummary(Synastry synastry, boolean isPersonA) {
        PartyType defaultType = isPersonA ? PartyType.USER : PartyType.SAVED_PERSON;
        String rawType = isPersonA ? synastry.getPersonAType() : synastry.getPersonBType();
        PartyType type = resolvePartyType(rawType, defaultType);
        Long id = isPersonA
                ? synastry.getPersonAId()
                : (synastry.getPersonBId() != null ? synastry.getPersonBId() : synastry.getSavedPersonId());

        if (type == PartyType.USER) {
            String name = natalChartRepository
                    .findFirstByUserIdOrderByCalculatedAtDescIdDesc(synastry.getUserId().toString())
                    .map(c -> c.getName() != null && !c.getName().isBlank() ? c.getName() : "Sen")
                    .orElse("Sen");
            return new PartySummary(null, PartyType.USER, name);
        }

        String name = savedPersonRepository.findById(id != null ? id : -1L)
                .map(SavedPerson::getName)
                .orElse(isPersonA ? "Kişi A" : "Kişi B");
        return new PartySummary(id, PartyType.SAVED_PERSON, name);
    }

    private PartyType resolvePartyType(String raw, PartyType fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return PartyType.valueOf(raw);
        } catch (IllegalArgumentException ignored) {
            return fallback;
        }
    }

    private String safePartyName(String name, PartyType type, boolean isPersonA) {
        if (name != null && !name.isBlank()) return name;
        if (type == PartyType.USER) return "Sen";
        return isPersonA ? "Kişi A" : "Kişi B";
    }

    private String normalizeGender(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Formats a list of planet positions as a human-readable table for the AI prompt.
     * e.g. "Sun          Aries    15.22° — 10. Ev"
     */
    private String formatPlanetsText(List<PlanetPosition> planets) {
        if (planets == null || planets.isEmpty()) return "Veri yok";
        return planets.stream()
                .map(p -> String.format("%-15s %-12s %5.2f° — %2d. Ev%s",
                        p.planet(), p.sign(), p.degree(), p.house(),
                        p.retrograde() ? " ℞" : ""))
                .collect(Collectors.joining("\n"));
    }

    private List<PlanetPosition> parsePlanets(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, PlanetPosition.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse planet positions JSON", e);
            return List.of();
        }
    }

    private List<CrossAspect> parseCrossAspects(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, CrossAspect.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private SynastryScoreSnapshot parseScoreSnapshot(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, SynastryScoreSnapshot.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private SynastryResponse mapToResponse(
            Synastry s,
            PartySummary personA,
            PartySummary personB,
            List<CrossAspect> aspects
    ) {
        List<String> strengths  = parseStringList(s.getStrengthsJson());
        List<String> challenges = parseStringList(s.getChallengesJson());
        SynastryScoreSnapshot scoreSnapshot = resolveScoreSnapshot(s, aspects);
        Integer activeHarmonyScore = canonicalCompatibilityScoringService.resolveModuleOverall(scoreSnapshot, s.getRelationshipType());
        int resolvedHarmonyScore = activeHarmonyScore != null
                ? activeHarmonyScore
                : (s.getHarmonyScore() != null ? s.getHarmonyScore() : computeHarmonyScore(aspects, s.getRelationshipType()));
        Integer resolvedBaseHarmonyScore = scoreSnapshot != null && scoreSnapshot.baseHarmonyScore() != null
                ? scoreSnapshot.baseHarmonyScore()
                : (s.getBaseHarmonyScore() != null ? s.getBaseHarmonyScore() : computeHarmonyScore(aspects, "FRIENDSHIP"));
        SynastryScoreBreakdown scoreBreakdown = buildCanonicalScoreBreakdown(
                scoreSnapshot,
                resolvedBaseHarmonyScore,
                aspects,
                s.getRelationshipType()
        );
        List<SynastryAnalysisSection> analysisSections = buildAnalysisSections(aspects, s.getRelationshipType());
        List<SynastryDisplayMetric> displayMetrics = resolveDisplayMetrics(
                scoreSnapshot,
                s.getRelationshipType(),
                aspects,
                scoreBreakdown
        );
        String normalizedInsight = sanitizeHarmonyInsightForResponse(
                s.getHarmonyInsight(),
                resolvedHarmonyScore,
                s.getRelationshipType(),
                personA,
                personB
        );
        return new SynastryResponse(
                s.getId(), s.getUserId(), s.getSavedPersonId(),
                personB != null ? personB.name() : null,
                s.getRelationshipType(), resolvedHarmonyScore, resolvedBaseHarmonyScore,
                aspects, normalizedInsight, strengths, challenges,
                s.getKeyWarning(), s.getCosmicAdvice(), s.getStatus(),
                s.getCalculatedAt(),
                personA != null ? personA.id() : s.getPersonAId(),
                personB != null ? personB.id() : (s.getPersonBId() != null ? s.getPersonBId() : s.getSavedPersonId()),
                (personA != null ? personA.type() : resolvePartyType(s.getPersonAType(), PartyType.USER)).name(),
                (personB != null ? personB.type() : resolvePartyType(s.getPersonBType(), PartyType.SAVED_PERSON)).name(),
                personA != null ? personA.name() : null,
                personB != null ? personB.name() : null,
                scoreSnapshot != null
                        ? scoreSnapshot.scoringVersion()
                        : (s.getScoringVersion() != null && !s.getScoringVersion().isBlank()
                        ? s.getScoringVersion()
                        : LEGACY_SCORING_VERSION),
                scoreSnapshot != null && scoreSnapshot.moduleScores() != null ? scoreSnapshot.moduleScores() : Map.of(),
                scoreBreakdown,
                analysisSections,
                displayMetrics
        );
    }

    private CanonicalCompatibilityScoringService.PartySignal toPartySignal(PartyContext context) {
        if (context == null) {
            return CanonicalCompatibilityScoringService.PartySignal.empty();
        }
        return new CanonicalCompatibilityScoringService.PartySignal(
                context.planetHouses(),
                context.hasHouseData(),
                context.hasPlanetData(),
                context.birthTimeCertainty()
        );
    }

    private CanonicalCompatibilityScoringService.PartySignal resolvePartySignal(Synastry synastry, boolean isPersonA) {
        PartyType fallbackType = isPersonA ? PartyType.USER : PartyType.SAVED_PERSON;
        PartyType resolvedType = resolvePartyType(isPersonA ? synastry.getPersonAType() : synastry.getPersonBType(), fallbackType);

        if (resolvedType == PartyType.USER) {
            String userId = synastry.getUserId() == null ? null : synastry.getUserId().toString();
            if (userId == null) {
                return CanonicalCompatibilityScoringService.PartySignal.empty();
            }

            return natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId)
                    .map(chart -> {
                        List<PlanetPosition> planets = parsePlanets(chart.getPlanetPositionsJson());
                        return new CanonicalCompatibilityScoringService.PartySignal(
                                extractPlanetHouses(planets),
                                hasJsonData(chart.getHousePlacementsJson()),
                                !planets.isEmpty(),
                                resolveBirthTimeCertainty(chart.getBirthTime(), 0.45d, 0.70d, 0.88d)
                        );
                    })
                    .orElse(CanonicalCompatibilityScoringService.PartySignal.empty());
        }

        Long personId = isPersonA
                ? synastry.getPersonAId()
                : (synastry.getPersonBId() != null ? synastry.getPersonBId() : synastry.getSavedPersonId());
        if (personId == null) {
            return CanonicalCompatibilityScoringService.PartySignal.empty();
        }

        return savedPersonRepository.findById(personId)
                .map(person -> {
                    List<PlanetPosition> planets = parsePlanets(person.getPlanetPositionsJson());
                    return new CanonicalCompatibilityScoringService.PartySignal(
                            extractPlanetHouses(planets),
                            hasJsonData(person.getHousePlacementsJson()),
                            !planets.isEmpty(),
                            resolveBirthTimeCertainty(person.getBirthTime(), 0.40d, 0.66d, 0.84d)
                    );
                })
                .orElse(CanonicalCompatibilityScoringService.PartySignal.empty());
    }

    private SynastryScoreSnapshot resolveScoreSnapshot(Synastry synastry, List<CrossAspect> aspects) {
        SynastryScoreSnapshot parsed = parseScoreSnapshot(synastry.getScoreSnapshotJson());
        if (parsed != null && parsed.moduleScores() != null && !parsed.moduleScores().isEmpty()) {
            return parsed;
        }
        return null;
    }

    private SynastryScoreBreakdown buildCanonicalScoreBreakdown(
            SynastryScoreSnapshot scoreSnapshot,
            Integer baseHarmonyScore,
            List<CrossAspect> aspects,
            String relationshipType
    ) {
        if (scoreSnapshot == null) {
            return buildScoreBreakdown(aspects, relationshipType, baseHarmonyScore);
        }

        Integer love = canonicalCompatibilityScoringService.resolveModuleOverall(scoreSnapshot, "LOVE");
        Integer communication = canonicalCompatibilityScoringService.resolveCompositeCommunication(scoreSnapshot);
        Integer spiritualBond = canonicalCompatibilityScoringService.resolveCompositeSpiritualBond(scoreSnapshot);

        return new SynastryScoreBreakdown(
                baseHarmonyScore != null ? Math.max(0, Math.min(100, baseHarmonyScore)) : null,
                love,
                communication,
                spiritualBond,
                scoreSnapshot.scoringVersion()
        );
    }

    private List<SynastryDisplayMetric> resolveDisplayMetrics(
            SynastryScoreSnapshot scoreSnapshot,
            String relationshipType,
            List<CrossAspect> aspects,
            SynastryScoreBreakdown scoreBreakdown
    ) {
        if (scoreSnapshot != null && scoreSnapshot.moduleScores() != null) {
            String moduleKey = switch ((relationshipType == null ? "" : relationshipType).toUpperCase(Locale.ROOT)) {
                case "BUSINESS" -> "WORK";
                case "FRIENDSHIP" -> "FRIEND";
                case "LOVE" -> "LOVE";
                case "WORK" -> "WORK";
                case "FRIEND" -> "FRIEND";
                case "FAMILY" -> "FAMILY";
                case "RIVAL" -> "RIVAL";
                default -> "LOVE";
            };
            SynastryModuleScore moduleScore = scoreSnapshot.moduleScores().get(moduleKey);
            if (moduleScore != null && moduleScore.metrics() != null && !moduleScore.metrics().isEmpty()) {
                return moduleScore.metrics();
            }
        }

        return buildDisplayMetrics(aspects, relationshipType, scoreBreakdown);
    }

    private String sanitizeHarmonyInsightForResponse(
            String insight,
            Integer harmonyScore,
            String relationshipType,
            PartySummary personA,
            PartySummary personB
    ) {
        String normalized = insight == null ? "" : insight.trim();
        if (!normalized.isBlank() && !CANNED_HARMONY_INSIGHT_PATTERN.matcher(normalized).matches()) {
            return normalized;
        }
        return buildResponseFallbackInsight(harmonyScore, relationshipType, personA, personB);
    }

    private String buildResponseFallbackInsight(
            Integer harmonyScore,
            String relationshipType,
            PartySummary personA,
            PartySummary personB
    ) {
        int score = harmonyScore == null ? 50 : Math.max(0, Math.min(100, harmonyScore));
        String relation = switch ((relationshipType == null ? "" : relationshipType).toUpperCase(Locale.ROOT)) {
            case "LOVE" -> "aşk";
            case "BUSINESS" -> "iş ortaklığı";
            case "FRIENDSHIP" -> "arkadaşlık";
            case "FAMILY" -> "aile bağı";
            case "RIVAL" -> "rekabet";
            default -> "ilişki";
        };
        String personAName = personA != null && personA.name() != null && !personA.name().isBlank()
                ? personA.name()
                : "Kişi A";
        String personBName = personB != null && personB.name() != null && !personB.name().isBlank()
                ? personB.name()
                : "Kişi B";

        return "%s ve %s arasında %s odağında %d puanlık bir uyum görünüyor. "
                .formatted(personAName, personBName, relation, score)
                + "Güçlü başlıkları koruyup zorlayıcı alanlarda iletişim ritmini netleştirmek ilişkiyi dengeler.";
    }

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private Map<String, Integer> extractPlanetHouses(List<PlanetPosition> planets) {
        if (planets == null || planets.isEmpty()) {
            return Map.of();
        }

        Map<String, Integer> houses = new LinkedHashMap<>();
        for (PlanetPosition planet : planets) {
            if (planet == null || planet.planet() == null || planet.planet().isBlank() || planet.house() <= 0) {
                continue;
            }
            houses.put(planet.planet().trim().toLowerCase(Locale.ROOT), planet.house());
        }
        return houses;
    }

    private boolean hasJsonData(String json) {
        return json != null
                && !json.isBlank()
                && !Objects.equals(json.trim(), "{}")
                && !Objects.equals(json.trim(), "[]");
    }

    private double resolveBirthTimeCertainty(LocalTime birthTime, double missingValue, double noonValue, double exactValue) {
        if (birthTime == null) {
            return missingValue;
        }
        if (LocalTime.NOON.equals(birthTime)) {
            return noonValue;
        }
        return exactValue;
    }
}
