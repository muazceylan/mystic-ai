package com.mysticai.astrology.dto;

import java.util.Arrays;

/**
 * Planner categories shown in the Cosmic Planner dock.
 * Each category is mapped to a base goal category for score calculations.
 */
public enum PlannerCategory {
    TRANSIT("Transit", "Transit", GoalCategory.CAREER),
    MOON("Ay", "Moon", GoalCategory.NEW_BEGINNING),
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
        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(raw))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown planner category: " + raw));
    }
}
