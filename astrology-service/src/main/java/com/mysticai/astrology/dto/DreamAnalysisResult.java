package com.mysticai.astrology.dto;

import java.util.List;

public record DreamAnalysisResult(
        InputQuality inputQuality,
        ExtractedElements extractedElements,
        EmotionalCore emotionalCore,
        String essence,
        List<KeyDetail> keyDetails,
        String deepInterpretation,
        String personalConnection,
        String reflectionQuestion,
        String journalTrackingNote,
        String astrologyNote,
        List<String> followUpQuestions,
        DreamPatternConnection patternConnection,
        Safety safety
) {
    public record InputQuality(DreamAnalysisQuality level, String reason) {}

    public record ExtractedElements(
            String mainEvent,
            List<String> people,
            List<String> places,
            List<String> symbols,
            List<String> actions,
            List<String> emotions,
            String ending,
            List<String> uncertainties
    ) {}

    public record EmotionalCore(
            String primaryEmotion,
            String secondaryEmotion,
            String emotionalTransition,
            double confidence
    ) {}

    public record KeyDetail(
            String title,
            String dreamContext,
            String interpretation,
            double confidence
    ) {}

    public record DreamPatternConnection(
            String summary,
            int occurrenceCount,
            List<Long> relatedDreamIds
    ) {}

    public record Safety(
            boolean containsDiagnosis,
            boolean containsPrediction,
            boolean containsUnsupportedClaims
    ) {}
}
