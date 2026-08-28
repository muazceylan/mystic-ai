package com.mysticai.astrology.service.natal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.NatalPortraitCache;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.NatalPortraitCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Produces the structured natal interpretation the Haritam screen renders.
 *
 * <p>The pipeline is deliberately one-directional: the deterministic engine calculates, the
 * normalizer flattens, the model interprets, the validator checks the model's claims back against
 * the calculation, and only then does anything reach a cache or a screen. The model is an
 * interpreter at every step and a source of chart facts at none of them.</p>
 *
 * <p>Failure is expected rather than exceptional. A rejected generation is retried once with the
 * validator's own complaint fed back as correction context; a second rejection falls through to
 * {@link NatalPortraitFallbackComposer}, which builds a chart-specific portrait with no model
 * involved. The caller therefore always gets a portrait — never an error state.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NatalPortraitService {

    /**
     * Bump this whenever the prompt, the contract or the composer changes in a way that should
     * invalidate what users have already been shown. It is part of the cache key.
     */
    public static final String CONTRACT_VERSION = "natal_interpretation_v2";

    private final NatalChartRepository natalChartRepository;
    private final NatalPortraitCacheRepository portraitRepository;
    private final NatalChartNormalizer normalizer;
    private final NatalPortraitAiClient aiClient;
    private final NatalPortraitValidator validator;
    private final NatalPortraitSanitizer sanitizer;
    private final NatalPortraitFallbackComposer fallbackComposer;
    private final ObjectMapper objectMapper;

    public record PortraitResult(NatalPortrait portrait, boolean fromCache) {}

    /** Answer to a "Haritama Sor" question, with the placements it was grounded in. */
    public record AskResult(String answer, List<NatalPortrait.Evidence> evidence, boolean answerable) {}

    // ------------------------------------------------------------------ read

    @Transactional
    public PortraitResult getPortrait(String userId, String locale, boolean forceRegenerate) {
        String normalizedLocale = normalizeLocale(locale);
        NatalChart chart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId)
                .orElseThrow(() -> new IllegalStateException("No natal chart found for user " + userId));

        String signature = chartSignature(chart);

        if (!forceRegenerate) {
            Optional<NatalPortraitCache> cached = portraitRepository
                    .findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                            userId, signature, CONTRACT_VERSION, normalizedLocale);
            if (cached.isPresent() && "READY".equals(cached.get().getStatus())) {
                NatalPortrait parsed = readPortrait(cached.get().getPortraitJson());
                if (parsed != null) {
                    return new PortraitResult(parsed, true);
                }
                log.warn("Cached natal portrait for user {} was unreadable; regenerating", userId);
            }
        }

        NormalizedNatalChart normalized = normalizeChart(chart, normalizedLocale);
        NatalPortrait portrait = generate(normalized, normalizedLocale);
        persist(userId, chart.getId(), signature, normalizedLocale, portrait);
        return new PortraitResult(portrait, false);
    }

    /** The factual chart context, exposed so the client can render "Haritamı Öğren" without a second call. */
    @Transactional(readOnly = true)
    public NormalizedNatalChart getNormalizedChart(String userId, String locale) {
        NatalChart chart = natalChartRepository
                .findFirstByUserIdOrderByCalculatedAtDescIdDesc(userId)
                .orElseThrow(() -> new IllegalStateException("No natal chart found for user " + userId));
        return normalizeChart(chart, normalizeLocale(locale));
    }

    // ------------------------------------------------------------------ generation

    /**
     * One generation attempt, one correction retry, then the deterministic path.
     *
     * <p>The retry is not a blind re-roll: the validator's rejection reasons are handed back to the
     * model verbatim, so a hallucinated house comes back as "you claimed Mars in house 4, the chart
     * has house 6" rather than as a vague instruction to try harder.</p>
     */
    private NatalPortrait generate(NormalizedNatalChart chart, String locale) {
        String correction = null;

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String raw = aiClient.generatePortrait(chart, locale, correction);
                NatalPortrait parsed = readPortrait(raw);
                if (parsed == null) {
                    correction = "Previous response was not valid JSON matching the contract.";
                    log.warn("Natal portrait attempt {} returned unparseable JSON for chart {}",
                            attempt, chart.chartId());
                    continue;
                }

                NatalPortrait sanitized = sanitizer.sanitize(parsed, locale, "AI");
                sanitized = fillMissingReadings(sanitized, chart, locale);
                NatalPortraitValidator.Result result = validator.validate(sanitized, chart);
                if (result.valid()) {
                    if (!result.warnings().isEmpty()) {
                        log.info("Natal portrait for chart {} accepted with warnings: {}",
                                chart.chartId(), result.warnings());
                    }
                    return sanitized;
                }

                correction = result.correctionSummary();
                log.warn("Natal portrait attempt {} rejected for chart {}: {}",
                        attempt, chart.chartId(), correction);
            } catch (Exception e) {
                log.warn("Natal portrait attempt {} failed for chart {}: {}",
                        attempt, chart.chartId(), e.getMessage());
                correction = "Previous attempt failed to return a usable response.";
            }
        }

        log.info("Falling back to deterministic natal portrait for chart {}", chart.chartId());
        return fallbackComposer.compose(chart, locale);
    }

    /**
     * Fills in any planet or house reading the model did not produce.
     *
     * <p>Asking for all twelve planets and all twelve houses in one generation would blow past a
     * sensible response length and cost, so the prompt asks for the placements that carry the most
     * weight. Everything it skips is composed deterministically here, which means every planet and
     * every house always has a reading — the detail sheets are never empty — while the tokens are
     * spent where they change what the user learns.</p>
     *
     * <p>Model-written readings always win; this only adds what is missing.</p>
     */
    private NatalPortrait fillMissingReadings(
            NatalPortrait portrait, NormalizedNatalChart chart, String locale) {

        NatalPortrait deterministic = fallbackComposer.compose(chart, locale);

        List<NatalPortrait.PlacementReading> planets = mergeById(
                portrait.planetReadings(),
                deterministic.planetReadings(),
                r -> r.planet() == null ? "" : r.planet().toLowerCase(Locale.ROOT));

        List<NatalPortrait.HouseReading> houses = mergeById(
                portrait.houseReadings(),
                deterministic.houseReadings(),
                r -> String.valueOf(r.houseNumber()));

        return new NatalPortrait(
                portrait.version(),
                portrait.locale(),
                portrait.source(),
                portrait.portrait(),
                portrait.bigThree(),
                portrait.aboutMe(),
                portrait.lifeAreas(),
                planets,
                houses,
                portrait.aspectStory());
    }

    /** Keeps every item the model produced, then appends the ones only the composer covered. */
    private <T> List<T> mergeById(
            List<T> preferred, List<T> supplemental, java.util.function.Function<T, String> keyOf) {
        java.util.LinkedHashMap<String, T> merged = new java.util.LinkedHashMap<>();
        if (supplemental != null) {
            supplemental.stream().filter(java.util.Objects::nonNull)
                    .forEach(item -> merged.put(keyOf.apply(item), item));
        }
        if (preferred != null) {
            preferred.stream().filter(java.util.Objects::nonNull)
                    .forEach(item -> merged.put(keyOf.apply(item), item));
        }
        return List.copyOf(merged.values());
    }

    // ------------------------------------------------------------------ ask

    /**
     * Answers a free-text question using only this user's chart.
     *
     * <p>Deliberately not a general chat endpoint: the model is given the normalized chart and told
     * that anything it cannot ground in those placements must be declined. When generation fails
     * entirely the caller gets {@code answerable=false} rather than an invented answer.</p>
     */
    @Transactional(readOnly = true)
    public AskResult ask(String userId, String locale, String question) {
        String normalizedLocale = normalizeLocale(locale);
        NormalizedNatalChart chart = getNormalizedChart(userId, normalizedLocale);
        try {
            String raw = aiClient.askChart(chart, normalizedLocale, question);
            AskPayload payload = objectMapper.readValue(stripCodeFence(raw), AskPayload.class);
            if (payload == null || payload.answer() == null || payload.answer().isBlank()) {
                return unanswerable(normalizedLocale);
            }

            // The answer's receipts go through the same hallucination guard as a portrait's.
            // A bad receipt costs the user their evidence chips, never the answer itself.
            List<NatalPortrait.Evidence> evidence =
                    payload.evidence() == null ? List.of() : payload.evidence();
            List<String> evidenceProblems = validator.validateEvidence(evidence, chart);
            if (!evidenceProblems.isEmpty()) {
                log.warn("Discarding chart answer evidence for user {}: {}", userId, evidenceProblems);
                evidence = List.of();
            }

            return new AskResult(payload.answer(), evidence,
                    payload.answerable() == null || payload.answerable());
        } catch (Exception e) {
            log.warn("Chart question failed for user {}: {}", userId, e.getMessage());
            return unanswerable(normalizedLocale);
        }
    }

    private AskResult unanswerable(String locale) {
        boolean en = locale.startsWith("en");
        return new AskResult(
                en
                        ? "I could not read an answer from your chart right now. Please try again in a moment."
                        : "Şu anda haritandan bir cevap okuyamadım. Birazdan tekrar dener misin?",
                List.of(), false);
    }

    private record AskPayload(String answer, Boolean answerable, List<NatalPortrait.Evidence> evidence) {}

    // ------------------------------------------------------------------ persistence

    private void persist(String userId, Long chartId, String signature, String locale, NatalPortrait portrait) {
        try {
            String json = objectMapper.writeValueAsString(portrait);
            NatalPortraitCache row = portraitRepository
                    .findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                            userId, signature, CONTRACT_VERSION, locale)
                    .orElseGet(() -> NatalPortraitCache.builder()
                            .userId(userId)
                            .chartSignature(signature)
                            .interpretationVersion(CONTRACT_VERSION)
                            .locale(locale)
                            .build());
            row.setChartId(chartId);
            row.setStatus("READY");
            row.setSource(portrait.source() != null ? portrait.source() : "AI");
            row.setPortraitJson(json);
            portraitRepository.save(row);
        } catch (JsonProcessingException e) {
            // A cache miss next time is a far smaller problem than failing the request.
            log.error("Failed to persist natal portrait for user {}", userId, e);
        }
    }

    // ------------------------------------------------------------------ helpers

    private NormalizedNatalChart normalizeChart(NatalChart chart, String locale) {
        boolean birthTimeKnown = chart.getBirthTime() != null;
        return normalizer.normalize(
                chart.getId(),
                locale,
                birthTimeKnown,
                chart.getRisingSign(),
                chart.getAscendantDegree(),
                readList(chart.getPlanetPositionsJson(), PlanetPosition.class),
                readList(chart.getHousePlacementsJson(), HousePlacement.class),
                readList(chart.getAspectsJson(), PlanetaryAspect.class));
    }

    private <T> List<T> readList(String json, Class<T> type) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, type));
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse stored {} list", type.getSimpleName(), e);
            return List.of();
        }
    }

    private NatalPortrait readPortrait(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readValue(stripCodeFence(raw), NatalPortrait.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /** Providers occasionally wrap JSON in a markdown fence despite being told not to. */
    private String stripCodeFence(String raw) {
        String trimmed = raw.strip();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).strip();
            }
        }
        return trimmed;
    }

    /**
     * Identity of the birth data behind a chart. Corrected birth details produce a new signature,
     * which is what makes a stale interpretation fall out of cache automatically.
     */
    private String chartSignature(NatalChart chart) {
        String raw = String.join("|",
                String.valueOf(chart.getBirthDate()),
                String.valueOf(chart.getBirthTime()),
                String.valueOf(chart.getBirthLocation()),
                String.valueOf(chart.getLatitude()),
                String.valueOf(chart.getLongitude()));
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 40);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(raw.hashCode());
        }
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) return "tr";
        return locale.toLowerCase(Locale.ROOT).startsWith("en") ? "en" : "tr";
    }
}
