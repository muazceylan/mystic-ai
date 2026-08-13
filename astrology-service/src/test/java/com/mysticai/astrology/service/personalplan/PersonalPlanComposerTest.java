package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.dto.daily.PlanFeedbackReason;
import com.mysticai.astrology.dto.daily.UserPersonalContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PersonalPlanComposerTest {

    private static final LocalDate DATE = LocalDate.of(2026, 7, 30);
    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private PersonalPlanComposer composer;
    private PlanQualityGuard guard;
    private PersonalPlanProperties properties;

    @BeforeEach
    void setUp() {
        properties = new PersonalPlanProperties();
        guard = new PlanQualityGuard(properties);
        composer = new PersonalPlanComposer(new PersonalPlanCatalog(), guard, properties);
    }

    // ─── profileSignalsUsed accuracy ────────────────────────────────────────

    @Test
    @DisplayName("gender does not exist as an input, so it can never appear as a used signal")
    void genderIsNotAnInputAtAll() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Libra"), transits());

        assertThat(result.payload().profileSignalsUsed()).doesNotContain("gender");
        // The type system is the real guarantee: UserPersonalContext has no gender component.
        assertThat(java.util.Arrays.stream(UserPersonalContext.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName))
                .doesNotContain("gender");
        assertThat(java.util.Arrays.stream(PersonalPlanSignals.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName))
                .doesNotContain("gender", "genderProvided");
    }

    @Test
    @DisplayName("every reported signal names the decision it changed")
    void everyReportedSignalIsBackedByADecision() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Libra"), transits());

        for (String signal : result.payload().profileSignalsUsed()) {
            assertThat(result.signalUsage().decisionsFor(signal))
                    .as("signal '%s' is reported but influenced no decision", signal)
                    .isNotEmpty();
        }
        assertThat(result.payload().profileSignalsUsed())
                .containsExactlyElementsOf(result.signalUsage().usedSignals());
    }

    @Test
    @DisplayName("a signal that changed nothing is not reported")
    void unusedSignalsAreNotReported() {
        // No house data on any transit -> the natal-houses signal must not be claimed.
        PersonalPlanComposer.Composition result =
                compose(signals(fullProfile(), false, "Libra"), transitsWithoutHouses());

        assertThat(result.payload().profileSignalsUsed())
                .doesNotContain(SignalUsageRecorder.NATAL_HOUSES);
        assertThat(result.signalUsage().used(SignalUsageRecorder.NATAL_HOUSES)).isFalse();
    }

    @Test
    @DisplayName("relationship status is only claimed when it gated a variant")
    void relationshipStatusIsOnlyClaimedWhenItGates() {
        PersonalPlanComposer.Composition unknown =
                compose(signals(profile(null, LocalDate.of(1990, 5, 4)), false, "Libra"), transits());

        if (unknown.payload().profileSignalsUsed().contains(SignalUsageRecorder.RELATIONSHIP_STATUS)) {
            assertThat(unknown.signalUsage().decisionsFor(SignalUsageRecorder.RELATIONSHIP_STATUS))
                    .allSatisfy(decision -> assertThat(decision).contains("UNKNOWN"));
        }

        PersonalPlanComposer.Composition partnered =
                compose(signals(profile("Evli", LocalDate.of(1990, 5, 4)), false, "Libra"), transits());
        assertThat(partnered.payload().personalizationLevel()).isIn("HIGH", "MEDIUM", "LOW");
    }

    @Test
    @DisplayName("age band is only reported when its tie-break actually changed the variant")
    void ageBandIsOnlyClaimedWhenItChangesTheChoice() {
        for (LocalDate birthDate : List.of(LocalDate.of(2002, 1, 1), LocalDate.of(1962, 1, 1))) {
            PersonalPlanComposer.Composition result =
                    compose(signals(profile("Evli", birthDate), false, "Libra"), transits());

            if (result.payload().profileSignalsUsed().contains(SignalUsageRecorder.AGE_RANGE)) {
                assertThat(result.signalUsage().decisionsFor(SignalUsageRecorder.AGE_RANGE))
                        .as("age_range reported without a recorded decision")
                        .isNotEmpty()
                        .allSatisfy(decision -> assertThat(decision).contains("tie-break"));
            }
        }
    }

    @Test
    @DisplayName("age influences only ordering — it never invents a life event or role")
    void ageNeverImpliesLifeCircumstances() {
        String[] forbidden = {
                "cocugunuz", "cocuklarin", "emekli", "ogrenci", "esiniz", "kariyerinizde",
                "your child", "your children", "retirement", "retired", "student", "your spouse"
        };

        for (LocalDate birthDate : List.of(
                LocalDate.of(2003, 6, 1), LocalDate.of(1992, 6, 1),
                LocalDate.of(1978, 6, 1), LocalDate.of(1958, 6, 1))) {

            PersonalPlanComposer.Composition result =
                    compose(signals(profile(null, birthDate), false, "Libra"), transits());

            for (String text : allText(result.payload())) {
                String normalized = guard.normalize(text);
                for (String term : forbidden) {
                    assertThat(normalized)
                            .as("age-derived assumption '%s' leaked for birthDate=%s: %s", term, birthDate, text)
                            .doesNotContain(guard.normalize(term));
                }
            }
        }
    }

    @Test
    @DisplayName("personalizationLevel is derived from used signals, not from available fields")
    void personalizationLevelFollowsActualUsage() {
        // No houses or rising sign, but the natal-Sun target legitimately activates sun-sign copy.
        PersonalPlanSignals thin = PersonalPlanSignals.build(
                9L, DATE, false, fullProfile(), "Leo", null, null, false, 0, Set.of());
        PersonalPlanComposer.Composition result = compose(thin, transitsWithoutHouses());

        assertThat(result.payload().personalizationLevel()).isEqualTo("MEDIUM");
        assertThat(result.payload().profileSignalsUsed())
                .contains(SignalUsageRecorder.ACTIVE_TRANSITS, SignalUsageRecorder.SUN_SIGN);
    }

    // ─── semanticKey duplicate rules ────────────────────────────────────────

    @Test
    @DisplayName("one response never repeats a semanticKey, even across different life areas")
    void noRepeatedSemanticKeyWithinAResponse() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Aries"), transits());

        Set<String> keys = new HashSet<>();
        for (String fingerprint : result.fingerprints()) {
            if (PlanFingerprints.isSemantic(fingerprint)) {
                assertThat(keys.add(fingerprint))
                        .as("semanticKey %s appears twice in one response", fingerprint)
                        .isTrue();
            }
        }
        assertThat(keys).isNotEmpty();
    }

    @Test
    @DisplayName("a semanticKey used in the history window is not reused, even reworded")
    void semanticKeyHistoryBlocksReuse() {
        PersonalPlanComposer.Composition day1 = compose(signals(fullProfile(), false, "Virgo"), transits());
        Set<String> history = day1.fingerprints();

        PersonalPlanComposer.Composition day2 = composer.compose(new PersonalPlanComposer.Inputs(
                dto(transits()), signals(fullProfile(), false, "Virgo"), DATE.plusDays(1), ZONE,
                history, day1.highlightTexts(), Optional.empty(), 1, Instant.now()));

        assertThat(day2).isNotNull();
        Set<String> day1Keys = semanticKeys(day1);
        Set<String> day2Keys = semanticKeys(day2);
        assertThat(day2Keys).doesNotContainAnyElementsOf(day1Keys);
    }

    @Test
    @DisplayName("the same lifeArea+actionIntent pair is blocked for the configured window")
    void areaIntentHistoryBlocksReuse() {
        PersonalPlanComposer.Composition day1 = compose(signals(fullProfile(), false, "Virgo"), transits());

        Set<String> areaIntents = day1.fingerprints().stream()
                .filter(PlanFingerprints::isAreaIntent)
                .collect(java.util.stream.Collectors.toSet());
        assertThat(areaIntents).isNotEmpty();

        PersonalPlanComposer.Composition day2 = composer.compose(new PersonalPlanComposer.Inputs(
                dto(transits()), signals(fullProfile(), false, "Virgo"), DATE.plusDays(1), ZONE,
                day1.fingerprints(), List.of(), Optional.empty(), 1, Instant.now()));

        assertThat(day2.fingerprints().stream().filter(PlanFingerprints::isAreaIntent))
                .doesNotContainAnyElementsOf(areaIntents);
    }

    @Test
    @DisplayName("the Jaccard check still runs as a second layer on top of semanticKey")
    void paraphraseCheckStillApplies() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Aries"), transits());

        List<String> bodies = new ArrayList<>();
        bodies.add(result.payload().primaryAction().description());
        result.payload().lifeAreaCards().forEach(card -> bodies.add(card.description()));
        bodies.add(result.payload().caution().description());

        for (int i = 0; i < bodies.size(); i++) {
            for (int j = i + 1; j < bodies.size(); j++) {
                assertThat(guard.isDuplicate(bodies.get(i), bodies.get(j)))
                        .as("items %d and %d are paraphrases:%n%s%n%s", i, j, bodies.get(i), bodies.get(j))
                        .isFalse();
            }
        }
    }

    @Test
    @DisplayName("catalog exhaustion degrades explicitly instead of returning banned or stale copy")
    void catalogExhaustionSetsDegradedReason() {
        // Poison the history with every fingerprint the catalog could produce.
        Set<String> everything = new HashSet<>();
        PersonalPlanCatalog catalog = new PersonalPlanCatalog();
        catalog.allActionEntries().forEach(entry -> {
            everything.add(PlanFingerprints.semantic(entry.semanticKey()));
            everything.add(PlanFingerprints.areaIntent(entry.lifeArea(), entry.actionIntent()));
        });

        PersonalPlanComposer.Composition result = composer.compose(new PersonalPlanComposer.Inputs(
                dto(transits()), signals(fullProfile(), false, "Libra"), DATE, ZONE,
                everything, List.of(), Optional.empty(), 1, Instant.now()));

        assertThat(result).isNotNull();
        assertThat(result.payload().meta().degradedReason()).isEqualTo("history_window_relaxed_catalog_exhausted");
        // Degraded still means concrete: the quality guard is never bypassed.
        assertThat(guard.rejectionReason(result.payload().primaryAction().description())).isNull();
    }

    // ─── existing behavioural guarantees ────────────────────────────────────

    @Test
    @DisplayName("no emitted text is generic filler")
    void neverEmitsBannedGenericAdvice() {
        for (boolean english : new boolean[]{false, true}) {
            PersonalPlanComposer.Composition result =
                    compose(signals(profile(null, null), english, null), transits());

            for (String text : bodyText(result.payload())) {
                assertThat(guard.rejectionReason(text))
                        .as("generic body copy leaked (english=%s): %s", english, text).isNull();
            }
            for (String text : headlineText(result.payload())) {
                assertThat(guard.rejectionReason(text, true))
                        .as("generic headline leaked (english=%s): %s", english, text).isNull();
            }
        }
    }

    @Test
    @DisplayName("each card addresses a distinct life area")
    void lifeAreasAreDistinct() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Aries"), transits());

        Set<String> categories = new HashSet<>();
        categories.add(result.payload().primaryAction().category());
        result.payload().lifeAreaCards().forEach(card -> categories.add(card.category()));
        assertThat(categories).hasSize(1 + result.payload().lifeAreaCards().size());
    }

    @Test
    @DisplayName("the same user/local day always gets the same plan, so refresh does not reshuffle")
    void compositionIsDeterministicForTheSameDay() {
        PersonalPlanComposer.Inputs inputs = inputs(signals(fullProfile(), false, "Gemini"), transits(), 1);
        assertThat(composer.compose(inputs).payload().primaryAction().id())
                .isEqualTo(composer.compose(inputs).payload().primaryAction().id());
    }

    @Test
    @DisplayName("a later generation produces different content")
    void regenerationProducesDifferentContent() {
        PersonalPlanSignals signals = signals(fullProfile(), false, "Libra");
        PersonalPlanComposer.Composition first = composer.compose(inputs(signals, transits(), 1));
        PersonalPlanComposer.Composition second = composer.compose(inputs(signals, transits(), 2));

        assertThat(second.payload().primaryAction().description())
                .isNotEqualTo(first.payload().primaryAction().description());
        assertThat(second.payload().meta().generationNumber()).isEqualTo(2);
        assertThat(semanticKeys(second)).doesNotContainAnyElementsOf(semanticKeys(first));
    }

    @Test
    @DisplayName("canRegenerate reflects the configured budget")
    void regenerationBudgetIsExposed() {
        properties.setMaxRegenerationsPerDay(1);
        PersonalPlanComposer.Composition exhausted =
                composer.compose(inputs(signals(profile(null, null), false, "Aries"), transits(), 2));
        assertThat(exhausted.payload().meta().canRegenerate()).isFalse();
    }

    // ─── missing-data safety ────────────────────────────────────────────────

    @Test
    @DisplayName("unknown relationship status never yields partner-specific wording")
    void unknownRelationshipStatusStaysNeutral() {
        PersonalPlanComposer.Composition result =
                compose(signals(profile(null, null), false, null), transits());

        for (String text : allText(result.payload())) {
            String normalized = guard.normalize(text);
            assertThat(normalized)
                    .as("partner wording leaked for an unknown-status user: %s", text)
                    .doesNotContain("esiniz").doesNotContain("partneri")
                    .doesNotContain("your partner").doesNotContain("your spouse");
        }
    }

    @Test
    @DisplayName("'boşandı' / 'divorced' describes history, so status stays unknown")
    void ambiguousMaritalStatusIsTreatedAsUnknown() {
        assertThat(PersonalPlanSignals.RelationshipStatus.fromMaritalStatus("Boşandı"))
                .isEqualTo(PersonalPlanSignals.RelationshipStatus.UNKNOWN);
        assertThat(PersonalPlanSignals.RelationshipStatus.fromMaritalStatus("divorced"))
                .isEqualTo(PersonalPlanSignals.RelationshipStatus.UNKNOWN);
        assertThat(PersonalPlanSignals.RelationshipStatus.fromMaritalStatus("Evli"))
                .isEqualTo(PersonalPlanSignals.RelationshipStatus.PARTNERED);
        assertThat(PersonalPlanSignals.RelationshipStatus.fromMaritalStatus("Bekar"))
                .isEqualTo(PersonalPlanSignals.RelationshipStatus.SINGLE);
    }

    @Test
    @DisplayName("missing birth time drops houses but still produces a usable plan")
    void handlesMissingBirthTime() {
        PersonalPlanSignals noHouses = PersonalPlanSignals.build(
                7L, DATE, false, profile(null, LocalDate.of(1993, 3, 3)),
                "Pisces", null, null, false, 0, Set.of());

        assertThat(noHouses.hasBirthTime()).isFalse();
        PersonalPlanComposer.Composition result = compose(noHouses, transitsWithoutHouses());

        assertThat(result.payload().primaryAction().description()).isNotBlank();
        assertThat(guard.rejectionReason(result.payload().primaryAction().description())).isNull();
    }

    @Test
    @DisplayName("no profession is ever assumed, because the product never asks for one")
    void neverAssumesProfession() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Capricorn"), workHeavyTransits());

        String[] forbidden = {"ekibin", "musteri", "yoneticin", "toplanti", "kodun", "projen", "ofis", "sirket"};
        for (String text : allText(result.payload())) {
            String normalized = guard.normalize(text);
            for (String term : forbidden) {
                assertThat(normalized).as("profession assumed in: %s", text).doesNotContain(term);
            }
        }
    }

    // ─── astrological grounding ─────────────────────────────────────────────

    @Test
    @DisplayName("every suggestion carries a plain-language astrological reason")
    void everySuggestionIsAstrologicallyGrounded() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Scorpio"), transits());

        assertThat(result.payload().primaryAction().why()).isNotBlank().contains("somut nedeni");
        result.payload().lifeAreaCards().forEach(card -> assertThat(card.why()).isNotBlank());
        assertThat(result.payload().caution().why()).isNotBlank();
        assertThat(result.payload().primaryAction().why()).doesNotContain("orb");
    }

    @Test
    @DisplayName("the transited house decides the life area, not the planet alone")
    void lifeAreaFollowsTheTransitedHouse() {
        assertThat(LifeArea.fromHouse("7")).isEqualTo(LifeArea.RELATIONSHIP);
        assertThat(LifeArea.fromHouse("10")).isEqualTo(LifeArea.WORK);
        assertThat(LifeArea.fromHouse(null)).isNull();

        PersonalPlanComposer.Composition result = compose(
                signals(profile(null, null), false, "Taurus"),
                List.of(transit("t-house-7", "Merkür", "7", "Dikkat", 90)));

        assertThat(result.payload().primaryAction().category()).isEqualTo("relationship");
    }

    @Test
    @DisplayName("without a real intraday signal the timeline stays empty instead of faking clock times")
    void timelineIsEmptyWithoutARealTimeSignal() {
        PersonalPlanComposer.Composition result = compose(signals(profile(null, null), false, "Cancer"), transits());

        assertThat(result.payload().timeline()).isEmpty();
        assertThat(result.payload().primaryAction().timeWindow()).isNull();
    }

    @Test
    @DisplayName("structured Mercury retrograde creates sharp but probabilistic single-user copy")
    void structuredRetrogradeDrivesScenarioCopy() {
        PersonalPlanSignals single = signals(profile("Bekar", LocalDate.of(1992, 3, 8)), false, "Aries");
        PersonalPlanComposer.Composition result = compose(
                single, List.of(transit("retro-relationship", "Merkür", "7", "Dikkat", 96)));

        assertThat(result.payload().primaryAction().description())
                .startsWith("Merkür retrosu geçmişten birinin mesajını getirebilir")
                .doesNotContain("mesaj atacak");
        assertThat(result.payload().profileSignalsUsed())
                .contains(SignalUsageRecorder.RETROGRADES, SignalUsageRecorder.RELATIONSHIP_STATUS);
    }

    @Test
    @DisplayName("unknown relationship status never receives past-person wording")
    void unknownStatusDoesNotReceivePastPersonScenario() {
        PersonalPlanSignals unknown = signals(profile(null, LocalDate.of(1992, 3, 8)), false, "Aries");
        PersonalPlanComposer.Composition result = compose(
                unknown, List.of(transit("retro-neutral", "Merkür", "7", "Dikkat", 96)));

        assertThat(result.payload().primaryAction().description())
                .startsWith("Merkür retrosu yarım kalmış bir mesajı")
                .doesNotContain("geçmişten birinin");
    }

    @Test
    @DisplayName("sun-sign wording appears only when the transit targets the natal Sun")
    void signWordingRequiresMatchingNatalTarget() {
        PersonalPlanSignals ariesSun = PersonalPlanSignals.build(
                77L, DATE, false, profile(null, LocalDate.of(1992, 3, 8)),
                "Aries", "Cancer", null, true, 0, Set.of());
        DailyTransitsDTO noRetro = dto(
                List.of(transit("sun-family", "Mars", "4", "Dikkat", 96)), List.of());
        PersonalPlanComposer.Composition result = composer.compose(new PersonalPlanComposer.Inputs(
                noRetro, ariesSun, DATE, ZONE, Set.of(), List.of(), Optional.empty(), 1, Instant.now()));

        assertThat(result.payload().primaryAction().description()).startsWith("Koç vurgunuz");
        assertThat(result.payload().profileSignalsUsed()).contains(SignalUsageRecorder.SUN_SIGN);
    }

    /**
     * The home card renders headline in its title style and body under the "key move" eyebrow,
     * so the headline is a heading (no terminal punctuation) and the body a complete instruction.
     */
    @Test
    @DisplayName("home teaser pairs a bounded heading with a complete instruction")
    void homeTeaserIsCompleteAndBounded() {
        PersonalPlanComposer.Composition result = compose(signals(fullProfile(), false, "Libra"), transits());

        assertThat(result.payload().homeTeaser()).isNotNull();
        assertThat(result.payload().homeTeaser().headline())
                .isNotBlank()
                .doesNotEndWith(".")
                .hasSizeLessThanOrEqualTo(60);
        assertThat(result.payload().homeTeaser().body())
                .matches(".*[.!?]$")
                .hasSizeLessThanOrEqualTo(160);
    }

    @Test
    @DisplayName("user seed produces multiple variants for the same sky")
    void differentUsersDoNotAllReceiveTheSamePlan() {
        Set<String> descriptions = new HashSet<>();
        for (long userId = 1; userId <= 16; userId++) {
            PersonalPlanSignals userSignals = PersonalPlanSignals.build(
                    userId, DATE, false, profile(null, LocalDate.of(1992, 3, 8)),
                    "Libra", "Cancer", null, true, 1, Set.of());
            descriptions.add(compose(userSignals, transits()).payload().primaryAction().description());
        }
        assertThat(descriptions).hasSizeGreaterThanOrEqualTo(4);
    }

    @Test
    @DisplayName("same Scorpio Sun with different natal and transit context produces semantically different plans")
    void sameSunSignDifferentChartsProduceDifferentPlans() {
        PersonalPlanSignals userA = PersonalPlanSignals.build(
                101L, DATE, false, profile(null, LocalDate.of(1990, 11, 4)),
                "Scorpio", "Taurus", "Capricorn", true, 0, Set.of());
        PersonalPlanSignals userB = PersonalPlanSignals.build(
                202L, DATE, false, profile(null, LocalDate.of(1992, 11, 12)),
                "Scorpio", "Pisces", "Gemini", true, 0, Set.of());

        PersonalPlanComposer.Composition planA = compose(userA, List.of(
                transit("a-mars-7", "Mars", "7", "Dikkat", 98),
                transit("a-venus-2", "Venüs", "2", "Destekleyici", 82),
                transit("a-moon-4", "Ay", "4", "Destekleyici", 74)));
        PersonalPlanComposer.Composition planB = compose(userB, List.of(
                transit("b-saturn-10", "Satürn", "10", "Dikkat", 120),
                transit("b-mercury-3", "Merkür", "3", "Destekleyici", 82),
                transit("b-jupiter-9", "Jüpiter", "9", "Destekleyici", 74)));

        DailyActionsDTO left = planA.payload();
        DailyActionsDTO right = planB.payload();

        assertThat(left.mainTheme().title()).isNotEqualTo(right.mainTheme().title());
        assertThat(left.primaryAction().category()).isEqualTo("relationship");
        assertThat(right.primaryAction().category()).isEqualTo("work");
        assertThat(left.primaryAction().description()).isNotEqualTo(right.primaryAction().description());
        assertThat(left.caution().description()).isNotEqualTo(right.caution().description());
        assertThat(left.lifeAreaCards().stream().map(DailyActionsDTO.LifeAreaCard::category).toList())
                .doesNotContainSequence(
                        right.lifeAreaCards().stream().map(DailyActionsDTO.LifeAreaCard::category).toList());
    }

    @Test
    @DisplayName("same Sun and sky with a relevant rising-sign ruler changes the leading life area")
    void sameSunDifferentRisingSignChangesPlanWhereRelevant() {
        UserPersonalContext context = profile(null, LocalDate.of(1991, 11, 8));
        PersonalPlanSignals ariesRising = PersonalPlanSignals.build(
                301L, DATE, false, context, "Scorpio", "Taurus", "Aries", true, 0, Set.of());
        PersonalPlanSignals geminiRising = PersonalPlanSignals.build(
                302L, DATE, false, context, "Scorpio", "Taurus", "Gemini", true, 0, Set.of());
        List<DailyTransitsDTO.TransitItem> tiedSky = List.of(
                transit("mars-7", "Mars", "7", "Dikkat", 90),
                transit("mercury-3", "Merkür", "3", "Dikkat", 90),
                transit("venus-2", "Venüs", "2", "Destekleyici", 76));

        DailyActionsDTO ariesPlan = compose(ariesRising, tiedSky).payload();
        DailyActionsDTO geminiPlan = compose(geminiRising, tiedSky).payload();

        assertThat(ariesPlan.primaryAction().category()).isEqualTo("relationship");
        assertThat(geminiPlan.primaryAction().category()).isEqualTo("communication");
        assertThat(ariesPlan.primaryAction().description())
                .isNotEqualTo(geminiPlan.primaryAction().description());
    }

    @Test
    @DisplayName("NOT_RELEVANT feedback lowers that life area's priority without removing it from the catalog")
    void notRelevantFeedbackLowersLifeAreaPriority() {
        PersonalPlanSignals base = PersonalPlanSignals.build(
                401L, DATE, false, profile(null, LocalDate.of(1991, 4, 2)),
                "Aries", "Cancer", null, true, 0, Set.of());
        PersonalPlanSignals adjusted = PersonalPlanSignals.build(
                401L, DATE, false, profile(null, LocalDate.of(1991, 4, 2)),
                "Aries", "Cancer", null, true, 0, Set.of(PlanFeedbackReason.NOT_RELEVANT),
                Map.of(LifeArea.RELATIONSHIP, -30), Set.of());
        List<DailyTransitsDTO.TransitItem> sky = List.of(
                transit("mercury-7", "Merkür", "7", "Dikkat", 90),
                transit("saturn-10", "Satürn", "10", "Dikkat", 88),
                transit("venus-2", "Venüs", "2", "Destekleyici", 74));

        DailyActionsDTO original = compose(base, sky).payload();
        PersonalPlanComposer.Composition changed = compose(adjusted, sky);

        assertThat(original.primaryAction().category()).isEqualTo("relationship");
        assertThat(changed.payload().primaryAction().category()).isEqualTo("work");
        assertThat(changed.payload().profileSignalsUsed()).contains(SignalUsageRecorder.PREVIOUS_FEEDBACK);
    }

    @Test
    @DisplayName("HELPFUL feedback can favor an eligible action family while history guards still apply")
    void helpfulFeedbackFavorsEligibleVariantFamily() {
        PersonalPlanSignals base = signals(profile(null, LocalDate.of(1991, 4, 2)), false, null);
        DailyActionsDTO original = compose(base, transits()).payload();
        String originalIntent = original.primaryAction().id().substring(original.primaryAction().id().lastIndexOf('-') + 1);
        String preferredIntent = new PersonalPlanCatalog().actionCandidates(
                        LifeArea.RELATIONSHIP, PersonalPlanCatalog.Tone.CAUTION, PlanetRole.WORD).stream()
                .map(PersonalPlanCatalog.CatalogEntry::actionIntent)
                .filter(intent -> !intent.equals(originalIntent))
                .findFirst()
                .orElseThrow();
        PersonalPlanSignals preferred = PersonalPlanSignals.build(
                base.userId(), base.localDate(), base.english(), profile(null, LocalDate.of(1991, 4, 2)),
                base.sunSign(), base.moonSign(), base.risingSign(), base.hasHouses(), base.retrogradeCount(),
                Set.of(), Map.of(LifeArea.RELATIONSHIP, 4), Set.of(preferredIntent));

        PersonalPlanComposer.Composition changed = compose(preferred, transits());

        assertThat(changed.payload().primaryAction().id()).endsWith("-" + preferredIntent);
        assertThat(changed.payload().profileSignalsUsed()).contains(SignalUsageRecorder.PREVIOUS_FEEDBACK);
    }

    // ─── fixtures ───────────────────────────────────────────────────────────

    private PersonalPlanComposer.Composition compose(
            PersonalPlanSignals signals, List<DailyTransitsDTO.TransitItem> items) {
        PersonalPlanComposer.Composition result = composer.compose(inputs(signals, items, 1));
        assertThat(result).isNotNull();
        return result;
    }

    private PersonalPlanComposer.Inputs inputs(
            PersonalPlanSignals signals, List<DailyTransitsDTO.TransitItem> items, int generationNumber) {
        return new PersonalPlanComposer.Inputs(
                dto(items), signals, DATE, ZONE, Set.of(), List.of(),
                Optional.empty(), generationNumber, Instant.parse("2026-07-30T09:00:00Z"));
    }

    private Set<String> semanticKeys(PersonalPlanComposer.Composition composition) {
        return composition.fingerprints().stream()
                .filter(PlanFingerprints::isSemantic)
                .collect(java.util.stream.Collectors.toSet());
    }

    private DailyTransitsDTO dto(List<DailyTransitsDTO.TransitItem> items) {
        return dto(items, List.of(new DailyTransitsDTO.RetrogradeItem("Merkür", "Merkür retrosu", "Med")));
    }

    private DailyTransitsDTO dto(
            List<DailyTransitsDTO.TransitItem> items,
            List<DailyTransitsDTO.RetrogradeItem> retrogrades) {
        return new DailyTransitsDTO(
                DATE.toString(), "Bugünün Gökyüzü Etkileri",
                new DailyTransitsDTO.Hero("Başlık", "Destek", "Sakin", 60, "moon", "purpleMist"),
                List.of(), new DailyTransitsDTO.TodayCanDo("h", "b", "cta", "TodayActions"),
                List.of(), retrogrades,
                items);
    }

    private UserPersonalContext profile(String maritalStatus, LocalDate birthDate) {
        return new UserPersonalContext(1L, birthDate, false, maritalStatus, "Europe/Istanbul");
    }

    private UserPersonalContext fullProfile() {
        return profile("Evli", LocalDate.of(1990, 5, 4));
    }

    private PersonalPlanSignals signals(UserPersonalContext profile, boolean english, String risingSign) {
        return PersonalPlanSignals.build(
                1L, DATE, english, profile, "Libra", "Cancer", risingSign, true, 1, Set.of());
    }

    private List<DailyTransitsDTO.TransitItem> transits() {
        return List.of(
                transit("t-1", "Merkür", "7", "Dikkat", 90),
                transit("t-2", "Satürn", "10", "Dikkat", 84),
                transit("t-3", "Venüs", "2", "Destekleyici", 76),
                transit("t-4", "Ay", "4", "Destekleyici", 70));
    }

    private List<DailyTransitsDTO.TransitItem> workHeavyTransits() {
        return List.of(
                transit("t-w1", "Satürn", "10", "Dikkat", 92),
                transit("t-w2", "Mars", "6", "Dikkat", 80));
    }

    /** Unknown birth time: no house data on any transit. */
    private List<DailyTransitsDTO.TransitItem> transitsWithoutHouses() {
        return List.of(
                transit("t-nh1", "Merkür", null, "Dikkat", 70),
                transit("t-nh2", "Venüs", null, "Destekleyici", 62));
    }

    private DailyTransitsDTO.TransitItem transit(
            String id, String planet, String house, String label, int importance) {
        return new DailyTransitsDTO.TransitItem(
                id, planet + " etkisi", planet + " bugün belirgin.", label, "Ruh Hali", null, importance,
                new DailyTransitsDTO.Technical(planet, "Güneş", "Kavuşum", 1.2, null, house),
                null, null, importance, "Yüksek", "reason", "technical");
    }

    /** Advice bodies and questions — held to the strict quality floor. */
    private List<String> bodyText(DailyActionsDTO payload) {
        List<String> texts = new ArrayList<>();
        if (payload.mainTheme() != null) texts.add(payload.mainTheme().description());
        if (payload.primaryAction() != null) texts.add(payload.primaryAction().description());
        if (payload.lifeAreaCards() != null) payload.lifeAreaCards().forEach(c -> texts.add(c.description()));
        if (payload.caution() != null) texts.add(payload.caution().description());
        if (payload.eveningReflection() != null) texts.add(payload.eveningReflection().question());
        if (payload.timeline() != null) payload.timeline().forEach(s -> texts.add(s.description()));
        return texts.stream().filter(t -> t != null && !t.isBlank()).toList();
    }

    /** Titles — terser by design, but still must not be motivational filler. */
    private List<String> headlineText(DailyActionsDTO payload) {
        List<String> texts = new ArrayList<>();
        if (payload.mainTheme() != null) texts.add(payload.mainTheme().title());
        if (payload.primaryAction() != null) texts.add(payload.primaryAction().title());
        if (payload.lifeAreaCards() != null) payload.lifeAreaCards().forEach(c -> texts.add(c.title()));
        if (payload.caution() != null) texts.add(payload.caution().title());
        if (payload.timeline() != null) payload.timeline().forEach(s -> texts.add(s.title()));
        return texts.stream().filter(t -> t != null && !t.isBlank()).toList();
    }

    private List<String> allText(DailyActionsDTO payload) {
        List<String> texts = new ArrayList<>(bodyText(payload));
        texts.addAll(headlineText(payload));
        if (payload.mainTheme() != null && payload.mainTheme().why() != null) {
            texts.add(payload.mainTheme().why());
        }
        if (payload.primaryAction() != null && payload.primaryAction().why() != null) {
            texts.add(payload.primaryAction().why());
        }
        return texts;
    }
}
