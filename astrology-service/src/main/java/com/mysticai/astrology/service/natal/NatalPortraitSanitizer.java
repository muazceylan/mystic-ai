package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Repairs the cosmetic problems that are not worth discarding a whole generation over.
 *
 * <p>The validator draws a hard line at anything factually wrong. This class handles the rest —
 * a paragraph that ran long, a trait repeated twice, a stray bullet list with fifteen entries —
 * by trimming rather than rejecting, so one loose string never costs the user a portrait.</p>
 */
@Service
public class NatalPortraitSanitizer {

    private static final int MAX_SUMMARY_CHARS = 1200;
    private static final int MAX_LINE_CHARS = 400;
    private static final int MAX_BULLETS = 5;
    private static final int MAX_TRAITS = 6;
    private static final int MAX_THEMES = 5;

    public NatalPortrait sanitize(NatalPortrait portrait, String locale, String source) {
        if (portrait == null) return null;
        return new NatalPortrait(
                NatalPortraitService.CONTRACT_VERSION,
                locale,
                source,
                sanitizePortrait(portrait.portrait()),
                sanitizeBigThree(portrait.bigThree()),
                sanitizeTopics(portrait.aboutMe()),
                sanitizeTopics(portrait.lifeAreas()),
                sanitizePlacementReadings(portrait.planetReadings()),
                sanitizeHouseReadings(portrait.houseReadings()),
                sanitizeAspectStory(portrait.aspectStory())
        );
    }

    private NatalPortrait.Portrait sanitizePortrait(NatalPortrait.Portrait p) {
        if (p == null) return null;
        return new NatalPortrait.Portrait(
                trim(p.headline(), 160),
                trim(p.summary(), MAX_SUMMARY_CHARS),
                dedupe(p.traits(), MAX_TRAITS),
                capList(p.evidence(), MAX_BULLETS)
        );
    }

    private NatalPortrait.BigThree sanitizeBigThree(NatalPortrait.BigThree b) {
        if (b == null) return null;
        return new NatalPortrait.BigThree(
                sanitizeEntry(b.sun()),
                sanitizeEntry(b.moon()),
                sanitizeEntry(b.ascendant())
        );
    }

    private NatalPortrait.BigThreeEntry sanitizeEntry(NatalPortrait.BigThreeEntry e) {
        if (e == null) return null;
        return new NatalPortrait.BigThreeEntry(
                trim(e.title(), 120),
                trim(e.roleLabel(), 120),
                trim(e.meaning(), MAX_LINE_CHARS),
                trim(e.howItWorksInYou(), MAX_SUMMARY_CHARS),
                trimEach(dedupe(e.strengths(), MAX_BULLETS), 140),
                trimEach(dedupe(e.challenges(), MAX_BULLETS), 140),
                trim(e.houseInfluence(), MAX_LINE_CHARS),
                trimEach(dedupe(e.keyAspects(), MAX_BULLETS), MAX_LINE_CHARS),
                capList(e.evidence(), MAX_BULLETS)
        );
    }

    private List<NatalPortrait.PlacementReading> sanitizePlacementReadings(
            List<NatalPortrait.PlacementReading> readings) {
        if (readings == null) return List.of();
        return readings.stream()
                .filter(r -> r != null && r.planet() != null && !r.planet().isBlank())
                .map(r -> new NatalPortrait.PlacementReading(
                        r.planet().strip(),
                        trim(r.title(), 120),
                        trim(r.subtitle(), 160),
                        trim(r.whatItMeans(), MAX_LINE_CHARS),
                        trim(r.howTheSignShapesIt(), MAX_LINE_CHARS),
                        trim(r.whereTheHouseTakesIt(), MAX_LINE_CHARS),
                        trim(r.howItShowsUpInYou(), MAX_SUMMARY_CHARS),
                        trimEach(dedupe(r.whenItWorksWell(), MAX_BULLETS), 140),
                        trimEach(dedupe(r.whenItStrains(), MAX_BULLETS), 140),
                        trimEach(dedupe(r.connections(), MAX_BULLETS), MAX_LINE_CHARS),
                        capList(r.evidence(), MAX_BULLETS)))
                .toList();
    }

