package com.mysticai.astrology.service.personalplan;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The refiner's contract is that a hostile or broken model can only ever cost us the rule-based
 * wording. Each case here feeds a specific kind of bad response and asserts the composed copy
 * survives it.
 */
@ExtendWith(MockitoExtension.class)
class PersonalPlanRefinerTest {

    private static final String PRIMARY_TITLE = "Belirsiz beklentiyi netleştirin";
    private static final String PRIMARY_BODY =
            "Venüs etkisi geciken bir cevabı olduğundan daha kişisel algılatabilir. "
                    + "Uzun süredir belirsiz kalan bir beklentiyi tek cümleyle söyleyin.";
    private static final String CAUTION_TITLE = "Kısa cevabı ret sanmayın";
    private static final String CAUTION_BODY =
            "Kısa gelen bir cevabı reddedilme olarak okuma eğiliminiz bugün artabilir. "
                    + "Karşılık vermeden önce ne kastedildiğini sorun.";

    @Mock
    private PersonalPlanAiClient aiClient;

    private PersonalPlanProperties properties;
    private PersonalPlanRefiner refiner;

    @BeforeEach
    void setUp() {
        properties = new PersonalPlanProperties();
        properties.setAiRefinementEnabled(true);
        refiner = new PersonalPlanRefiner(
                aiClient, new PlanQualityGuard(properties), properties, new ObjectMapper());
    }

    @Test
    @DisplayName("refinement is skipped entirely while the flag is off")
    void disabledFlagSkipsTheCallAltogether() {
        properties.setAiRefinementEnabled(false);
        DailyActionsDTO payload = payload();

        assertThat(refiner.refine(payload, "tr")).isSameAs(payload);
        verify(aiClient, never()).refine(anyString(), any());
    }

    @Test
    @DisplayName("an unavailable orchestrator leaves the plan exactly as composed")
    void nullResponseKeepsRuleBasedCopy() {
        when(aiClient.refine(anyString(), any())).thenReturn(null);
        DailyActionsDTO payload = payload();

        assertThat(refiner.refine(payload, "tr")).isSameAs(payload);
    }

    @Test
    @DisplayName("unparseable JSON leaves the plan exactly as composed")
    void malformedResponseKeepsRuleBasedCopy() {
        when(aiClient.refine(anyString(), any())).thenReturn("not json at all");
        DailyActionsDTO payload = payload();

        assertThat(refiner.refine(payload, "tr")).isSameAs(payload);
    }

    @Test
    @DisplayName("valid copy is applied and every derived section follows it")
    void validRefinementPropagatesToDerivedSections() {
        String title = "Beklentiyi tek cümlede söyleyin";
        String body = "Venüs etkisi geciken bir cevabı kişisel algılatabilir. "
                + "Belirsiz kalan beklentiyi bugün tek cümleyle netleştirin.";
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"primary\",\"title\":\"" + title + "\",\"body\":\"" + body + "\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.primaryAction().title()).isEqualTo(title);
        assertThat(refined.primaryAction().description()).isEqualTo(body);
        assertThat(refined.meta().source()).isEqualTo(PersonalPlanRefiner.SOURCE_AI_REFINED);
        // v1 clients and the mini plan read their own copies of the same text.
        assertThat(refined.actions().get(0).title()).isEqualTo(title);
        assertThat(refined.actions().get(0).detail()).isEqualTo(body);
        assertThat(refined.miniPlan().steps()).first().isEqualTo(title);
        // Untouched slots keep the composed wording.
        assertThat(refined.caution().title()).isEqualTo(CAUTION_TITLE);
        assertThat(refined.mainTheme().title()).isEqualTo("Söylenmeyeni söyleme günü");
    }

    @Test
    @DisplayName("a refined caution also updates its timeline slot")
    void refinedCautionUpdatesTheTimelineSlot() {
        String title = "Kısa cevabı yanlış okumayın";
        String body = "Kısa gelen bir cevabı reddedilme olarak okuyabilirsiniz. "
                + "Cevap vermeden önce ne kastedildiğini sorun.";
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"caution\",\"title\":\"" + title + "\",\"body\":\"" + body + "\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.caution().title()).isEqualTo(title);
        assertThat(refined.timeline().get(0).title()).isEqualTo(title);
        assertThat(refined.timeline().get(0).description()).isEqualTo(body);
    }

    @Test
    @DisplayName("copy that invents a situation the product never collects is rejected")
    void inventedContextIsRejected() {
        String body = "Yarınki toplantıda patronunuza bunu söyleyin. "
                + "Belirsiz kalan beklentiyi tek cümleyle netleştirip ekibinize iletin.";
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"primary\",\"title\":\"Beklentiyi netleştirin bugün\",\"body\":\""
                        + body + "\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.primaryAction().description()).isEqualTo(PRIMARY_BODY);
        assertThat(refined.meta().source()).isEqualTo(PersonalPlanRefiner.SOURCE_RULE_BASED);
    }

    @Test
    @DisplayName("copy that invents a time or amount is rejected")
    void inventedNumberIsRejected() {
        String body = "Venüs etkisi geciken bir cevabı kişisel algılatabilir. "
                + "Belirsiz kalan beklentiyi saat 14:30'da tek cümleyle netleştirin.";
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"primary\",\"title\":\"Beklentiyi netleştirin bugün\",\"body\":\""
                        + body + "\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.primaryAction().description()).isEqualTo(PRIMARY_BODY);
    }

