package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CosmicDayDetailResponse;
import com.mysticai.astrology.dto.CosmicPlannerResponse;
import com.mysticai.astrology.dto.DailyLifeGuideActivity;
import com.mysticai.astrology.dto.DailyLifeGuideGroupSummary;
import com.mysticai.astrology.dto.DailyLifeGuideResponse;
import com.mysticai.astrology.dto.PlanetPosition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CosmicScoringServiceTest {

    @Mock
    private DailyLifeGuideService dailyLifeGuideService;
    @Mock
    private TransitCalculator transitCalculator;

    private CosmicScoringService service;

    @BeforeEach
    void setUp() {
        service = new CosmicScoringService(dailyLifeGuideService, transitCalculator);
        when(transitCalculator.calculateTransitPositions(any(LocalDate.class))).thenReturn(List.of(
                new PlanetPosition("Moon", "Libra", 12, 0, 0, false, 7, 192.0),
                new PlanetPosition("Mercury", "Aries", 10, 0, 0, false, 3, 10.0)
        ));
        when(transitCalculator.getMoonPhase(any(LocalDate.class))).thenReturn("Hilal (Büyüyen)");
    }

    @Test
    void shouldKeepMarriageCategorySeparatedFromSocialInDayDetailAndPlanner() {
        when(dailyLifeGuideService.getDailyGuide(any())).thenReturn(sampleDailyGuide());

        CosmicDayDetailResponse detail = service.getDayDetail(42L, LocalDate.of(2026, 4, 16), "tr", "female", "engaged");
        CosmicPlannerResponse planner = service.getPlannerMonth(42L, "2026-04", "tr", "female", "engaged");

        assertTrue(detail.categories().containsKey("marriage"));
        assertTrue(detail.categories().containsKey("social"));
        assertEquals(
                Set.of("marriage", "engagement", "proposal", "divorce"),
                detail.categories().get("marriage").subcategories().stream().map(item -> item.subCategoryKey()).collect(java.util.stream.Collectors.toSet())
        );
        assertEquals(
                Set.of("first_date", "flirt", "social_invites"),
                detail.categories().get("social").subcategories().stream().map(item -> item.subCategoryKey()).collect(java.util.stream.Collectors.toSet())
        );
        assertTrue(planner.legendsByCategory().containsKey("marriage"));
        assertTrue(
                planner.legendsByCategory().get("marriage").stream()
                        .map(item -> item.subCategoryKey())
                        .collect(java.util.stream.Collectors.toSet())
                        .containsAll(Set.of("marriage", "engagement", "proposal", "divorce"))
        );
    }

    private DailyLifeGuideResponse sampleDailyGuide() {
        return new DailyLifeGuideResponse(
                42L,
                LocalDate.of(2026, 4, 16),
                "tr",
                "female",
                "engaged",
                72,
                "LIVE",
                List.of(
                        new DailyLifeGuideGroupSummary("marriage", "Evlilik & Bağlılık", 78, 4),
                        new DailyLifeGuideGroupSummary("social", "Sosyal & Aşk", 61, 3)
                ),
                List.of(
                        activity("marriage", "Evlilik & Bağlılık", "MARRIAGE", "Evlilik", 82, "Bugün ortak hedefleri konuşmak kolaylaşıyor."),
                        activity("marriage", "Evlilik & Bağlılık", "ENGAGEMENT", "Nişan", 77, "Ailelerle planları netleştirmek daha kolay olabilir."),
                        activity("marriage", "Evlilik & Bağlılık", "PROPOSAL", "Evlilik Teklifi", 74, "Romantik ama net bir teklif için zemin oluşuyor."),
                        activity("marriage", "Evlilik & Bağlılık", "DIVORCE", "Boşanma", 38, "Duygusal gerilimde acele karar yerine hukuki netlik önemli."),
                        activity("social", "Sosyal & Aşk", "FIRST_DATE", "İlk Buluşma", 66, "İlk temasta hafif ve akışta kalmak daha iyi."),
                        activity("social", "Sosyal & Aşk", "FLIRT", "Flört", 59, "İletişimi hafif tutmak daha rahat hissettirir."),
                        activity("social", "Sosyal & Aşk", "SOCIAL_INVITE", "Sosyal Davet", 71, "Yakın çevreden destekleyici davetler gelebilir.")
                ),
                LocalDateTime.of(2026, 4, 16, 9, 0)
        );
    }

    private DailyLifeGuideActivity activity(
            String groupKey,
            String groupLabel,
            String activityKey,
            String activityLabel,
            int score,
            String insight
    ) {
        return new DailyLifeGuideActivity(
                groupKey,
                groupLabel,
                activityKey,
                activityLabel,
                "sparkles",
                score,
                score >= 70 ? "positive" : score <= 40 ? "negative" : "neutral",
                "Planlı İlerle",
                insight,
                insight,
                insight,
                List.of("Test trigger")
        );
    }
}