    private List<NatalPortrait.HouseReading> sanitizeHouseReadings(
            List<NatalPortrait.HouseReading> readings) {
        if (readings == null) return List.of();
        return readings.stream()
                .filter(r -> r != null && r.houseNumber() >= 1 && r.houseNumber() <= 12)
                .map(r -> new NatalPortrait.HouseReading(
                        r.houseNumber(),
                        trim(r.title(), 120),
                        trim(r.whatItMeans(), MAX_LINE_CHARS),
                        trim(r.yourSignHere(), MAX_LINE_CHARS),
                        trim(r.rulerStory(), MAX_LINE_CHARS),
                        trim(r.residentsStory(), MAX_LINE_CHARS),
                        trim(r.synthesis(), MAX_SUMMARY_CHARS),
                        trimEach(dedupe(r.strengths(), MAX_BULLETS), 140),
                        trimEach(dedupe(r.cautions(), MAX_BULLETS), 140),
                        capList(r.evidence(), MAX_BULLETS)))
                .toList();
    }

    private List<NatalPortrait.Topic> sanitizeTopics(List<NatalPortrait.Topic> topics) {
        if (topics == null) return List.of();
        return topics.stream()
                .filter(t -> t != null && t.id() != null)
                .map(t -> new NatalPortrait.Topic(
                        t.id().toLowerCase(Locale.ROOT),
                        trim(t.title(), 120),
                        trim(t.subtitle(), 160),
                        trim(t.summary(), MAX_SUMMARY_CHARS),
                        trim(t.dailyLife(), MAX_LINE_CHARS),
                        trimEach(dedupe(t.strengths(), MAX_BULLETS), 140),
                        trimEach(dedupe(t.challenges(), MAX_BULLETS), 140),
                        capList(t.evidence(), MAX_BULLETS)
                ))
                .toList();
    }

    private NatalPortrait.AspectStory sanitizeAspectStory(NatalPortrait.AspectStory story) {
        if (story == null) return new NatalPortrait.AspectStory(List.of(), List.of());
        return new NatalPortrait.AspectStory(
                sanitizeThemes(story.supportive()),
                sanitizeThemes(story.tension())
        );
    }

    private List<NatalPortrait.AspectTheme> sanitizeThemes(List<NatalPortrait.AspectTheme> themes) {
        if (themes == null) return List.of();
        return themes.stream()
                .filter(t -> t != null && t.title() != null && !t.title().isBlank())
                .limit(MAX_THEMES)
                .map(t -> new NatalPortrait.AspectTheme(
                        trim(t.title(), 140),
                        trim(t.description(), MAX_SUMMARY_CHARS),
                        capList(t.evidence(), 3)
                ))
                .toList();
    }

    /** Cuts at the last sentence boundary so a trimmed paragraph never ends mid-thought. */
    private String trim(String value, int max) {
        if (value == null) return null;
        String cleaned = value.strip().replaceAll("\\s{2,}", " ");
        if (cleaned.length() <= max) return cleaned;
        String cut = cleaned.substring(0, max);
        int lastStop = Math.max(cut.lastIndexOf('.'), Math.max(cut.lastIndexOf('!'), cut.lastIndexOf('?')));
        return lastStop > max / 2 ? cut.substring(0, lastStop + 1) : cut.strip() + "…";
    }

    private List<String> trimEach(List<String> values, int max) {
        if (values == null) return List.of();
        return values.stream().map(v -> trim(v, max)).filter(v -> v != null && !v.isBlank()).toList();
    }

    private List<String> dedupe(List<String> values, int limit) {
        if (values == null) return List.of();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null || value.isBlank()) continue;
            String key = value.strip().toLowerCase(Locale.ROOT);
            if (seen.stream().noneMatch(v -> v.strip().toLowerCase(Locale.ROOT).equals(key))) {
                seen.add(value.strip());
            }
            if (seen.size() >= limit) break;
        }
        return List.copyOf(seen);
    }

    private <T> List<T> capList(List<T> values, int limit) {
        if (values == null) return List.of();
        return values.stream().filter(v -> v != null).limit(limit).toList();
    }
}
