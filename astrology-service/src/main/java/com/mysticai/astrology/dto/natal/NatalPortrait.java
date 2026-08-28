package com.mysticai.astrology.dto.natal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Structured natal interpretation returned to the client.
 *
 * <p>Every user-visible block follows the same content hierarchy: what it means for the person,
 * how it shows up day to day, what it makes easy or hard, and only then the astrological reason —
 * carried as {@link Evidence} so the UI can hide it behind "why did we say this?".</p>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NatalPortrait(
        /** Contract version. Bumping this invalidates every cached portrait. */
        String version,
        String locale,
        /** AI or FALLBACK — the client shows a softer, "generated offline" note for FALLBACK. */
        String source,
        Portrait portrait,
        BigThree bigThree,
        /** "Beni Anlat" cards: identity, emotional world, social image, strengths, challenges, inner conflicts. */
        List<Topic> aboutMe,
        /** "Hayatım" cards: love, career, money, social, family, life direction, talents. */
        List<Topic> lifeAreas,
        /** One reading per planet, for the redesigned planet detail sheet. */
        List<PlacementReading> planetReadings,
        /** One reading per house that carries meaning, for the redesigned house detail sheet. */
        List<HouseReading> houseReadings,
        /** Human-readable aspect groupings, split into supportive flow and growth tension. */
        AspectStory aspectStory
) {

    /** Hero block: one headline, a short synthesis, and chart-derived trait chips. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Portrait(
            String headline,
            String summary,
            List<String> traits,
            List<Evidence> evidence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BigThree(
            BigThreeEntry sun,
            BigThreeEntry moon,
            BigThreeEntry ascendant
    ) {}

    /**
     * One of the Big Three, written so a complete beginner can read top to bottom without
     * knowing what a house is.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BigThreeEntry(
            /** e.g. "Güneşin Balık'ta" — never a raw enum. */
            String title,
            /** One line: "Temelde kim olduğun". */
            String roleLabel,
            String meaning,
            /** "Sende nasıl çalışıyor?" — the placement + house + aspect synthesis. */
            String howItWorksInYou,
            List<String> strengths,
            List<String> challenges,
            /** What the house placement adds. Empty when birth time is unknown. */
            String houseInfluence,
            /** The aspects that most shape this placement, phrased as lived experience. */
            List<String> keyAspects,
            List<Evidence> evidence
    ) {}

    /**
     * One planet, read as planet + sign + house fused into a single portrait.
     *
     * <p>The field order is the reading order, and that is the point: what this part of you is
     * about, how the sign colours it, where the house spends it, how it actually shows up. A house
     * description that could be pasted under any planet is a failure of this record — the whole
     * reason it exists is that "Sun in the 8th" and "Mercury in the 8th" describe different
     * people, not one paragraph with the planet name swapped.</p>
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlacementReading(
            /** English planet name, matching the calculated chart. Used for lookup, not display. */
            String planet,
            /** e.g. "Güneşin Balık'ta" — never "Güneş: 8. ev ifadesi". */
            String title,
            /** One line: what this planet governs. */
            String subtitle,
            /** "Bu gezegen neyi anlatıyor?" */
            String whatItMeans,
            /** "Burcun bunu nasıl değiştiriyor?" */
            String howTheSignShapesIt,
            /** "Evin bunu hayatının neresine taşıyor?" Null when the birth time is unknown. */
            String whereTheHouseTakesIt,
            /** "Sende nasıl görünür?" — the synthesis the other three build up to. */
            String howItShowsUpInYou,
            /** "Güçlü çalıştığında" */
            List<String> whenItWorksWell,
            /** "Zorlandığında" */
            List<String> whenItStrains,
            /** "Diğer gezegenlerle bağlantısı" — aspects in human terms, not aspect names. */
            List<String> connections,
            List<Evidence> evidence
    ) {}

    /**
     * One house, read through the sign on its cusp, its ruler's placement, and whoever lives in it.
     *
     * <p>{@link #synthesis()} is the field that matters. A Leo 1st house holding a Virgo Moon is a
     * person who looks relaxed and visible while quietly auditing every reaction in the room — a
     * sentence that appears in no textbook, because it only exists once the cusp, the resident and
     * the ruler are read together.</p>
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HouseReading(
            int houseNumber,
            /** e.g. "1. Ev — Dış dünyaya açılan kapın" */
            String title,
            /** "Bu ev neyi anlatır?" */
            String whatItMeans,
            /** "Sende hangi burç var?" */
            String yourSignHere,
            /** "Ev yöneticisi" — where the cusp ruler sits, and what that carries. */
            String rulerStory,
            /** "Bu evde hangi gezegenler var?" Null when nothing is placed here. */
            String residentsStory,
            /** "Hepsi birlikte sende nasıl çalışıyor?" */
            String synthesis,
            /** "Güçlü taraf" */
            List<String> strengths,
            /** "Dikkat" */
            List<String> cautions,
            List<Evidence> evidence
    ) {}

    /**
     * A thematic card. Used for both "Beni Anlat" and "Hayatım" so the UI can render one component.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Topic(
            /** Stable snake_case id — drives icon, ordering and analytics. */
            String id,
            String title,
            /** One-line explanation shown on the collapsed card. */
            String subtitle,
            /** 2-4 sentence personalised synthesis. */
            String summary,
            /** "Günlük hayatta nasıl görünür?" */
            String dailyLife,
            /** "Sana iyi gelen" */
            List<String> strengths,
            /** "Seni zorlayabilecek" */
            List<String> challenges,
            List<Evidence> evidence
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AspectStory(
            List<AspectTheme> supportive,
            List<AspectTheme> tension
    ) {}

    /**
     * One aspect (or cluster) translated into lived experience. The technical name never leads —
     * it lives in {@link #evidence()}.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AspectTheme(
            String title,
            String description,
            List<Evidence> evidence
    ) {}

    /**
     * The astrological receipt behind an interpretation.
     *
     * <p>{@code label} is what the user sees ("Ay Başak · 1. Ev"). The typed fields below are what
     * the validator checks against the calculated chart, which is how a hallucinated placement
     * gets caught before it ever reaches a screen.</p>
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Evidence(
            /** PLACEMENT | ASPECT | HOUSE | RULER | ELEMENT */
            String type,
            String label,
            String planet,
            String sign,
            Integer house,
            String aspectType,
            String planet2
    ) {}
}
