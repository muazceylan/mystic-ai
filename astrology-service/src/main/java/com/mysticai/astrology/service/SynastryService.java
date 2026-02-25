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

import java.util.*;
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

    private static final String AI_EXCHANGE = "ai.exchange";
    private static final String AI_REQUESTS_ROUTING_KEY = "ai.request";

    // ─── Planets considered key for each relationship type ─────────────────────
    private static final Set<String> LOVE_KEY_PLANETS     = Set.of("Venus", "Mars", "Moon", "Sun");
    private static final Set<String> BUSINESS_KEY_PLANETS = Set.of("Saturn", "Mercury", "Jupiter", "Sun");
    private static final Set<String> FRIEND_KEY_PLANETS   = Set.of("Jupiter", "Sun", "Moon", "Mercury", "Venus");
    private static final Set<String> FAMILY_KEY_PLANETS   = Set.of("Moon", "Sun", "Saturn", "Venus", "Jupiter");
    private static final Set<String> RIVAL_KEY_PLANETS    = Set.of("Mars", "Saturn", "Pluto", "Sun");

    private enum PartyType { USER, SAVED_PERSON }

    private record PartyContext(
            Long id,
            PartyType type,
            String name,
            String sunSign,
            String moonSign,
            String risingSign,
            List<PlanetPosition> planets
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
                ? buildUserParty(req.userId())
                : buildSavedParty(req.personAId());
        PartyContext personB = buildSavedParty(personBId);

        if (personA.type() == PartyType.SAVED_PERSON && Objects.equals(personA.id(), personB.id())) {
            throw new IllegalArgumentException("Person A and Person B cannot be the same saved person");
        }

        // Calculate cross-chart aspects
        List<CrossAspect> crossAspects = calculateCrossAspects(personA.planets(), personB.planets());

        int quickHarmonyScore = computeHarmonyScore(crossAspects, req.relationshipType());

        // Persist initial Synastry with an immediate rule-based score.
        // AI may refine/override this later when async interpretation completes.
        String crossAspectsJson;
        try {
            crossAspectsJson = objectMapper.writeValueAsString(crossAspects);
        } catch (JsonProcessingException e) {
            crossAspectsJson = "[]";
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
                .crossAspectsJson(crossAspectsJson)
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
        int score = computeHarmonyScore(crossAspects, "LOVE");
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
                "Kural tabanlı hızlı skor: orb yakınlığı ve ana gezegen etkileşimleri ağırlıklandırılır; AI yorumu geldikçe anlatım derinleşir."
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

        CrossAspect lead = computed.topAspects().isEmpty() ? null : computed.topAspects().get(0);
        String leadPhrase = lead == null
                ? ""
                : String.format(" Öne çıkan etkileşim: %s - %s %s (orb %.1f°).",
                lead.userPlanet(), lead.partnerPlanet(), lead.aspectTurkish(), lead.orb());

        String dynamicLine = switch (tone) {
            case "DESTEKLEYICI" -> "Bu alanda akış doğal; ilişkiyi besleyen davranışları bilinçli tekrar etmek büyük fark yaratır.";
            case "ZORLAYICI" -> "Bu alanda sürtünme gelişim fırsatı taşır; tempo ve sınırlar konuşuldukça denge artar.";
            default -> "Bu alanda hem uyum hem gerilim birlikte çalışıyor; doğru zamanda doğru yaklaşım sonucu belirler.";
        };

        String summary = String.format(
                "%s %d destekleyici, %d zorlayıcı açı tespit edildi.%s %s",
                baselineSummary,
                computed.harmoniousCount(),
                computed.challengingCount(),
                leadPhrase,
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
            payload.put("userSunSign",       personA.sunSign());
            payload.put("userMoonSign",      personA.moonSign());
            payload.put("userRisingSign",    personA.risingSign());
            payload.put("userPlanetsText",   userPlanetsText);
            payload.put("partnerName",       personBName);
            payload.put("partnerSunSign",    personB.sunSign());
            payload.put("partnerMoonSign",   personB.moonSign());
            payload.put("partnerRisingSign", personB.risingSign());
            payload.put("partnerPlanetsText", partnerPlanetsText);
            payload.put("allAspectsText",    allAspectsText);
            payload.put("totalAspects",      aspects.size());
            if (req.locale() != null) {
                payload.put("locale", req.locale());
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

    private PartyContext buildUserParty(Long userId) {
        NatalChart userChart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No natal chart found for userId=" + userId + ". Calculate your chart first."));

        List<PlanetPosition> planets = parsePlanets(userChart.getPlanetPositionsJson());
        return new PartyContext(
                null,
                PartyType.USER,
                userChart.getName() != null && !userChart.getName().isBlank() ? userChart.getName() : "Sen",
                userChart.getSunSign(),
                userChart.getMoonSign(),
                userChart.getRisingSign(),
                planets
        );
    }

    private PartyContext buildRealUserParty(Long userId, String fallbackName) {
        NatalChart chart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDesc(userId.toString())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No natal chart found for userId=" + userId + ". Calculate chart first."));

        String resolvedName = (chart.getName() != null && !chart.getName().isBlank())
                ? chart.getName()
                : fallbackName;

        return new PartyContext(
                userId,
                PartyType.USER,
                resolvedName,
                chart.getSunSign(),
                chart.getMoonSign(),
                chart.getRisingSign(),
                parsePlanets(chart.getPlanetPositionsJson())
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

        return new PartyContext(
                person.getId(),
                PartyType.SAVED_PERSON,
                person.getName(),
                person.getSunSign(),
                person.getMoonSign(),
                person.getRisingSign(),
                parsePlanets(person.getPlanetPositionsJson())
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
                    .findFirstByUserIdOrderByCalculatedAtDesc(synastry.getUserId().toString())
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

    private SynastryResponse mapToResponse(
            Synastry s,
            PartySummary personA,
            PartySummary personB,
            List<CrossAspect> aspects
    ) {
        List<String> strengths  = parseStringList(s.getStrengthsJson());
        List<String> challenges = parseStringList(s.getChallengesJson());
        SynastryScoreBreakdown scoreBreakdown = buildScoreBreakdown(aspects, s.getRelationshipType(), s.getHarmonyScore());
        List<SynastryAnalysisSection> analysisSections = buildAnalysisSections(aspects, s.getRelationshipType());
        return new SynastryResponse(
                s.getId(), s.getUserId(), s.getSavedPersonId(),
                personB != null ? personB.name() : null,
                s.getRelationshipType(), s.getHarmonyScore(),
                aspects, s.getHarmonyInsight(), strengths, challenges,
                s.getKeyWarning(), s.getCosmicAdvice(), s.getStatus(),
                s.getCalculatedAt(),
                personA != null ? personA.id() : s.getPersonAId(),
                personB != null ? personB.id() : (s.getPersonBId() != null ? s.getPersonBId() : s.getSavedPersonId()),
                (personA != null ? personA.type() : resolvePartyType(s.getPersonAType(), PartyType.USER)).name(),
                (personB != null ? personB.type() : resolvePartyType(s.getPersonBType(), PartyType.SAVED_PERSON)).name(),
                personA != null ? personA.name() : null,
                personB != null ? personB.name() : null,
                scoreBreakdown,
                analysisSections
        );
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
}
