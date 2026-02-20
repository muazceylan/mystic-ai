package com.mysticai.astrology.dto;

import java.util.List;

/**
 * Goal categories for Lucky Dates calculation.
 * Each category defines which transit planets, target houses, and natal planets are relevant.
 */
public enum GoalCategory {
    MARRIAGE(
            "Evlilik",
            List.of("Venus", "Jupiter"),
            List.of(7),
            List.of("Venus")
    ),
    CAREER(
            "Kariyer",
            List.of("Mars", "Saturn", "Sun"),
            List.of(10, 6),
            List.of("Saturn", "Mars")
    ),
    CONTRACT(
            "Anlaşma",
            List.of("Mercury", "Jupiter"),
            List.of(3, 9),
            List.of("Mercury")
    ),
    NEW_BEGINNING(
            "Yeni Başlangıç",
            List.of("Sun", "Jupiter"),
            List.of(1, 10),
            List.of("Sun", "Moon")
    );

    private final String turkishName;
    private final List<String> transitPlanets;
    private final List<Integer> targetHouses;
    private final List<String> targetNatalPlanets;

    GoalCategory(String turkishName, List<String> transitPlanets,
                 List<Integer> targetHouses, List<String> targetNatalPlanets) {
        this.turkishName = turkishName;
        this.transitPlanets = transitPlanets;
        this.targetHouses = targetHouses;
        this.targetNatalPlanets = targetNatalPlanets;
    }

    public String getTurkishName() { return turkishName; }
    public List<String> getTransitPlanets() { return transitPlanets; }
    public List<Integer> getTargetHouses() { return targetHouses; }
    public List<String> getTargetNatalPlanets() { return targetNatalPlanets; }
}
