package com.mysticai.astrology.dto;

import java.util.Arrays;

/**
 * Planner categories shown in the Cosmic Planner dock.
 * Each category is mapped to a base goal category for score calculations.
 */
public enum PlannerCategory {
    TRANSIT("Transit", GoalCategory.CAREER),
    MOON("Ay", GoalCategory.NEW_BEGINNING),
    BEAUTY("Güzellik", GoalCategory.NEW_BEGINNING),
    HEALTH("Sağlık", GoalCategory.MARRIAGE),
    ACTIVITY("Aktivite", GoalCategory.CAREER),
    OFFICIAL("Resmi", GoalCategory.CONTRACT),
    SPIRITUAL("Manevi", GoalCategory.NEW_BEGINNING),
    COLOR("Renk", GoalCategory.NEW_BEGINNING),
    RECOMMENDATIONS("Öneriler", GoalCategory.NEW_BEGINNING);

    private final String turkishName;
    private final GoalCategory baseGoalCategory;

    PlannerCategory(String turkishName, GoalCategory baseGoalCategory) {
        this.turkishName = turkishName;
        this.baseGoalCategory = baseGoalCategory;
    }

    public String getTurkishName() {
        return turkishName;
    }

    public GoalCategory getBaseGoalCategory() {
        return baseGoalCategory;
    }

    public static PlannerCategory from(String raw) {
        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(raw))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown planner category: " + raw));
    }
}
