package com.mysticai.astrology.service.personalplan;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import com.mysticai.astrology.dto.daily.DailyTransitsDTO;
import com.mysticai.astrology.dto.daily.PlanFeedbackReason;
import com.mysticai.astrology.dto.daily.PlanFeedbackResponse;
import com.mysticai.astrology.dto.daily.UserPersonalContext;
import com.mysticai.astrology.entity.DailyPersonalPlan;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.UserFeedback;
import com.mysticai.astrology.repository.DailyActionStateRepository;
import com.mysticai.astrology.repository.DailyPersonalPlanRepository;
import com.mysticai.astrology.repository.UserFeedbackRepository;
import com.mysticai.astrology.service.TransitCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonalPlanServiceTest {

    private static final LocalDate LOCAL_DATE = LocalDate.of(2026, 7, 30);
    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    @Mock
    private UserPersonalContextClient personalContextClient;
    @Mock
    private DailyPersonalPlanRepository planRepository;
    @Mock
    private DailyActionStateRepository actionStateRepository;
    @Mock
    private UserFeedbackRepository feedbackRepository;
    @Mock
    private TransitCalculator transitCalculator;

    private PersonalPlanService service;
    private PersonalPlanProperties properties;
    private final List<DailyPersonalPlan> savedPlans = new ArrayList<>();

    @BeforeEach
    void setUp() {
        properties = new PersonalPlanProperties();
        PlanQualityGuard guard = new PlanQualityGuard(properties);
        PersonalPlanComposer composer = new PersonalPlanComposer(new PersonalPlanCatalog(), guard, properties);

        service = new PersonalPlanService(
                composer, properties, personalContextClient, planRepository,
                actionStateRepository, feedbackRepository, transitCalculator, new ObjectMapper());

        savedPlans.clear();
        lenient().when(personalContextClient.fetch(anyLong())).thenReturn(profile());
        lenient().when(planRepository.findByUserIdAndLocalDateAndLocaleAndStatus(anyLong(), any(), anyString(), any()))
                .thenReturn(Optional.empty());
        lenient().when(planRepository.findActiveForUpdate(anyLong(), any(), anyString()))
                .thenReturn(Optional.empty());
        lenient().when(planRepository.findByUserIdAndLocalDateAndLocaleAndRegenerationRequestKey(
                anyLong(), any(), anyString(), anyString())).thenReturn(Optional.empty());
        lenient().when(planRepository.findHistory(anyLong(), anyString(), any(), any())).thenReturn(List.of());
        lenient().when(planRepository.findMaxGenerationNumber(anyLong(), any(), anyString())).thenReturn(1);
        lenient().when(planRepository.save(any())).thenAnswer(invocation -> {
            DailyPersonalPlan plan = invocation.getArgument(0);
            if (plan.getId() == null) {
                plan.setId((long) (savedPlans.size() + 100));
            }
            savedPlans.add(plan);
            return plan;
        });
        lenient().when(actionStateRepository.findByUserIdAndActionDate(anyLong(), any())).thenReturn(List.of());
        lenient().when(feedbackRepository.findTop120ByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
        lenient().when(feedbackRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(transitCalculator.findMoonAspectPeak(any(), any(), any())).thenReturn(Optional.empty());
    }

    // ─── read path ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("a freshly composed plan is stored ACTIVE with local date, timezone and generation 1")
    void persistsComposedPlanWithLocalDayIdentity() {
        DailyActionsDTO plan = service.buildPlan(request());

        assertThat(plan.primaryAction()).isNotNull();

        ArgumentCaptor<DailyPersonalPlan> captor = ArgumentCaptor.forClass(DailyPersonalPlan.class);
        verify(planRepository).save(captor.capture());
        DailyPersonalPlan saved = captor.getValue();

        assertThat(saved.getLocalDate()).isEqualTo(LOCAL_DATE);
        assertThat(saved.getTimezone()).isEqualTo("Europe/Istanbul");
        assertThat(saved.getAlgorithmVersion()).isEqualTo(properties.getVersion());
        assertThat(saved.getGenerationNumber()).isEqualTo(1);
        assertThat(saved.getStatus()).isEqualTo(DailyPersonalPlan.Status.ACTIVE);
        assertThat(saved.getFingerprints()).contains("sk:").contains("ai:");
        assertThat(saved.getPayloadJson()).contains("primaryAction");
    }

    @Test
    @DisplayName("an unparseable stored plan is recomposed rather than surfaced as an error")
    void recomposesWhenStoredPayloadIsCorrupt() {
        DailyPersonalPlan corrupt = storedPlan(1, DailyPersonalPlan.Status.ACTIVE);
        corrupt.setPayloadJson("{not-json");
        when(planRepository.findByUserIdAndLocalDateAndLocaleAndStatus(
                1L, LOCAL_DATE, "tr", DailyPersonalPlan.Status.ACTIVE)).thenReturn(Optional.of(corrupt));

        DailyActionsDTO plan = service.buildPlan(request());

        assertThat(plan.primaryAction()).isNotNull();
        assertThat(plan.meta().source()).isEqualTo("rule_based");
        assertThat(corrupt.getStatus()).isEqualTo(DailyPersonalPlan.Status.REPLACED);
    }

    @Test
    @DisplayName("when there are no transits at all, the fallback carries real sky data and no filler")
    void minimalFallbackIsAstrologicalNotMotivational() {
        DailyActionsDTO plan = service.buildPlan(new PersonalPlanService.PlanRequest(
                1L, LOCAL_DATE, ZONE, "tr", false, emptyTransits(), chart(), List.of()));

        assertThat(plan.meta().source()).isEqualTo("minimal_fallback");
        assertThat(plan.meta().degradedReason()).isEqualTo("no_usable_transit_content");
        assertThat(plan.mainTheme().title()).isEqualTo("Sakin bir gökyüzü");

        PlanQualityGuard guard = new PlanQualityGuard(properties);
        assertThat(guard.normalize(plan.mainTheme().description()))
                .doesNotContain("sezgini dinle")
                .doesNotContain("kucuk bir adim at")
                .doesNotContain("tek ise odaklan");
    }

    @Test
    @DisplayName("a profile lookup failure degrades to a chart-only plan instead of breaking")
    void survivesProfileLookupFailure() {
        when(personalContextClient.fetch(1L)).thenReturn(UserPersonalContext.empty(1L));

        DailyActionsDTO plan = service.buildPlan(request());

        assertThat(plan.primaryAction()).isNotNull();
        assertThat(plan.profileSignalsUsed())
                .doesNotContain(SignalUsageRecorder.RELATIONSHIP_STATUS, SignalUsageRecorder.AGE_RANGE);
    }

    // ─── feedback: atomic regeneration ──────────────────────────────────────

    @Test
    @DisplayName("'Çok genel' rebuilds the plan inside the same call and returns it inline")
    void tooGenericReturnsReplacementPlanInline() {
        DailyPersonalPlan active = storedPlan(1, DailyPersonalPlan.Status.ACTIVE);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));

        PlanFeedbackResponse response = service.submitFeedback(
                request(), "plan-relationship-x", "down", PlanFeedbackReason.TOO_GENERIC, null);

        assertThat(response.accepted()).isTrue();
        assertThat(response.regenerated()).isTrue();
        assertThat(response.regenerationReason()).isEqualTo("TOO_GENERIC");
        assertThat(response.replacementPlan()).isNotNull();
        assertThat(response.replacementPlan().primaryAction()).isNotNull();
        assertThat(response.generationNumber()).isEqualTo(2);
        assertThat(response.remainingRegenerations()).isEqualTo(1);

        // Previous plan retired, new one stored ACTIVE with the idempotency key set.
        assertThat(active.getStatus()).isEqualTo(DailyPersonalPlan.Status.REPLACED);
        DailyPersonalPlan created = savedPlans.get(savedPlans.size() - 1);
        assertThat(created.getStatus()).isEqualTo(DailyPersonalPlan.Status.ACTIVE);
        assertThat(created.getGenerationNumber()).isEqualTo(2);
        assertThat(created.getRegenerationRequestKey()).isNotBlank();
    }

    @Test
    @DisplayName("the replacement never repeats a semanticKey from the plan it replaced")
    void replacementDiffersFromThePlanItReplaced() {
        DailyActionsDTO original = service.buildPlan(request());
        DailyPersonalPlan active = savedPlans.get(0);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));
        when(planRepository.findHistory(anyLong(), anyString(), any(), any())).thenReturn(List.of(active));

        PlanFeedbackResponse response = service.submitFeedback(
                request(), "plan-x", "down", PlanFeedbackReason.REPETITIVE, null);

        assertThat(response.regenerated()).isTrue();
        assertThat(response.replacementPlan().primaryAction().description())
                .isNotEqualTo(original.primaryAction().description());

        DailyPersonalPlan replacement = savedPlans.get(savedPlans.size() - 1);
        assertThat(semanticKeys(replacement)).doesNotContainAnyElementsOf(semanticKeys(active));
    }

    @Test
    @DisplayName("resubmitting the same feedback returns the plan already produced, without spending budget")
    void repeatedFeedbackIsIdempotent() {
        DailyPersonalPlan active = storedPlan(1, DailyPersonalPlan.Status.ACTIVE);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));

        DailyPersonalPlan alreadyBuilt = storedPlan(2, DailyPersonalPlan.Status.ACTIVE);
        alreadyBuilt.setPayloadJson(validPayloadJson());
        when(planRepository.findByUserIdAndLocalDateAndLocaleAndRegenerationRequestKey(
                anyLong(), any(), anyString(), anyString())).thenReturn(Optional.of(alreadyBuilt));

        PlanFeedbackResponse response = service.submitFeedback(
                request(), "plan-x", "down", PlanFeedbackReason.TOO_GENERIC, null);

        assertThat(response.regenerated()).isTrue();
        assertThat(response.generationNumber()).isEqualTo(2);
        // Only the feedback row was written; no second plan was composed or stored.
        assertThat(savedPlans).isEmpty();
        assertThat(active.getStatus()).isEqualTo(DailyPersonalPlan.Status.ACTIVE);
    }

    @Test
    @DisplayName("'Bana uydu' and 'Faydalı değildi' are recorded but never rebuild the plan")
    void nonRegeneratingReasonsLeaveThePlanAlone() {
        assertThat(service.submitFeedback(request(), "x", "up", PlanFeedbackReason.HELPFUL, null).regenerated())
                .isFalse();
        assertThat(service.submitFeedback(request(), "x", "down", PlanFeedbackReason.NOT_USEFUL, null).regenerated())
                .isFalse();
        assertThat(service.submitFeedback(request(), "x", "down", null, null).regenerated()).isFalse();

        verify(feedbackRepository, times(3)).save(any());
        verify(planRepository, never()).save(any());
    }

    @Test
    @DisplayName("when the budget is spent the feedback is still recorded, with regenerated=false")
    void budgetExhaustedStillRecordsFeedback() {
        properties.setMaxRegenerationsPerDay(2);
        DailyPersonalPlan active = storedPlan(3, DailyPersonalPlan.Status.ACTIVE);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));

        PlanFeedbackResponse response = service.submitFeedback(
                request(), "plan-x", "down", PlanFeedbackReason.TOO_GENERIC, null);

        assertThat(response.accepted()).isTrue();
        assertThat(response.regenerated()).isFalse();
        assertThat(response.remainingRegenerations()).isZero();
        assertThat(response.replacementPlan()).isNull();
        verify(feedbackRepository).save(any(UserFeedback.class));
        assertThat(active.getStatus()).isEqualTo(DailyPersonalPlan.Status.ACTIVE);
        assertThat(savedPlans).isEmpty();
    }

    @Test
    @DisplayName("if the rebuild produces nothing, the existing plan stays ACTIVE")
    void failedRegenerationKeepsTheExistingPlan() {
        DailyPersonalPlan active = storedPlan(1, DailyPersonalPlan.Status.ACTIVE);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));

        // No transits at all → composition returns null.
        PersonalPlanService.PlanRequest barren = new PersonalPlanService.PlanRequest(
                1L, LOCAL_DATE, ZONE, "tr", false, emptyTransits(), chart(), List.of());

        PlanFeedbackResponse response = service.submitFeedback(
                barren, "plan-x", "down", PlanFeedbackReason.TOO_GENERIC, null);

        assertThat(response.accepted()).isTrue();
        assertThat(response.regenerated()).isFalse();
        assertThat(response.replacementPlan()).isNull();
        assertThat(active.getStatus()).isEqualTo(DailyPersonalPlan.Status.ACTIVE);
        assertThat(savedPlans).isEmpty();
    }

    @Test
    @DisplayName("regeneration takes the ACTIVE row under a pessimistic lock")
    void regenerationLocksTheActiveRow() {
        DailyPersonalPlan active = storedPlan(1, DailyPersonalPlan.Status.ACTIVE);
        when(planRepository.findActiveForUpdate(1L, LOCAL_DATE, "tr")).thenReturn(Optional.of(active));

        service.submitFeedback(request(), "plan-x", "down", PlanFeedbackReason.TOO_GENERIC, null);

        verify(planRepository).findActiveForUpdate(1L, LOCAL_DATE, "tr");
    }

    // ─── fixtures ───────────────────────────────────────────────────────────

    private PersonalPlanService.PlanRequest request() {
        return new PersonalPlanService.PlanRequest(
                1L, LOCAL_DATE, ZONE, "tr", false, transits(), chart(), List.of());
    }

    private java.util.Set<String> semanticKeys(DailyPersonalPlan plan) {
        if (plan.getFingerprints() == null) {
            return java.util.Set.of();
        }
        return java.util.Arrays.stream(plan.getFingerprints().split(","))
                .filter(PlanFingerprints::isSemantic)
                .collect(java.util.stream.Collectors.toSet());
    }

    private String validPayloadJson() {
        return """
                {"date":"2026-07-30","header":{"title":"t","subtitle":"s"},"actions":[],
                 "miniPlan":{"title":"Mini Plan","steps":[]},
                 "primaryAction":{"id":"p","category":"relationship","categoryLabel":"İlişkiler",
                 "title":"t","description":"d","isDone":false}}
                """;
    }

    private DailyPersonalPlan storedPlan(int generationNumber, DailyPersonalPlan.Status status) {
        return DailyPersonalPlan.builder()
                .id(1L).userId(1L).localDate(LOCAL_DATE).timezone("Europe/Istanbul").locale("tr")
                .algorithmVersion(properties.getVersion())
                .generationNumber(generationNumber)
                .status(status)
                .contextHash("hash")
                .payloadJson("{}")
                .fingerprints("sk:LIMIT_TO_SINGLE_ISSUE,ai:relationship:name_single_behaviour")
                .build();
    }

    private UserPersonalContext profile() {
        return new UserPersonalContext(1L, LocalDate.of(1990, 5, 4), false, "Evli", "Europe/Istanbul");
    }

    private NatalChart chart() {
        return NatalChart.builder()
                .id(1L).userId("1")
                .sunSign("Libra").moonSign("Cancer").risingSign("Sagittarius")
                .housePlacementsJson("[{\"house\":1,\"sign\":\"Sagittarius\",\"degree\":10}]")
                .build();
    }

    private DailyTransitsDTO transits() {
        return new DailyTransitsDTO(
                LOCAL_DATE.toString(), "Bugünün Gökyüzü Etkileri",
                new DailyTransitsDTO.Hero("Başlık", "Destek", "Sakin", 60, "moon", "purpleMist"),
                List.of(), new DailyTransitsDTO.TodayCanDo("h", "b", "c", "TodayActions"),
                List.of(), List.of(new DailyTransitsDTO.RetrogradeItem("Merkür", "Merkür retrosu", "Med")),
                List.of(
                        transitItem("t-1", "Merkür", "7", "Dikkat", 90),
                        transitItem("t-2", "Satürn", "10", "Dikkat", 80),
                        transitItem("t-3", "Venüs", "2", "Destekleyici", 72)));
    }

    private DailyTransitsDTO emptyTransits() {
        return new DailyTransitsDTO(
                LOCAL_DATE.toString(), "Bugünün Gökyüzü Etkileri",
                new DailyTransitsDTO.Hero(
                        "Sakin bir gökyüzü",
                        "Haritanızla kesişen belirgin bir sert açı bugün oluşmuyor; gökyüzü tarafındaki hareket zayıf.",
                        "Sakin", 20, "moon", "purpleMist"),
                List.of(), new DailyTransitsDTO.TodayCanDo("h", "b", "c", "TodayActions"),
                List.of(), List.of(), List.of());
    }

    private DailyTransitsDTO.TransitItem transitItem(
            String id, String planet, String house, String label, int importance) {
        return new DailyTransitsDTO.TransitItem(
                id, planet + " etkisi", planet + " bugün belirgin.", label, "Ruh Hali", null, importance,
                new DailyTransitsDTO.Technical(planet, "Güneş", "Kavuşum", 1.1, null, house),
                null, null, importance, "Yüksek", "reason", "technical");
    }
}
