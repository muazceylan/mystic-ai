package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CategoryGroup;
import com.mysticai.astrology.dto.CrossAspect;
import com.mysticai.astrology.dto.TraitAxis;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TraitScoringEngine {

    private final TraitDefinitions traitDefinitions;

    public List<CategoryGroup> scoreCategories(List<CrossAspect> aspects, Integer compatibilityScore) {
        List<CrossAspect> safeAspects = aspects == null ? List.of() : aspects;

        Map<String, List<ScoredAxisRow>> grouped = new LinkedHashMap<>();
        Map<String, String> categoryTitles = new LinkedHashMap<>();

        for (TraitDefinitions.AxisDefinition axis : traitDefinitions.allAxes()) {
            int score = safeAspects.isEmpty()
                    ? 50
                    : scoreAxis(axis, safeAspects, compatibilityScore);

            grouped.computeIfAbsent(axis.categoryId(), k -> new ArrayList<>())
                    .add(new ScoredAxisRow(axis, score, null));
            categoryTitles.putIfAbsent(axis.categoryId(), axis.categoryTitle());
        }

        List<CategoryGroup> categories = new ArrayList<>();
        for (Map.Entry<String, List<ScoredAxisRow>> entry : grouped.entrySet()) {
            List<TraitAxis> items = entry.getValue().stream()
                    .sorted(Comparator.comparing(r -> r.axis().id()))
                    .map(ScoredAxisRow::toTraitAxis)
                    .toList();
            categories.add(new CategoryGroup(entry.getKey(), categoryTitles.get(entry.getKey()), items));
        }
        return categories;
    }

    public List<TraitAxis> selectCardAxes(List<CategoryGroup> categories, int targetCount) {
        if (categories == null || categories.isEmpty()) return List.of();
        int safeTarget = Math.max(6, Math.min(10, targetCount <= 0 ? 8 : targetCount));

        List<Candidate> all = categories.stream()
                .flatMap(group -> group.items().stream().map(axis -> Candidate.from(group.id(), axis)))
                .toList();
        if (all.isEmpty()) return List.of();

        Map<String, List<Candidate>> byCategory = all.stream()
                .collect(Collectors.groupingBy(Candidate::categoryId, LinkedHashMap::new, Collectors.toList()));

        Comparator<Candidate> candidateComparator = Comparator
                .comparingInt(Candidate::distinctiveness).reversed()
                .thenComparing(Candidate::id);

        List<Candidate> seeds = byCategory.values().stream()
                .map(list -> list.stream().sorted(candidateComparator).findFirst().orElse(null))
                .filter(Objects::nonNull)
                .sorted(candidateComparator.thenComparing(Candidate::categoryId))
                .limit(6)
                .toList();

        List<Candidate> selected = new ArrayList<>();
        Map<String, Integer> categoryCounts = new HashMap<>();
        for (Candidate seed : seeds) {
            selected.add(seed);
            categoryCounts.merge(seed.categoryId(), 1, Integer::sum);
            if (selected.size() >= safeTarget) break;
        }

        Set<String> selectedIds = selected.stream().map(Candidate::id).collect(Collectors.toSet());
        List<Candidate> remainder = all.stream()
                .filter(c -> !selectedIds.contains(c.id()))
                .sorted(candidateComparator)
                .toList();

        for (Candidate candidate : remainder) {
            if (selected.size() >= safeTarget) break;
            if (categoryCounts.getOrDefault(candidate.categoryId(), 0) >= 2) continue;
            selected.add(candidate);
            categoryCounts.merge(candidate.categoryId(), 1, Integer::sum);
        }

        // En az 4 kategori koşulu; veri azsa mümkün olan maksimum kategori ile döner.
        return selected.stream()
                .sorted(Comparator.comparing(TraitScoringEngine.Candidate::categoryId).thenComparing(TraitScoringEngine.Candidate::id))
                .map(Candidate::axis)
                .toList();
    }

    public List<CategoryGroup> applyNotes(List<CategoryGroup> categories, Map<String, String> notesByAxisId) {
        if (categories == null || categories.isEmpty()) return List.of();
        if (notesByAxisId == null || notesByAxisId.isEmpty()) return categories;

        return categories.stream()
                .map(group -> new CategoryGroup(
                        group.id(),
                        group.title(),
                        group.items().stream()
                                .map(axis -> new TraitAxis(
                                        axis.id(),
                                        axis.leftLabel(),
                                        axis.rightLabel(),
                                        axis.score0to100(),
                                        notesByAxisId.getOrDefault(axis.id(), axis.note())
                                ))
                                .toList()
                ))
                .toList();
    }

    public List<TraitAxis> applyNotesToAxes(List<TraitAxis> axes, Map<String, String> notesByAxisId) {
        if (axes == null || axes.isEmpty()) return List.of();
        if (notesByAxisId == null || notesByAxisId.isEmpty()) return axes;
        return axes.stream()
                .map(axis -> new TraitAxis(
                        axis.id(),
                        axis.leftLabel(),
                        axis.rightLabel(),
                        axis.score0to100(),
                        notesByAxisId.getOrDefault(axis.id(), axis.note())
                ))
                .toList();
    }

    private int scoreAxis(TraitDefinitions.AxisDefinition axis, List<CrossAspect> aspects, Integer compatibilityScore) {
        double raw = 0.0;

        for (CrossAspect aspect : aspects) {
            double aspectContribution = aspectSignedWeight(aspect);
            if (aspectContribution == 0) continue;

            for (TraitDefinitions.AxisDriver driver : axis.drivers()) {
                if (!driver.matches(aspect)) continue;
                raw += aspectContribution * driver.strength() * driver.polarity();
            }
        }

        double normalizedSigned = Math.tanh(raw / 2.0d);
        double score = 50.0d + normalizedSigned * 35.0d;

        if (compatibilityScore != null) {
            if (compatibilityScore < 40) {
                score = 50 + (score - 50) * 0.70d;
            } else if (compatibilityScore > 75) {
                score = 50 + (score - 50) * 0.85d;
            }
        }

        return clampToScore(score);
    }

    private double aspectSignedWeight(CrossAspect aspect) {
        if (aspect == null || aspect.aspectType() == null) return 0.0d;
        double baseWeight = switch (aspect.aspectType().toUpperCase(Locale.ROOT)) {
            case "TRINE" -> 1.0d;
            case "SEXTILE" -> 0.7d;
            case "CONJUNCTION" -> 0.8d;
            case "SQUARE" -> -1.0d;
            case "OPPOSITION" -> -0.9d;
            default -> 0.0d;
        };
        if (baseWeight == 0.0d) return 0.0d;

        double orbFactor = orbFactor(aspect);
        double harmonySign = aspect.harmonious() ? 1.0d : -1.0d;
        return baseWeight * orbFactor * harmonySign;
    }

    private double orbFactor(CrossAspect aspect) {
        double orb = aspect.orb();
        if (Double.isNaN(orb) || orb <= 0) return 0.60d;

        String type = aspect.aspectType() == null ? "" : aspect.aspectType().toUpperCase(Locale.ROOT);
        double orbMax = "SEXTILE".equals(type) ? 6.0d : 8.0d;
        double factor = 1.0d - (orb / orbMax);
        if (factor < 0) return 0;
        if (factor > 1) return 1;
        return factor;
    }

    private int clampToScore(double value) {
        return (int) Math.max(0, Math.min(100, Math.round(value)));
    }

    private record ScoredAxisRow(TraitDefinitions.AxisDefinition axis, Integer score0to100, String note) {
        TraitAxis toTraitAxis() {
            return new TraitAxis(axis.id(), axis.leftLabel(), axis.rightLabel(), score0to100, note);
        }
    }

    private record Candidate(String categoryId, TraitAxis axis, int distinctiveness) {
        static Candidate from(String categoryId, TraitAxis axis) {
            int score = axis.score0to100() == null ? 50 : axis.score0to100();
            return new Candidate(categoryId, axis, Math.abs(score - 50));
        }

        String id() {
            return axis.id();
        }
    }
}
