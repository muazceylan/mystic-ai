package com.mysticai.numerology.dto;

import java.util.List;

public record NumerologyResponse(
        String name,
        String birthDate,
        String headline,
        List<CoreNumber> coreNumbers,
        Timing timing,
        ClassicCycle classicCycle,
        KarmicDebt karmicDebt,
        AngelSignal angelSignal,
        Profile profile,
        CombinedProfile combinedProfile,
        MiniGuidance miniGuidance,
        ShareCardPayload shareCardPayload,
        CalculationMeta calculationMeta,
        SectionLockState sectionLockState,
        String summary,
        String generatedAt,
        String version,
        String contentVersion,
        String calculationVersion,
        String locale,
        String lastCalculatedAt,
        String annualSnapshotKey
) {
    public record CoreNumber(
            String id,
            int value,
            String title,
            String archetype,
            String essence,
            List<String> gifts,
            List<String> watchouts,
            String tryThisToday,
            boolean isMasterNumber
    ) {
    }

    public record Timing(
            int personalYear,
            int universalYear,
            int personalMonth,
            int personalDay,
            int cycleProgress,
            String yearPhase,
            String currentPeriodFocus,
            String shortTheme,
            String nextRefreshAt
    ) {
    }

    public record ClassicCycle(
            List<PinnaclePhase> pinnacles,
            List<ChallengePhase> challenges,
            List<LifeCyclePhase> lifeCycles,
            int activePinnacleIndex,
            int activeChallengeIndex,
            int activeLifeCycleIndex
    ) {
    }

    public record PinnaclePhase(
            int order,
            int number,
            int startAge,
            int endAge,
            String theme
    ) {
    }

    public record ChallengePhase(
            int order,
            int number,
            int startAge,
            int endAge,
            String focus
    ) {
    }

    public record LifeCyclePhase(
            String id,
            int number,
            int startAge,
            int endAge,
            String label,
            String theme
    ) {
    }

    public record KarmicDebt(
            List<Integer> debts,
            List<String> sources,
            String summary
    ) {
    }

    public record AngelSignal(
            int angelNumber,
            String meaning,
            String action,
            String signalFor
    ) {
    }

    public record Profile(
            String essence,
            List<String> strengths,
            List<String> growthEdges,
            String reflectionPrompt
    ) {
    }

    public record CombinedProfile(
            String dominantNumberId,
            int dominantNumber,
            String dominantEnergy,
            String innerConflict,
            String naturalStyle,
            String decisionStyle,
            String relationshipStyle,
            String growthArc,
            String compatibilityTeaser
    ) {
    }

    public record MiniGuidance(
            String dailyFocus,
            String miniGuidance,
            String reflectionPromptOfTheDay,
            String validFor
    ) {
    }

    public record ShareCardPayload(
            String name,
            int mainNumber,
            String headline,
            int personalYear,
            String shortTheme,
            String payloadVersion,
            String generatedAt,
            String brandMark
    ) {
    }

    public record CalculationMeta(
            String personalYearMethod,
            String masterNumberPolicy,
            List<String> normalizationNotes,
            List<String> formulaSummary
    ) {
    }

    public record SectionLockState(
            List<String> freeSections,
            List<String> premiumSections,
            List<String> previewSections
    ) {
    }
}
