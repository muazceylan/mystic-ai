package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.service.TransitCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import com.mysticai.astrology.dto.daily.PlanFeedbackReason;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.ToIntFunction;
import java.util.stream.Stream;

/**
 * Turns the day's transit data plus the user's real profile signals into a concrete plan.
 *
 * Guarantees enforced here (each one is covered by a unit test):
 * <ul>
 *   <li>every emitted suggestion passes {@link PlanQualityGuard} — no motivational filler;</li>
 *   <li>no two items in one response share an action intent or read as paraphrases;</li>
 *   <li>nothing repeats a life-area/intent pair the user saw in the recent history window;</li>
 *   <li>audience-gated copy is only used when the profile actually states the status;</li>
 *   <li>timeline slots carry a clock time only when a real intraday signal produced one.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PersonalPlanComposer {

    private final PersonalPlanCatalog catalog;
    private final PlanQualityGuard qualityGuard;
    private final PersonalPlanProperties properties;

    /** TR planet labels come back from the transit builder already localised; map them back. */
    private static final Map<String, String> PLANET_CANONICAL = Map.ofEntries(
            Map.entry("güneş", "Sun"), Map.entry("gunes", "Sun"), Map.entry("sun", "Sun"),
            Map.entry("ay", "Moon"), Map.entry("moon", "Moon"),
            Map.entry("merkür", "Mercury"), Map.entry("merkur", "Mercury"), Map.entry("mercury", "Mercury"),
            Map.entry("venüs", "Venus"), Map.entry("venus", "Venus"),
            Map.entry("mars", "Mars"),
            Map.entry("jüpiter", "Jupiter"), Map.entry("jupiter", "Jupiter"),
            Map.entry("satürn", "Saturn"), Map.entry("saturn", "Saturn"),
            Map.entry("uranüs", "Uranus"), Map.entry("uranus", "Uranus"),
            Map.entry("neptün", "Neptune"), Map.entry("neptune", "Neptune"),
            Map.entry("plüton", "Pluto"), Map.entry("pluto", "Pluto"),
            Map.entry("kiron", "Chiron"), Map.entry("chiron", "Chiron"),
            Map.entry("kuzey düğümü", "NorthNode"), Map.entry("north node", "NorthNode")
    );

    /**
     * @param localDate        the user's local calendar day — never the server or UTC day
     * @param zone             the user's timezone, used for the local day and time labels
     * @param history          fingerprints ({@link PlanFingerprints}) already used in the window
     * @param historyTexts     headline sentences from those days, for paraphrase detection
     * @param moonPeak         real intraday Moon contact, when one exists
     * @param generationNumber 1 for the first plan of the local day, incremented per rebuild
     */
    public record Inputs(
            DailyTransitsDTO transits,
            PersonalPlanSignals signals,
            LocalDate localDate,
            ZoneId zone,
            Set<String> history,
            List<String> historyTexts,
            Optional<TransitCalculator.MoonAspectPeak> moonPeak,
            int generationNumber,
            Instant generatedAt
    ) {
        /** Regenerations shift variant selection deterministically. */
        int regenerationSalt() {
            return (generationNumber - 1) * 7;
        }

        /** Last-resort relaxation when the catalog cannot satisfy the history rules. */
        Inputs withoutHistory() {
            return new Inputs(transits, signals, localDate, zone, Set.of(), List.of(),
                    moonPeak, generationNumber, generatedAt);
        }
    }

    public record Composition(
            DailyActionsDTO payload,
            Set<String> fingerprints,
            List<String> highlightTexts,
            SignalUsageRecorder signalUsage
    ) {}

    /** One transit reduced to the dimensions the catalog is indexed by. */
    private record Candidate(
            DailyTransitsDTO.TransitItem transit,
            LifeArea area,
            PersonalPlanCatalog.Tone tone,
            PlanetRole role,
            String canonicalPlanet,
            String displayPlanet,
            String house,
            int importance
    ) {}

    public Composition compose(Inputs inputs) {
        PersonalPlanSignals signals = inputs.signals();
        boolean english = signals.english();

        SignalUsageRecorder usage = new SignalUsageRecorder();
        ResponseState state = new ResponseState();

        List<Candidate> candidates = rankCandidates(inputs.transits(), signals, usage);

        Selection primary = selectAction(candidates, signals, inputs, state, usage, null);
        String degradedReason = null;
        if (primary == null) {
            // Catalog exhausted for every eligible area — relax the cross-day history rule
            // rather than falling back to banned or recently-shown copy.
            Inputs relaxed = inputs.withoutHistory();
            primary = selectAction(candidates, signals, relaxed, state, usage, null);
            if (primary == null) {
                return null;
            }
            degradedReason = "history_window_relaxed_catalog_exhausted";
            inputs = relaxed;
        }
        registerSelection(primary, state);

        List<Selection> areaCards = new ArrayList<>();
        for (Candidate candidate : candidates) {
            if (areaCards.size() >= properties.getMaxLifeAreaCards()) {
                break;
            }
            if (state.usedAreas.contains(candidate.area())) {
                continue;
            }
            Selection selection = selectAction(List.of(candidate), signals, inputs, state, usage, null);
            if (selection != null) {
                registerSelection(selection, state);
                areaCards.add(selection);
            }
        }

        DailyActionsDTO.MainTheme mainTheme = buildMainTheme(primary, inputs, english);
        DailyActionsDTO.Caution caution = buildCaution(candidates, signals, inputs, state, english);
        if (caution != null) {
            state.emittedText.add(caution.description());
        }
        List<DailyActionsDTO.TimeSlot> timeline = buildTimeline(inputs, caution, english);
        DailyActionsDTO.EveningReflection reflection = buildReflection(primary.area(), inputs, english);

        DailyActionsDTO.TimeWindow primaryWindow = resolveWindow(inputs, english);
        DailyActionsDTO.PrimaryAction primaryAction = new DailyActionsDTO.PrimaryAction(
                actionId(primary),
                primary.area().slug(),
                primary.area().label(english),
                clamp(shortTitle(primary.variant().text(english)), 92),
                primary.variant().text(english),
                primaryWindow,
                buildWhy(primary, english),
                false,
                null,
                List.of(primary.candidate().transit().id())
        );

        List<DailyActionsDTO.LifeAreaCard> lifeAreaCards = areaCards.stream()
                .map(selection -> new DailyActionsDTO.LifeAreaCard(
                        actionId(selection),
                        selection.area().slug(),
                        selection.area().label(english),
                        clamp(shortTitle(selection.variant().text(english)), 92),
                        selection.variant().text(english),
                        buildWhy(selection, english),
                        false,
                        null))
                .toList();

        DailyActionsDTO.PlanMeta meta = new DailyActionsDTO.PlanMeta(
                properties.getVersion(),
                inputs.generatedAt().toString(),
                inputs.generationNumber(),
                inputs.generationNumber() <= properties.getMaxRegenerationsPerDay(),
                "rule_based",
                degradedReason
        );

        DailyActionsDTO payload = new DailyActionsDTO(
                inputs.localDate().toString(),
                new DailyActionsDTO.Header(mainTheme.title(), mainTheme.description()),
                buildLegacyActions(primaryAction, lifeAreaCards, caution),
                buildLegacyMiniPlan(primaryAction, lifeAreaCards, english),
                personalizationLevel(usage),
                List.copyOf(usage.usedSignals()),
                mainTheme,
                primaryAction,
                timeline,
                lifeAreaCards,
                caution,
                reflection,
                meta
        );

        List<String> highlights = new ArrayList<>();
        highlights.add(primaryAction.description());
        lifeAreaCards.forEach(card -> highlights.add(card.description()));
        if (caution != null) {
            highlights.add(caution.description());
        }

        return new Composition(payload, state.fingerprints, highlights, usage);
    }

    /**
     * Derived from signals that genuinely influenced the plan, not from which profile fields
     * happened to be populated — so the badge the user sees is always backed by real usage.
     */
    private String personalizationLevel(SignalUsageRecorder usage) {
        boolean chartDepth = usage.used(SignalUsageRecorder.NATAL_HOUSES);
        long profileSignals = Stream.of(
                        SignalUsageRecorder.RELATIONSHIP_STATUS,
                        SignalUsageRecorder.AGE_RANGE,
                        SignalUsageRecorder.PREVIOUS_FEEDBACK,
                        SignalUsageRecorder.RISING_SIGN)
                .filter(usage::used)
                .count();

        if (chartDepth && profileSignals >= 1) {
            return "HIGH";
        }
        if (chartDepth || profileSignals >= 1) {
            return "MEDIUM";
        }
        return "LOW";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Candidate ranking
    // ─────────────────────────────────────────────────────────────────────────

    private List<Candidate> rankCandidates(
            DailyTransitsDTO transits, PersonalPlanSignals signals, SignalUsageRecorder usage) {
        List<DailyTransitsDTO.TransitItem> items = transits.transits() == null ? List.of() : transits.transits();
        List<Candidate> candidates = new ArrayList<>();
        boolean usedHouse = false;

        for (DailyTransitsDTO.TransitItem item : items) {
            String displayPlanet = item.technical() != null ? item.technical().transitPlanet() : null;
            String canonicalPlanet = canonicalPlanet(displayPlanet);
            String house = item.technical() != null ? item.technical().house() : null;

            // House-driven areas are the personal ones; planet-driven is the honest fallback
            // when there is no birth time and therefore no house data.
            LifeArea area = LifeArea.fromHouse(house);
            if (area != null) {
                usedHouse = true;
            } else {
                area = LifeArea.fromTransitPlanet(canonicalPlanet);
            }

            PersonalPlanCatalog.Tone tone = isSupportive(item.label())
                    ? PersonalPlanCatalog.Tone.SUPPORTIVE
                    : PersonalPlanCatalog.Tone.CAUTION;

            candidates.add(new Candidate(
                    item, area, tone, PlanetRole.fromPlanet(canonicalPlanet),
                    canonicalPlanet, displayPlanet, house, item.importance()));
        }

        if (candidates.isEmpty()) {
            return candidates;
        }
        if (usedHouse) {
            usage.record(SignalUsageRecorder.NATAL_HOUSES,
                    "candidate_life_area: transited natal house selected the life area");
        }
        usage.record(SignalUsageRecorder.ACTIVE_TRANSITS, "candidate_ranking: transit set and importance");

        List<Candidate> baseline = new ArrayList<>(candidates);
        baseline.sort(byImportance());

        List<Candidate> ranked = new ArrayList<>(candidates);
        // The ascendant ruler's transit is traditionally the most personally-felt one, so it
        // outranks a marginally stronger transit. Only applies when a rising sign is known.
        String ascendantRuler = ascendantRuler(signals.risingSign());
        boolean retroHeavy = signals.retrogradeCount() >= 2;
        ranked.sort((left, right) -> {
            int leftScore = left.importance()
                    + rulerBonus(left, ascendantRuler)
                    + retroBonus(left, retroHeavy);
            int rightScore = right.importance()
                    + rulerBonus(right, ascendantRuler)
                    + retroBonus(right, retroHeavy);
            if (leftScore != rightScore) {
                return Integer.compare(rightScore, leftScore);
            }
            return Integer.compare(right.importance(), left.importance());
        });

        // Only claim a signal when it actually moved the top of the list.
        if (ascendantRuler != null && !ranked.get(0).transit().id().equals(baseline.get(0).transit().id())) {
            usage.record(SignalUsageRecorder.RISING_SIGN,
                    "candidate_ranking: ascendant ruler " + ascendantRuler + " promoted to top transit");
        } else if (retroHeavy && !ranked.get(0).transit().id().equals(baseline.get(0).transit().id())) {
            usage.record(SignalUsageRecorder.RETROGRADES,
                    "candidate_ranking: retrograde-heavy day promoted a review-oriented transit");
        }
        return ranked;
    }

    private Comparator<Candidate> byImportance() {
        return (left, right) -> Integer.compare(right.importance(), left.importance());
    }

    private int rulerBonus(Candidate candidate, String ascendantRuler) {
        return ascendantRuler != null && ascendantRuler.equals(candidate.canonicalPlanet()) ? 12 : 0;
    }

    private int retroBonus(Candidate candidate, boolean retroHeavy) {
        if (!retroHeavy) {
            return 0;
        }
        return candidate.role() == PlanetRole.LIMIT || candidate.role() == PlanetRole.WORD ? 8 : 0;
    }

    /** Traditional sign ruler of the ascendant. */
    private String ascendantRuler(String risingSign) {
        if (risingSign == null || risingSign.isBlank()) {
            return null;
        }
        return switch (risingSign.trim()) {
            case "Aries", "Scorpio" -> "Mars";
            case "Taurus", "Libra" -> "Venus";
            case "Gemini", "Virgo" -> "Mercury";
            case "Cancer" -> "Moon";
            case "Leo" -> "Sun";
            case "Sagittarius", "Pisces" -> "Jupiter";
            case "Capricorn", "Aquarius" -> "Saturn";
            default -> null;
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Selection with quality + duplicate filtering
    // ─────────────────────────────────────────────────────────────────────────

    private record Selection(Candidate candidate, LifeArea area, PersonalPlanCatalog.CatalogEntry entry) {
        PlanVariant variant() {
            return entry.variant();
        }
    }

    /** Everything already committed to this response, for in-response duplicate rules. */
    private static final class ResponseState {
        final List<String> emittedText = new ArrayList<>();
        final Set<String> usedSemanticKeys = new LinkedHashSet<>();
        final Set<String> usedIntents = new LinkedHashSet<>();
        final Set<LifeArea> usedAreas = new LinkedHashSet<>();
        final Set<String> fingerprints = new LinkedHashSet<>();
    }

    private Selection selectAction(
            List<Candidate> candidates,
            PersonalPlanSignals signals,
            Inputs inputs,
            ResponseState state,
            SignalUsageRecorder usage,
            PersonalPlanCatalog.Tone forcedTone
    ) {
        for (Candidate candidate : candidates) {
            PersonalPlanCatalog.Tone tone = forcedTone != null ? forcedTone : candidate.tone();
            Selection picked = pickEntry(
                    catalog.actionCandidates(candidate.area(), tone, candidate.role()),
                    signals, inputs, state, usage, candidate);
            if (picked != null) {
                return picked;
            }

            // The other tone for the same area is still grounded in this transit, so try it
            // before abandoning a life area the chart actually points at.
            PersonalPlanCatalog.Tone alternate = tone == PersonalPlanCatalog.Tone.SUPPORTIVE
                    ? PersonalPlanCatalog.Tone.CAUTION
                    : PersonalPlanCatalog.Tone.SUPPORTIVE;
            Selection fallback = pickEntry(
                    catalog.actionCandidates(candidate.area(), alternate, candidate.role()),
                    signals, inputs, state, usage, candidate);
            if (fallback != null) {
                return fallback;
            }
        }
        return null;
    }

    /**
     * Walks the candidate pool applying, in order: audience gating, in-response semanticKey and
     * intent uniqueness, quality guard, paraphrase check, cross-day semanticKey and
     * lifeArea+intent history, and finally the paraphrase check against recent days.
     *
     * Ties between otherwise-equal variants are broken by age band and by recent negative
     * feedback; both are recorded only when they actually changed which variant was returned.
     */
    private Selection pickEntry(
            List<PersonalPlanCatalog.CatalogEntry> pool,
            PersonalPlanSignals signals,
            Inputs inputs,
            ResponseState state,
            SignalUsageRecorder usage,
            Candidate candidate
    ) {
        if (pool.isEmpty()) {
            return null;
        }
        // Deterministic per user/day/transit, but shifts when the user asks for a regeneration.
        int offset = Math.floorMod(seed(signals, candidate) + inputs.regenerationSalt(), pool.size());

        List<PersonalPlanCatalog.CatalogEntry> eligible = new ArrayList<>();
        boolean audienceFiltered = false;

        for (int step = 0; step < pool.size(); step++) {
            PersonalPlanCatalog.CatalogEntry entry = pool.get((offset + step) % pool.size());
            PlanVariant variant = entry.variant();

            if (variant.audience() != PlanVariant.Audience.ANY) {
                if (!signals.allows(variant.audience())) {
                    // Only counts as "used" if it excluded what would otherwise have been the
                    // natural pick — filtering an entry further down the pool, after a pick is
                    // already locked in, never changes the output.
                    if (eligible.isEmpty()) {
                        audienceFiltered = true;
                    }
                    continue;
                }
            }
            // Rule: the same semanticKey may not appear twice in one response, even worded
            // differently and even in a different life area.
            if (state.usedSemanticKeys.contains(entry.semanticKey())
                    || state.usedIntents.contains(entry.actionIntent())) {
                continue;
            }

            String text = variant.text(signals.english());
            String rejection = qualityGuard.rejectionReason(text);
            if (rejection != null) {
                log.debug("Personal plan variant rejected intent={} reason={}", entry.actionIntent(), rejection);
                continue;
            }
            if (qualityGuard.isDuplicateOfAny(text, state.emittedText)) {
                continue;
            }

            // Cross-day rules.
            if (inputs.history().contains(PlanFingerprints.semantic(entry.semanticKey()))) {
                usage.record(SignalUsageRecorder.PLAN_HISTORY,
                        "variant_filter: semanticKey " + entry.semanticKey() + " already used in the history window");
                continue;
            }
            if (inputs.history().contains(PlanFingerprints.areaIntent(candidate.area(), entry.actionIntent()))) {
                usage.record(SignalUsageRecorder.PLAN_HISTORY,
                        "variant_filter: " + candidate.area().slug() + "+" + entry.actionIntent()
                                + " already used in the history window");
                continue;
            }
            if (qualityGuard.isDuplicateOfAny(text, inputs.historyTexts())) {
                usage.record(SignalUsageRecorder.PLAN_HISTORY,
                        "variant_filter: wording too close to a suggestion shown in the history window");
                continue;
            }

            eligible.add(entry);
        }

        if (eligible.isEmpty()) {
            return null;
        }

        PersonalPlanCatalog.CatalogEntry naturalPick = eligible.get(0);
        PersonalPlanCatalog.CatalogEntry finalPick = applyTieBreaks(eligible, signals, usage, candidate);

        if (audienceFiltered || finalPick.audience() != PlanVariant.Audience.ANY) {
            usage.record(SignalUsageRecorder.RELATIONSHIP_STATUS,
                    finalPick.audience() != PlanVariant.Audience.ANY
                            ? "variant_choice: selected " + finalPick.audience() + "-only copy for " + finalPick.semanticKey()
                            : "variant_filter: excluded status-specific copy because status is "
                                    + signals.relationshipStatus());
        }
        if (finalPick != naturalPick) {
            log.debug("Tie-break changed variant from {} to {}", naturalPick.actionIntent(), finalPick.actionIntent());
        }
        return new Selection(candidate, candidate.area(), finalPick);
    }

    /**
     * Age band and recent negative feedback only ever reorder variants that are already
     * eligible and equally grounded — they never introduce or suppress a life area, and they
     * never imply anything about the user's occupation, household or life events.
     */
    private PersonalPlanCatalog.CatalogEntry applyTieBreaks(
            List<PersonalPlanCatalog.CatalogEntry> eligible,
            PersonalPlanSignals signals,
            SignalUsageRecorder usage,
            Candidate candidate
    ) {
        PersonalPlanCatalog.CatalogEntry current = eligible.get(0);
        if (eligible.size() == 1) {
            return current;
        }

        // "Çok genel" recently → prefer the most concrete wording available.
        if (signals.recentNegativeReasons().contains(PlanFeedbackReason.TOO_GENERIC)) {
            PersonalPlanCatalog.CatalogEntry mostConcrete = eligible.stream()
                    .max(Comparator.comparingInt(entry -> concreteness(entry.text(signals.english()))))
                    .orElse(current);
            if (!mostConcrete.equals(current)) {
                usage.record(SignalUsageRecorder.PREVIOUS_FEEDBACK,
                        "variant_choice: previous 'too generic' feedback promoted the more specific "
                                + mostConcrete.semanticKey());
                current = mostConcrete;
            }
        }

        // Age band breaks a remaining tie by phrasing intensity — but only when more than one
        // variant is genuinely tied for the most/least direct wording. If a single variant is
        // uniquely the most direct (or indirect), there is no tie to break, and the natural
        // (rotation-selected) pick stands; otherwise the offset/regeneration entropy that
        // `pickEntry` relies on would be defeated every time an age band is known.
        if (signals.ageBand() != PersonalPlanSignals.AgeBand.UNKNOWN && eligible.size() > 1) {
            boolean preferDirect = signals.ageBand() == PersonalPlanSignals.AgeBand.YOUNG_ADULT
                    || signals.ageBand() == PersonalPlanSignals.AgeBand.ADULT;
            ToIntFunction<PersonalPlanCatalog.CatalogEntry> intensityScore = entry -> {
                int length = entry.text(signals.english()).length();
                return preferDirect ? length : -length;
            };
            int bestScore = eligible.stream().mapToInt(intensityScore).min().orElseThrow();
            List<PersonalPlanCatalog.CatalogEntry> tiedForBest = eligible.stream()
                    .filter(entry -> intensityScore.applyAsInt(entry) == bestScore)
                    .toList();

            if (tiedForBest.size() > 1) {
                PersonalPlanCatalog.CatalogEntry ageChoice = tiedForBest.get(0);
                if (!ageChoice.equals(current)) {
                    usage.record(SignalUsageRecorder.AGE_RANGE,
                            "variant_choice: age band " + signals.ageBand().slug()
                                    + " tie-break selected " + ageChoice.semanticKey()
                                    + " over " + current.semanticKey()
                                    + " in " + candidate.area().slug());
                    current = ageChoice;
                }
            }
        }

        return current;
    }

    /** Rough specificity proxy: more distinct informative tokens means a more concrete ask. */
    private int concreteness(String text) {
        return qualityGuard.normalize(text).split(" ").length;
    }

    private void registerSelection(Selection selection, ResponseState state) {
        state.emittedText.add(selection.variant().english());
        state.emittedText.add(selection.variant().turkish());
        state.usedSemanticKeys.add(selection.entry().semanticKey());
        state.usedIntents.add(selection.entry().actionIntent());
        state.usedAreas.add(selection.area());
        state.fingerprints.add(PlanFingerprints.semantic(selection.entry().semanticKey()));
        state.fingerprints.add(PlanFingerprints.areaIntent(selection.area(), selection.entry().actionIntent()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sections
    // ─────────────────────────────────────────────────────────────────────────

    private DailyActionsDTO.MainTheme buildMainTheme(Selection primary, Inputs inputs, boolean english) {
        Candidate candidate = primary.candidate();
        List<PersonalPlanCatalog.ThemeCopy> pool = catalog.themeCandidates(primary.area(), candidate.tone());
        PersonalPlanCatalog.ThemeCopy copy = pool.isEmpty()
                ? null
                : pool.get(Math.floorMod(seed(inputs.signals(), candidate) + inputs.regenerationSalt(), pool.size()));

        String planetLabel = displayPlanet(candidate, english);
        String title = copy != null
                ? copy.title(english)
                : (english
                    ? planetLabel + " is highlighting your " + primary.area().label(english).toLowerCase(Locale.ROOT)
                    : planetLabel + " " + primary.area().label(false).toLowerCase(new Locale("tr")) + " alanınızı öne çıkarıyor");
        String description = copy != null
                ? String.format(copy.description(english), planetLabel)
                : candidate.transit().impactPlain();

        DailyActionsDTO.AstroBasis basis = new DailyActionsDTO.AstroBasis(
                candidate.house() != null && !candidate.house().isBlank() ? "TRANSIT_HOUSE" : "TRANSIT_ASPECT",
                candidate.canonicalPlanet(),
                candidate.house() != null && !candidate.house().isBlank()
                        ? "NATAL_HOUSE_" + candidate.house()
                        : (candidate.transit().technical() != null ? candidate.transit().technical().natalPoint() : null),
                candidate.transit().technical() != null ? candidate.transit().technical().aspect() : null
        );

        return new DailyActionsDTO.MainTheme(title, description, buildWhy(primary, english), List.of(basis));
    }

    private DailyActionsDTO.Caution buildCaution(
            List<Candidate> candidates,
            PersonalPlanSignals signals,
            Inputs inputs,
            ResponseState state,
            boolean english
    ) {
        for (Candidate candidate : candidates) {
            List<PersonalPlanCatalog.CatalogEntry> pool = catalog.cautionCandidates(candidate.area());
            if (pool.isEmpty()) {
                continue;
            }
            int offset = Math.floorMod(seed(signals, candidate) + inputs.regenerationSalt(), pool.size());
            for (int step = 0; step < pool.size(); step++) {
                PersonalPlanCatalog.CatalogEntry entry = pool.get((offset + step) % pool.size());
                String text = entry.text(english);
                if (state.usedSemanticKeys.contains(entry.semanticKey())
                        || state.usedIntents.contains(entry.actionIntent())
                        || inputs.history().contains(PlanFingerprints.semantic(entry.semanticKey()))
                        || qualityGuard.rejectionReason(text) != null
                        || qualityGuard.isDuplicateOfAny(text, state.emittedText)
                        || qualityGuard.isDuplicateOfAny(text, inputs.historyTexts())) {
                    continue;
                }
                state.usedSemanticKeys.add(entry.semanticKey());
                state.usedIntents.add(entry.actionIntent());
                state.fingerprints.add(PlanFingerprints.semantic(entry.semanticKey()));
                state.fingerprints.add(PlanFingerprints.areaIntent(candidate.area(), entry.actionIntent()));
                return new DailyActionsDTO.Caution(
                        clamp(shortTitle(text), 92),
                        text,
                        null,
                        buildWhy(candidate, candidate.area(), english)
                );
            }
        }
        return null;
    }

    /**
     * Only the Moon produces a defensible intraday peak, so that is the only slot that carries
     * real clock times. Without a peak the timeline stays empty instead of inventing hours.
     */
    private List<DailyActionsDTO.TimeSlot> buildTimeline(
            Inputs inputs,
            DailyActionsDTO.Caution caution,
            boolean english
    ) {
        if (inputs.moonPeak().isEmpty()) {
            return List.of();
        }
        TransitCalculator.MoonAspectPeak peak = inputs.moonPeak().get();
        LocalTime localPeak = peak.peakInstant().atZone(inputs.zone()).toLocalTime();

        String label = partOfDayLabel(localPeak, english);
        LocalTime start = localPeak.minusHours(1).withMinute(0);
        LocalTime end = localPeak.plusHours(2).withMinute(0);

        List<DailyActionsDTO.TimeSlot> slots = new ArrayList<>();
        slots.add(new DailyActionsDTO.TimeSlot(
                "slot-moon-peak",
                label,
                start.toString(),
                end.toString(),
                english
                        ? "The most emotionally loaded window of the day"
                        : "Günün duygusal olarak en yüklü aralığı",
                english
                        ? "The Moon's contact with your natal " + peak.natalPlanet()
                            + " is closest to exact here; reactions land harder than usual. "
                            + "Put the sentence you care about into this window deliberately, not by accident."
                        : "Ay'ın natal " + peak.natalPlanet() + " noktanızla teması bu aralıkta en keskin; "
                            + "tepkiler her zamankinden sert oturabilir. Önem verdiğiniz cümleyi bu aralığa "
                            + "denk getirmeyi bilinçli olarak seçin."
        ));

        if (caution != null && slots.size() < properties.getMaxTimelineSlots()) {
            String cautionLabel = partOfDayLabel(localPeak.plusHours(4), english);
            if (!cautionLabel.equals(label)) {
                slots.add(new DailyActionsDTO.TimeSlot(
                        "slot-caution",
                        cautionLabel,
                        null,
                        null,
                        caution.title(),
                        caution.description()
                ));
            }
        }
        return slots;
    }

    private DailyActionsDTO.EveningReflection buildReflection(
            LifeArea area, Inputs inputs, boolean english) {
        List<PersonalPlanCatalog.ReflectionCopy> pool = catalog.reflectionCandidates(area);
        if (pool.isEmpty()) {
            return null;
        }
        int offset = Math.floorMod(
                inputs.localDate().toEpochDay() + inputs.regenerationSalt(), pool.size());
        for (int step = 0; step < pool.size(); step++) {
            PersonalPlanCatalog.ReflectionCopy copy = pool.get((int) ((offset + step) % pool.size()));
            String question = copy.text(english);
            if (qualityGuard.isDuplicateOfAny(question, inputs.historyTexts())) {
                continue;
            }
            return new DailyActionsDTO.EveningReflection(question);
        }
        return new DailyActionsDTO.EveningReflection(pool.get(0).text(english));
    }

    private DailyActionsDTO.TimeWindow resolveWindow(Inputs inputs, boolean english) {
        if (inputs.moonPeak().isEmpty()) {
            return null;
        }
        TransitCalculator.MoonAspectPeak peak = inputs.moonPeak().get();
        LocalTime localPeak = peak.peakInstant().atZone(inputs.zone()).toLocalTime();
        return new DailyActionsDTO.TimeWindow(
                partOfDayLabel(localPeak, english),
                localPeak.minusHours(1).withMinute(0).toString(),
                localPeak.plusHours(2).withMinute(0).toString()
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy shape (v1 clients)
    // ─────────────────────────────────────────────────────────────────────────

    private List<DailyActionsDTO.ActionItem> buildLegacyActions(
            DailyActionsDTO.PrimaryAction primary,
            List<DailyActionsDTO.LifeAreaCard> cards,
            DailyActionsDTO.Caution caution
    ) {
        List<DailyActionsDTO.ActionItem> actions = new ArrayList<>();
        actions.add(new DailyActionsDTO.ActionItem(
                primary.id(),
                primary.title(),
                primary.description(),
                iconFor(primary.category()),
                null,
                null,
                primary.isDone(),
                primary.doneAt(),
                primary.relatedTransitIds()
        ));
        for (DailyActionsDTO.LifeAreaCard card : cards) {
            actions.add(new DailyActionsDTO.ActionItem(
                    card.id(),
                    card.title(),
                    card.description(),
                    iconFor(card.category()),
                    null,
                    null,
                    card.isDone(),
                    card.doneAt(),
                    List.of()
            ));
        }
        if (caution != null) {
            actions.add(new DailyActionsDTO.ActionItem(
                    "plan-caution",
                    caution.title(),
                    caution.description(),
                    "alert-circle",
                    null,
                    null,
                    false,
                    null,
                    List.of()
            ));
        }
        return actions;
    }

    private DailyActionsDTO.MiniPlan buildLegacyMiniPlan(
            DailyActionsDTO.PrimaryAction primary,
            List<DailyActionsDTO.LifeAreaCard> cards,
            boolean english
    ) {
        List<String> steps = new ArrayList<>();
        steps.add(primary.title());
        cards.forEach(card -> steps.add(card.title()));
        return new DailyActionsDTO.MiniPlan(english ? "Mini Plan" : "Mini Plan", steps);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Plain-language justification shown behind "Neden bu öneri?". Never exposes orb values or
     * aspect jargon — those stay in {@code astrologicalBasis} for debugging.
     */
    private String buildWhy(Selection selection, boolean english) {
        return buildWhy(selection.candidate(), selection.area(), english);
    }

    private String buildWhy(Candidate candidate, LifeArea area, boolean english) {
        String planet = displayPlanet(candidate, english);
        String areaLabel = area.label(english).toLowerCase(english ? Locale.ENGLISH : new Locale("tr"));
        boolean retro = isRetrogradeMention(candidate);

        if (english) {
            String motion = retro ? "'s retrograde motion" : "'s current position";
            return planet + motion + " is moving through your " + areaLabel
                    + " area today, which is why this suggestion sits there rather than anywhere else.";
        }
        String motion = retro ? " geri hareketi" : " güncel konumu";
        return planet + motion + " bugün " + areaLabel
                + " alanınızdan geçiyor; bu öneri başka bir alanda değil, tam da burada duruyor.";
    }

    private boolean isRetrogradeMention(Candidate candidate) {
        String impact = candidate.transit().impactPlain();
        if (impact == null) {
            return false;
        }
        String normalized = qualityGuard.normalize(impact);
        return normalized.contains("retro") || normalized.contains("geri hare");
    }

    private String displayPlanet(Candidate candidate, boolean english) {
        if (candidate.displayPlanet() != null && !candidate.displayPlanet().isBlank()) {
            return candidate.displayPlanet();
        }
        return candidate.canonicalPlanet() != null ? candidate.canonicalPlanet() : (english ? "Today's sky" : "Gökyüzü");
    }

    private String partOfDayLabel(LocalTime time, boolean english) {
        int hour = time.getHour();
        if (hour < 12) {
            return english ? "Morning" : "Sabah";
        }
        if (hour < 18) {
            return english ? "Afternoon" : "Öğleden sonra";
        }
        return english ? "Evening" : "Akşam";
    }

    /** First clause of the suggestion, so the card headline never repeats the whole body. */
    private String shortTitle(String description) {
        if (description == null || description.isBlank()) {
            return "";
        }
        String trimmed = description.trim();
        int cut = indexOfFirst(trimmed, ";", ":", ",");
        String head = cut > 24 ? trimmed.substring(0, cut) : trimmed;
        if (head.length() > 92) {
            int space = head.lastIndexOf(' ', 88);
            head = space > 30 ? head.substring(0, space) : head.substring(0, 88);
        }
        return head.endsWith(".") ? head.substring(0, head.length() - 1) : head;
    }

    private int indexOfFirst(String value, String... markers) {
        int best = -1;
        for (String marker : markers) {
            int index = value.indexOf(marker);
            if (index >= 0 && (best < 0 || index < best)) {
                best = index;
            }
        }
        return best;
    }

    private String actionId(Selection selection) {
        return "plan-" + selection.area().slug() + "-" + selection.variant().intent();
    }

    private String iconFor(String categorySlug) {
        LifeArea area;
        try {
            area = LifeArea.valueOf(categorySlug.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return "sparkles";
        }
        return switch (area) {
            case RELATIONSHIP -> "heart";
            case COMMUNICATION -> "chatbubble-ellipses";
            case WORK -> "briefcase";
            case MONEY -> "wallet";
            case FAMILY -> "home";
            case SOCIAL -> "people";
            case BOUNDARIES -> "shield-checkmark";
            case EMOTIONAL_BALANCE -> "pulse";
            case DECISION -> "git-compare";
            case REST -> "moon";
            case CREATIVITY -> "color-palette";
        };
    }

    private boolean isSupportive(String label) {
        String normalized = qualityGuard.normalize(label);
        return normalized.contains("destekleyici") || normalized.contains("supportive");
    }

    private String canonicalPlanet(String displayPlanet) {
        if (displayPlanet == null || displayPlanet.isBlank()) {
            return null;
        }
        String key = displayPlanet.trim().toLowerCase(new Locale("tr", "TR"));
        String mapped = PLANET_CANONICAL.get(key);
        if (mapped != null) {
            return mapped;
        }
        return PLANET_CANONICAL.get(qualityGuard.normalize(displayPlanet));
    }

    /** Stable per user/day/transit so the same day never reshuffles on refresh. */
    private int seed(PersonalPlanSignals signals, Candidate candidate) {
        String raw = signals.userId() + "|" + signals.localDate() + "|" + candidate.transit().id()
                + "|" + candidate.area().slug();
        return Math.abs(raw.hashCode());
    }

    private String clamp(String value, int maxLen) {
        String source = value == null ? "" : value.trim();
        return source.length() <= maxLen ? source : source.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }
}