    @Test
    @DisplayName("a title that restates the body is rejected — the defect titles exist to prevent")
    void titleRepeatingTheBodyIsRejected() {
        String sentence = "Belirsiz kalan bir beklentiyi bugün tek cümleyle netleştirin.";
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"primary\",\"title\":\"" + sentence + "\",\"body\":\""
                        + sentence + " Sonra karşı tarafa doğrulatın ve orada bırakın.\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.primaryAction().title()).isEqualTo(PRIMARY_TITLE);
    }

    @Test
    @DisplayName("motivational filler is rejected by the same guard the catalog obeys")
    void motivationalFillerIsRejected() {
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"primary\",\"title\":\"Sezgine güven\",\"body\":\"Sezgine güven.\"}]}");

        DailyActionsDTO refined = refiner.refine(payload(), "tr");

        assertThat(refined.primaryAction().title()).isEqualTo(PRIMARY_TITLE);
        assertThat(refined.primaryAction().description()).isEqualTo(PRIMARY_BODY);
    }

    @Test
    @DisplayName("an unknown slot id is ignored rather than applied somewhere else")
    void unknownSlotIdIsIgnored() {
        when(aiClient.refine(anyString(), any())).thenReturn(
                "{\"items\":[{\"id\":\"does-not-exist\",\"title\":\"Beklentiyi netleştirin bugün\","
                        + "\"body\":\"Belirsiz kalan beklentiyi tek cümleyle söyleyin ve karşı tarafa doğrulatın.\"}]}");
        DailyActionsDTO payload = payload();

        assertThat(refiner.refine(payload, "tr")).isSameAs(payload);
    }

    @Test
    @DisplayName("every composed slot is offered to the model with its id and kind")
    void allSlotsAreSentForRefinement() {
        when(aiClient.refine(anyString(), any())).thenReturn(null);

        refiner.refine(payload(), "tr");

        @SuppressWarnings("unchecked")
        Class<List<Map<String, String>>> itemsType = (Class<List<Map<String, String>>>) (Class<?>) List.class;
        org.mockito.ArgumentCaptor<List<Map<String, String>>> captor =
                org.mockito.ArgumentCaptor.forClass(itemsType);
        verify(aiClient).refine(anyString(), captor.capture());

        assertThat(captor.getValue()).extracting(item -> item.get("id"))
                .containsExactlyInAnyOrder("theme", "primary", "area-0", "caution", "teaser");
        assertThat(captor.getValue()).allSatisfy(item -> {
            assertThat(item.get("kind")).isNotBlank();
            assertThat(item.get("title")).isNotBlank();
            assertThat(item.get("body")).isNotBlank();
        });
    }

    // ── fixture ──────────────────────────────────────────────────────────────

    private DailyActionsDTO payload() {
        DailyActionsDTO.MainTheme theme = new DailyActionsDTO.MainTheme(
                "Söylenmeyeni söyleme günü",
                "Venüs etkisi ilişki alanınızda konuşulmayı bekleyen bir konuyu görünür hale getirebilir.",
                "Venüs etkisi natal 7. eviniz üzerinden ilişkiler alanını çalıştırıyor.",
                List.of());
        DailyActionsDTO.PrimaryAction primary = new DailyActionsDTO.PrimaryAction(
                "plan-relationship-clarify_one_expectation", "relationship", "İlişkiler",
                PRIMARY_TITLE, PRIMARY_BODY, null, "why", false, null, List.of("t-1"));
        DailyActionsDTO.LifeAreaCard card = new DailyActionsDTO.LifeAreaCard(
                "plan-work-close_the_oldest_open_item", "work", "İş",
                "En eski maddeyi bitirin",
                "Satürn etkisi yarım kalan tek bir sorumluluğu acil durum gibi hissettirebilir. "
                        + "Listenizde en uzun süredir açık duran maddeyi bugün bitirin.",
                "why", false, null);
        DailyActionsDTO.Caution caution = new DailyActionsDTO.Caution(
                CAUTION_TITLE, CAUTION_BODY, null, "why");
        DailyActionsDTO.TimeSlot cautionSlot = new DailyActionsDTO.TimeSlot(
                "slot-caution", "Akşam", null, null, CAUTION_TITLE, CAUTION_BODY);

        return new DailyActionsDTO(
                "2026-08-13",
                new DailyActionsDTO.Header(theme.title(), theme.description()),
                List.of(
                        new DailyActionsDTO.ActionItem(primary.id(), primary.title(), primary.description(),
                                "heart", null, null, false, null, List.of("t-1")),
                        new DailyActionsDTO.ActionItem(card.id(), card.title(), card.description(),
                                "briefcase", null, null, false, null, List.of()),
                        new DailyActionsDTO.ActionItem("plan-caution", caution.title(), caution.description(),
                                "alert-circle", null, null, false, null, List.of())),
                new DailyActionsDTO.MiniPlan("Mini Plan", List.of(primary.title(), card.title())),
                new DailyActionsDTO.HomeTeaser(theme.title(),
                        "Uzun süredir belirsiz kalan bir beklentiyi tek cümleyle söyleyin: "
                                + "neyi, ne zamana kadar üstleniyorsunuz?"),
                "HIGH",
                List.of("natal_houses"),
                theme,
                primary,
                List.of(cautionSlot),
                List.of(card),
                caution,
                new DailyActionsDTO.EveningReflection("Bugün hangi beklenti belirsiz kaldı?"),
                new DailyActionsDTO.PlanMeta("pp-v3", "2026-08-13T06:00:00Z", 1, true,
                        PersonalPlanRefiner.SOURCE_RULE_BASED, null));
    }
}
