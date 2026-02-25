package com.mysticai.astrology.dto;

import java.util.Arrays;

/**
 * Planner categories shown in the Cosmic Planner dock.
 * Each category is mapped to a base goal category for score calculations.
 */
public enum PlannerCategory {
    TRANSIT("Transit", "Transit", GoalCategory.CAREER),
    MOON("Ay", "Moon", GoalCategory.NEW_BEGINNING),
    DATE("Date", "Date", GoalCategory.MARRIAGE),
    MARRIAGE("Evlilik", "Marriage", GoalCategory.MARRIAGE),
    RELATIONSHIP_HARMONY("İlişki Uyumu", "Relationship Harmony", GoalCategory.MARRIAGE),
    FAMILY("Aile", "Family", GoalCategory.NEW_BEGINNING),
    FINANCE("Finans", "Finance", GoalCategory.CONTRACT),
    BEAUTY("Güzellik", "Beauty", GoalCategory.NEW_BEGINNING),
    HEALTH("Sağlık", "Health", GoalCategory.MARRIAGE),
    ACTIVITY("Aktivite", "Activity", GoalCategory.CAREER),
    OFFICIAL("Resmi", "Official", GoalCategory.CONTRACT),
    SPIRITUAL("Manevi", "Spiritual", GoalCategory.NEW_BEGINNING),
    COLOR("Renk", "Color", GoalCategory.NEW_BEGINNING),
    RECOMMENDATIONS("Öneriler", "Recommendations", GoalCategory.NEW_BEGINNING);

    private final String turkishName;
    private final String englishName;
    private final GoalCategory baseGoalCategory;

    PlannerCategory(String turkishName, String englishName, GoalCategory baseGoalCategory) {
        this.turkishName = turkishName;
        this.englishName = englishName;
        this.baseGoalCategory = baseGoalCategory;
    }

    public String getTurkishName() {
        return turkishName;
    }

    public GoalCategory getBaseGoalCategory() {
        return baseGoalCategory;
    }

    public String getLabel(String locale) {
        boolean english = locale != null && locale.toLowerCase().startsWith("en");
        return english ? englishName : turkishName;
    }

    public static PlannerCategory from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Unknown planner category: " + raw);
        }
        String normalized = switch (raw.trim().toUpperCase()) {
            case "PARTNER_HARMONY" -> "RELATIONSHIP_HARMONY";
            case "JOINT_FINANCE" -> "FINANCE";
            default -> raw.trim().toUpperCase();
        };
        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown planner category: " + raw));
    }
}
