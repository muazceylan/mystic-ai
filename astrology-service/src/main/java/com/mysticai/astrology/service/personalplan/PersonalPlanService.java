package com.mysticai.astrology.service.personalplan;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.dto.daily.PlanFeedbackReason;
import com.mysticai.astrology.dto.daily.PlanFeedbackResponse;
import com.mysticai.astrology.dto.daily.UserPersonalContext;
import com.mysticai.astrology.entity.DailyActionState;
import com.mysticai.astrology.entity.DailyPersonalPlan;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.UserFeedback;
import com.mysticai.astrology.repository.DailyActionStateRepository;
import com.mysticai.astrology.repository.DailyPersonalPlanRepository;
import com.mysticai.astrology.repository.UserFeedbackRepository;
import com.mysticai.astrology.service.TransitCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Owns the lifecycle of "Bugünkü Kişisel Planım": composition, local-day stability, cross-day
 * repetition control, done-state overlay and feedback-driven regeneration.
 *
 * Everything is keyed on the user's LOCAL calendar day. The server day and the UTC day are
 * never used, so a user at 23:59 and the same user at 00:01 get different plans, and two users
 * in different zones at the same instant each get their own day.
 *
 * Fallback order when composition cannot produce a full plan:
 * <ol>
 *   <li>the ACTIVE plan already stored for this local day,</li>
 *   <li>a freshly composed rule-based plan (with the history rule relaxed if the catalog is
 *       exhausted — reported via {@code meta.degradedReason}),</li>
 *   <li>a minimal payload carrying only the day's real astrological theme.</li>
 * </ol>
 * The retired generic motivational strings are never used as a fallback.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalPlanService {

    private final PersonalPlanComposer composer;
    private final PersonalPlanRefiner refiner;
    private final PersonalPlanProperties properties;
    private final UserPersonalContextClient personalContextClient;
    private final DailyPersonalPlanRepository planRepository;
    private final DailyActionStateRepository actionStateRepository;
    private final UserFeedbackRepository feedbackRepository;
    private final TransitCalculator transitCalculator;
    private final ObjectMapper objectMapper;

    /** Everything needed to compose, resolved once per request. */
    public record PlanRequest(
            Long userId,
            LocalDate localDate,
            ZoneId zone,
            String locale,
            boolean english,
            DailyTransitsDTO transits,
            NatalChart chart,
            List<PlanetPosition> natalPositions
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Read path
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public DailyActionsDTO buildPlan(PlanRequest request) {
        String locale = normalizeLocale(request.locale());
        UserPersonalContext profile = personalContextClient.fetch(request.userId());
        String contextHash = contextHash(request.chart(), profile, request.transits(), request.zone());

        Optional<DailyPersonalPlan> active = planRepository.findByUserIdAndLocalDateAndLocaleAndStatus(
                request.userId(), request.localDate(), locale, DailyPersonalPlan.Status.ACTIVE);

        if (active.isPresent()
                && properties.getVersion().equals(active.get().getAlgorithmVersion())
                && contextHash.equals(active.get().getContextHash())) {
            DailyActionsDTO cached = readPayload(active.get());
            if (cached != null) {
                return applyDoneState(request.userId(), request.localDate(), cached);
            }
        }

        int generationNumber = active.map(DailyPersonalPlan::getGenerationNumber).orElse(0) + 1;
        PersonalPlanComposer.Composition composition =
                composeFresh(request, profile, locale, generationNumber);

        if (composition == null) {
            log.warn("Personal plan composition produced no usable content for userId={} localDate={}",
                    request.userId(), request.localDate());
            return applyDoneState(request.userId(), request.localDate(),
                    buildMinimalPlan(request.transits(), request.localDate(), request.english()));
        }

        active.ifPresent(plan -> {
            plan.setStatus(DailyPersonalPlan.Status.REPLACED);
            planRepository.save(plan);
        });
        persist(request, locale, contextHash, composition, generationNumber, null);
        return applyDoneState(request.userId(), request.localDate(), composition.payload());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Feedback → atomic regeneration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Records the rating and, for TOO_GENERIC / REPETITIVE, rebuilds the day's plan in the same
     * transaction so the caller gets the replacement in the response and never has to race a
     * follow-up GET against its own cache.
     *
     * <ul>
     *   <li>the ACTIVE row is taken under a pessimistic lock, so two concurrent submissions
     *       cannot both produce a replacement;</li>
     *   <li>an identical resubmission (same user/day/item/reason/generation) returns the plan
     *       already produced for it instead of consuming another regeneration;</li>
     *   <li>if composition fails, the existing plan stays ACTIVE and {@code regenerated=false};</li>
     *   <li>when the budget is exhausted the feedback is still recorded, with
     *       {@code regenerated=false} and {@code remainingRegenerations=0}.</li>
     * </ul>
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PlanFeedbackResponse submitFeedback(
            PlanRequest request,
            String itemId,
            String sentiment,
            PlanFeedbackReason reason,
            String note
    ) {
        String locale = normalizeLocale(request.locale());

        UserFeedback feedback = UserFeedback.builder()
                .userId(request.userId())
                .feedbackDate(request.localDate())
                .itemType("action")
                .itemId(clamp(itemId, 120))
                .sentiment(sentiment)
                .reason(reason != null ? reason.name() : null)
                .note(note == null ? null : clamp(note, 500))
                .build();
        feedbackRepository.save(feedback);

        if (reason == null || !reason.triggersRegeneration()) {
            return PlanFeedbackResponse.acceptedOnly(reason, remainingRegenerations(request, locale));
        }

        Optional<DailyPersonalPlan> locked = planRepository.findActiveForUpdate(
                request.userId(), request.localDate(), locale);
        if (locked.isEmpty()) {
            return PlanFeedbackResponse.acceptedOnly(reason, properties.getMaxRegenerationsPerDay());
        }
        DailyPersonalPlan current = locked.get();

        // Idempotency: the same submission retried must not consume another regeneration.
        String requestKey = regenerationRequestKey(itemId, reason, current.getGenerationNumber());
        Optional<DailyPersonalPlan> alreadyDone = planRepository
                .findByUserIdAndLocalDateAndLocaleAndRegenerationRequestKey(
                        request.userId(), request.localDate(), locale, requestKey);
        if (alreadyDone.isPresent()) {
            DailyActionsDTO existing = readPayload(alreadyDone.get());
            return PlanFeedbackResponse.regenerated(
                    reason,
                    remainingRegenerations(request, locale),
                    existing == null ? null : applyDoneState(request.userId(), request.localDate(), existing),
                    alreadyDone.get().getId(),
                    alreadyDone.get().getGenerationNumber());
        }

        int used = current.getGenerationNumber();
        if (used > properties.getMaxRegenerationsPerDay()) {
            log.info("Regeneration budget exhausted for userId={} localDate={}",
                    request.userId(), request.localDate());
            return PlanFeedbackResponse.budgetExhausted(reason);
        }

        UserPersonalContext profile = personalContextClient.fetch(request.userId());
        int nextGeneration = used + 1;
        PersonalPlanComposer.Composition replacement =
                composeFresh(request, profile, locale, nextGeneration);

        if (replacement == null) {
            // Composition failed — keep the existing plan exactly as it is.
            log.warn("Regeneration failed for userId={} localDate={}; keeping the existing plan.",
                    request.userId(), request.localDate());
            return PlanFeedbackResponse.acceptedOnly(reason, remainingRegenerations(request, locale));
        }

        current.setStatus(DailyPersonalPlan.Status.REPLACED);
        planRepository.save(current);

        String contextHash = contextHash(request.chart(), profile, request.transits(), request.zone());
        DailyPersonalPlan saved = persist(request, locale, contextHash, replacement, nextGeneration, requestKey);

        DailyActionsDTO payload = applyDoneState(
                request.userId(), request.localDate(), replacement.payload());
        return PlanFeedbackResponse.regenerated(
                reason,
                Math.max(0, properties.getMaxRegenerationsPerDay() - nextGeneration + 1),
                payload,
                saved == null ? null : saved.getId(),
                nextGeneration);
    }

    private int remainingRegenerations(PlanRequest request, String locale) {
        int used = planRepository.findMaxGenerationNumber(request.userId(), request.localDate(), locale);
        return Math.max(0, properties.getMaxRegenerationsPerDay() - Math.max(0, used - 1));
    }

    /**
     * Stable across retries of the same user action, so a duplicate tap or a client retry maps
     * onto the plan already produced instead of burning the budget.
     */
    private String regenerationRequestKey(String itemId, PlanFeedbackReason reason, int fromGeneration) {
        return clamp(reason.name() + ":" + fromGeneration + ":" + (itemId == null ? "plan" : itemId), 128);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Composition
    // ─────────────────────────────────────────────────────────────────────────

    private PersonalPlanComposer.Composition composeFresh(
            PlanRequest request, UserPersonalContext profile, String locale, int generationNumber) {

        History history = loadHistory(request.userId(), request.localDate(), locale);
        FeedbackPreferences feedbackPreferences = recentFeedbackPreferences(request.userId(), request.localDate());

        NatalChart chart = request.chart();
        boolean hasHouses = chart != null
                && chart.getHousePlacementsJson() != null
                && !chart.getHousePlacementsJson().isBlank();

        PersonalPlanSignals signals = PersonalPlanSignals.build(
                request.userId(),
                request.localDate(),
                request.english(),
                profile,
                chart != null ? chart.getSunSign() : null,
                chart != null ? chart.getMoonSign() : null,
                chart != null ? chart.getRisingSign() : null,
                hasHouses,
                request.transits().retrogrades() == null ? 0 : request.transits().retrogrades().size(),
                feedbackPreferences.negativeReasons(),
                feedbackPreferences.lifeAreaWeights(),
                feedbackPreferences.preferredActionIntents()
        );

        Optional<TransitCalculator.MoonAspectPeak> moonPeak =
                safeMoonPeak(request.localDate(), request.zone(), request.natalPositions());

        PersonalPlanComposer.Composition composition = composer.compose(new PersonalPlanComposer.Inputs(
                request.transits(),
                signals,
                request.localDate(),
                request.zone(),
                history.fingerprints(),
                history.texts(),
                moonPeak,
                generationNumber,
                Instant.now()
        ));
        return applyRefinement(composition, locale);
    }

    /**
     * Optional AI rewording, applied before the plan is persisted so the stored payload is what
     * the user actually sees. Fingerprints are derived from semantic keys rather than wording, so
     * refinement cannot weaken cross-day repetition control; the highlight texts used for
     * paraphrase detection are recomputed from the copy that shipped.
     */
    private PersonalPlanComposer.Composition applyRefinement(
            PersonalPlanComposer.Composition composition, String locale) {
        if (composition == null) {
            return null;
        }
        DailyActionsDTO refined = refiner.refine(composition.payload(), locale);
        if (refined == null || refined == composition.payload()) {
            return composition;
        }
        return new PersonalPlanComposer.Composition(
                refined, composition.fingerprints(), highlightTexts(refined), composition.signalUsage());
    }

    private List<String> highlightTexts(DailyActionsDTO payload) {
        List<String> highlights = new ArrayList<>();
        if (payload.primaryAction() != null) {
            highlights.add(payload.primaryAction().description());
        }
        if (payload.lifeAreaCards() != null) {
            payload.lifeAreaCards().forEach(card -> highlights.add(card.description()));
        }
        if (payload.caution() != null) {
            highlights.add(payload.caution().description());
        }
        return highlights.stream().filter(text -> text != null && !text.isBlank()).toList();
    }

    private Optional<TransitCalculator.MoonAspectPeak> safeMoonPeak(
            LocalDate localDate, ZoneId zone, List<PlanetPosition> natalPositions) {
        if (natalPositions == null || natalPositions.isEmpty()) {
            return Optional.empty();
        }
        try {
            return transitCalculator.findMoonAspectPeak(localDate, zone, natalPositions);
        } catch (Exception e) {
            log.warn("Moon peak calculation failed for localDate={}: {}",
                    localDate, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Persistence helpers
    // ─────────────────────────────────────────────────────────────────────────

    private record History(Set<String> fingerprints, List<String> texts) {}

    private History loadHistory(Long userId, LocalDate localDate, String locale) {
        LocalDate from = localDate.minusDays(Math.max(1, properties.getHistoryDays()));
        List<DailyPersonalPlan> previous =
                planRepository.findHistory(userId, locale, from, localDate.minusDays(1));

        Set<String> fingerprints = new LinkedHashSet<>();
        List<String> texts = new ArrayList<>();
        for (DailyPersonalPlan plan : previous) {
            if (plan.getFingerprints() != null && !plan.getFingerprints().isBlank()) {
                fingerprints.addAll(Arrays.stream(plan.getFingerprints().split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .toList());
            }
            if (plan.getHighlightTexts() != null && !plan.getHighlightTexts().isBlank()) {
                texts.addAll(Arrays.stream(plan.getHighlightTexts().split("\n"))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .toList());
            }
        }
        return new History(fingerprints, texts);
    }

    private DailyPersonalPlan persist(
            PlanRequest request,
            String locale,
            String contextHash,
            PersonalPlanComposer.Composition composition,
            int generationNumber,
            String regenerationRequestKey
    ) {
        try {
            DailyPersonalPlan plan = DailyPersonalPlan.builder()
                    .userId(request.userId())
                    .localDate(request.localDate())
                    .timezone(request.zone().getId())
                    .locale(locale)
                    .algorithmVersion(properties.getVersion())
                    .generationNumber(generationNumber)
                    .status(DailyPersonalPlan.Status.ACTIVE)
                    .contextHash(contextHash)
                    .payloadJson(objectMapper.writeValueAsString(composition.payload()))
                    .fingerprints(clamp(String.join(",", composition.fingerprints()), 2048))
                    .highlightTexts(String.join("\n", composition.highlightTexts()))
                    .regenerationRequestKey(regenerationRequestKey)
                    .build();
            return planRepository.save(plan);
        } catch (Exception e) {
            // Storage failure must not break the response; only history quality degrades.
            log.warn("Personal plan persist failed for userId={} localDate={}: {}",
                    request.userId(), request.localDate(), e.getClass().getSimpleName());
            return null;
        }
    }

    private DailyActionsDTO readPayload(DailyPersonalPlan plan) {
        try {
            return objectMapper.readValue(plan.getPayloadJson(), DailyActionsDTO.class);
        } catch (Exception e) {
            log.warn("Stored personal plan could not be parsed (planId={}), recomposing.", plan.getId());
            return null;
        }
    }

    /**
     * Overlays persisted completion state onto the payload so ticking an item survives a
     * refetch and a regeneration.
     */
    private DailyActionsDTO applyDoneState(Long userId, LocalDate localDate, DailyActionsDTO payload) {
        Map<String, DailyActionState> stateById = new LinkedHashMap<>();
        actionStateRepository.findByUserIdAndActionDate(userId, localDate)
                .forEach(state -> stateById.put(state.getActionId(), state));
        if (stateById.isEmpty()) {
            return payload;
        }

        List<DailyActionsDTO.ActionItem> actions = payload.actions() == null ? List.of() : payload.actions().stream()
                .map(item -> {
                    DailyActionState state = stateById.get(item.id());
                    if (state == null) {
                        return item;
                    }
                    return new DailyActionsDTO.ActionItem(
                            item.id(), item.title(), item.detail(), item.icon(), item.tag(), item.etaMin(),
                            state.isDone(), doneAt(state), item.relatedTransitIds());
                })
                .toList();

        DailyActionsDTO.PrimaryAction primary = payload.primaryAction();
        if (primary != null) {
            DailyActionState state = stateById.get(primary.id());
            if (state != null) {
                primary = new DailyActionsDTO.PrimaryAction(
                        primary.id(), primary.category(), primary.categoryLabel(), primary.title(),
                        primary.description(), primary.timeWindow(), primary.why(),
                        state.isDone(), doneAt(state), primary.relatedTransitIds());
            }
        }

        List<DailyActionsDTO.LifeAreaCard> cards = payload.lifeAreaCards() == null ? null : payload.lifeAreaCards().stream()
                .map(card -> {
                    DailyActionState state = stateById.get(card.id());
                    if (state == null) {
                        return card;
                    }
                    return new DailyActionsDTO.LifeAreaCard(
                            card.id(), card.category(), card.categoryLabel(), card.title(),
                            card.description(), card.why(), state.isDone(), doneAt(state));
                })
                .toList();

        return new DailyActionsDTO(
                payload.date(), payload.header(), actions, payload.miniPlan(),
                payload.homeTeaser(),
                payload.personalizationLevel(), payload.profileSignalsUsed(), payload.mainTheme(),
                primary, payload.timeline(), cards, payload.caution(), payload.eveningReflection(),
                payload.meta());
    }

    private String doneAt(DailyActionState state) {
        return state.getDoneAt() != null ? state.getDoneAt().atOffset(ZoneOffset.UTC).toString() : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minimal fallback — real astrology only, no motivational filler
    // ─────────────────────────────────────────────────────────────────────────

    public DailyActionsDTO buildMinimalPlan(DailyTransitsDTO transits, LocalDate localDate, boolean english) {
        String headline = transits.hero() != null ? transits.hero().headline() : null;
        String supporting = transits.hero() != null ? transits.hero().supporting() : null;

        String title = headline != null && !headline.isBlank()
                ? headline
                : (english ? "Today's sky, read against your chart" : "Bugünün gökyüzü, haritanıza göre");
        String description = supporting != null && !supporting.isBlank()
                ? supporting
                : (english
                    ? "Today's personalised suggestions are not ready yet. The sky data below is real and current."
                    : "Bugünün kişisel önerileri henüz hazır değil. Aşağıdaki gökyüzü verisi gerçek ve güncel.");

        DailyActionsDTO.MainTheme theme = new DailyActionsDTO.MainTheme(title, description, null, List.of());

        return new DailyActionsDTO(
                localDate.toString(),
                new DailyActionsDTO.Header(title, description),
                List.of(),
                new DailyActionsDTO.MiniPlan("Mini Plan", List.of()),
                new DailyActionsDTO.HomeTeaser(
                        english ? "Your chart's strongest signal is still being resolved."
                                : "Haritanızdaki en güçlü sinyal hâlâ netleştiriliyor.",
                        english ? "Open the plan again shortly for a specific next move."
                                : "Somut hamleniz için planı kısa süre sonra yeniden açın."),
                "LOW",
                List.of(SignalUsageRecorder.ACTIVE_TRANSITS),
                theme,
                null,
                List.of(),
                List.of(),
                null,
                null,
                new DailyActionsDTO.PlanMeta(
                        properties.getVersion(), null, 1, true, "minimal_fallback", "no_usable_transit_content")
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Misc
    // ─────────────────────────────────────────────────────────────────────────

    private record FeedbackPreferences(
            Set<PlanFeedbackReason> negativeReasons,
            Map<LifeArea, Integer> lifeAreaWeights,
            Set<String> preferredActionIntents
    ) {}

    private FeedbackPreferences recentFeedbackPreferences(Long userId, LocalDate localDate) {
        Set<PlanFeedbackReason> reasons = EnumSet.noneOf(PlanFeedbackReason.class);
        Map<LifeArea, Integer> areaWeights = new LinkedHashMap<>();
        Set<String> preferredIntents = new LinkedHashSet<>();
        List<UserFeedback> recent = feedbackRepository.findTop120ByUserIdOrderByCreatedAtDesc(userId);
        LocalDate from = localDate.minusDays(Math.max(1, properties.getFeedbackInfluenceDays()));
        for (UserFeedback feedback : recent) {
            if (feedback.getFeedbackDate() == null || feedback.getFeedbackDate().isBefore(from)) {
                continue;
            }
            PlanFeedbackReason reason = PlanFeedbackReason.parse(feedback.getReason());
            if (reason != null && reason != PlanFeedbackReason.HELPFUL) {
                reasons.add(reason);
            }
            LifeArea area = lifeAreaFromActionId(feedback.getItemId());
            if (reason == PlanFeedbackReason.NOT_RELEVANT && area != null) {
                areaWeights.merge(area, -Math.abs(properties.getNotRelevantAreaPenalty()), Integer::sum);
            } else if (reason == PlanFeedbackReason.HELPFUL && area != null) {
                areaWeights.merge(area, Math.max(0, properties.getHelpfulAreaBoost()), Integer::sum);
                String intent = actionIntentFromActionId(feedback.getItemId(), area);
                if (intent != null) {
                    preferredIntents.add(intent);
                }
            }
        }
        return new FeedbackPreferences(Set.copyOf(reasons), Map.copyOf(areaWeights), Set.copyOf(preferredIntents));
    }

    private LifeArea lifeAreaFromActionId(String itemId) {
        if (itemId == null) return null;
        for (LifeArea area : LifeArea.values()) {
            if (itemId.startsWith("plan-" + area.slug() + "-")) return area;
        }
        return null;
    }

    private String actionIntentFromActionId(String itemId, LifeArea area) {
        if (itemId == null || area == null) return null;
        String prefix = "plan-" + area.slug() + "-";
        if (!itemId.startsWith(prefix) || itemId.length() == prefix.length()) return null;
        return itemId.substring(prefix.length());
    }

    /**
     * Ties the stored plan to the chart, profile, timezone and transit set it was built from, so
     * the plan regenerates when the user fixes their birth time, changes status or travels.
     */
    private String contextHash(
            NatalChart chart, UserPersonalContext profile, DailyTransitsDTO transits, ZoneId zone) {
        StringBuilder raw = new StringBuilder()
                .append(chart != null ? chart.getSunSign() : "na").append('|')
                .append(chart != null ? chart.getMoonSign() : "na").append('|')
                .append(chart != null ? chart.getRisingSign() : "na").append('|')
                .append(chart != null && chart.getHousePlacementsJson() != null ? "houses" : "nohouses").append('|')
                .append(profile.hasMaritalStatus() ? profile.maritalStatus() : "na").append('|')
                .append(profile.hasBirthDate() ? profile.birthDate().getYear() : "na").append('|')
                .append(zone.getId()).append('|')
                .append(properties.getVersion());
        if (transits.transits() != null) {
            transits.transits().forEach(item -> raw.append('|').append(item.id()));
        }

        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(raw.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest).substring(0, 44);
        } catch (Exception e) {
            return String.valueOf(Math.abs(raw.toString().hashCode()));
        }
    }

    private String normalizeLocale(String locale) {
        return locale != null && locale.toLowerCase().startsWith("en") ? "en" : "tr";
    }

    private String clamp(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
