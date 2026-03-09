package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyGroupDto;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class NameTagTaxonomyService {

    private static final Map<NameTagGroup, List<String>> TAXONOMY;

    private static final Set<NameTagGroup> SINGLE_CHOICE_GROUPS = Set.of(
            NameTagGroup.STYLE,
            NameTagGroup.CULTURE,
            NameTagGroup.USAGE
    );

    static {
        Map<NameTagGroup, List<String>> map = new LinkedHashMap<>();
        map.put(NameTagGroup.STYLE, List.of("modern", "classic", "timeless", "minimalist"));
        map.put(NameTagGroup.VIBE, List.of("strong", "soft", "elegant", "charismatic", "spiritual"));
        map.put(NameTagGroup.THEME, List.of("light", "moon", "water", "power", "love", "wisdom", "nature"));
        map.put(NameTagGroup.CULTURE, List.of("turkish", "arabic", "persian", "mixed_usage"));
        map.put(NameTagGroup.RELIGION, List.of("islamic", "quranic", "neutral"));
        map.put(NameTagGroup.USAGE, List.of("popular", "balanced", "niche"));
        TAXONOMY = Map.copyOf(map);
    }

    public NameTagTaxonomyDto taxonomy() {
        List<NameTagTaxonomyGroupDto> groups = new ArrayList<>();
        for (Map.Entry<NameTagGroup, List<String>> entry : TAXONOMY.entrySet()) {
            groups.add(new NameTagTaxonomyGroupDto(entry.getKey(), entry.getValue()));
        }
        return new NameTagTaxonomyDto(groups);
    }

    public NameTagGroup parseGroup(String rawGroup) {
        if (rawGroup == null || rawGroup.isBlank()) {
            throw new IllegalArgumentException("tagGroup is required");
        }
        return NameTagGroup.valueOf(rawGroup.trim().toUpperCase(Locale.ROOT));
    }

    public String normalizeTagValue(String rawValue) {
        if (rawValue == null) {
            return null;
        }
        String normalized = rawValue.trim().toLowerCase(Locale.ROOT).replace('-', '_').replaceAll("\\s+", "_");
        if (normalized.isBlank()) {
            return null;
        }
        return normalized;
    }

    public String validateAndNormalize(NameTagGroup group, String rawValue) {
        if (group == null) {
            throw new IllegalArgumentException("tagGroup is required");
        }
        String value = normalizeTagValue(rawValue);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("tagValue is required");
        }
        if (!isValid(group, value)) {
            throw new IllegalArgumentException("invalid taxonomy tag: " + group + ":" + value);
        }
        return value;
    }

    public boolean isValid(NameTagGroup group, String normalizedValue) {
        if (group == null || normalizedValue == null) {
            return false;
        }
        List<String> values = TAXONOMY.get(group);
        return values != null && values.contains(normalizedValue);
    }

    public boolean isSingleChoice(NameTagGroup group) {
        return SINGLE_CHOICE_GROUPS.contains(group);
    }

    public int maxTagsForGroup(NameTagGroup group) {
        if (group == null) {
            return 0;
        }
        return switch (group) {
            case THEME -> 3;
            case VIBE -> 2;
            case RELIGION -> 2;
            default -> 1;
        };
    }

    public boolean isReligionConflict(Set<String> values, String candidateValue) {
        if (!values.contains(candidateValue)) {
            if ("neutral".equals(candidateValue)) {
                return values.contains("islamic") || values.contains("quranic");
            }
            if ("islamic".equals(candidateValue) || "quranic".equals(candidateValue)) {
                return values.contains("neutral");
            }
        }
        return false;
    }

    public Map<NameTagGroup, Set<String>> emptyTagMap() {
        Map<NameTagGroup, Set<String>> map = new EnumMap<>(NameTagGroup.class);
        for (NameTagGroup group : NameTagGroup.values()) {
            map.put(group, new LinkedHashSet<>());
        }
        return map;
    }
}
