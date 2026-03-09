package com.mysticai.notification.tutorial.contract;

import java.util.*;

public final class TutorialContractCatalog {

    private TutorialContractCatalog() {
    }

    public static final String SCREEN_GLOBAL_ONBOARDING = "global_onboarding";
    public static final String SCREEN_HOME = "home";
    public static final String SCREEN_DAILY_TRANSITS = "daily_transits";
    public static final String SCREEN_COSMIC_PLANNER = "cosmic_planner";
    public static final String SCREEN_DECISION_COMPASS = "decision_compass";
    public static final String SCREEN_COMPATIBILITY = "compatibility";
    public static final String SCREEN_BIRTH_CHART = "birth_chart";
    public static final String SCREEN_DREAMS = "dreams";
    public static final String SCREEN_NUMEROLOGY = "numerology";
    public static final String SCREEN_NAME_ANALYSIS = "name_analysis";
    public static final String SCREEN_SPIRITUAL_PRACTICE = "spiritual_practice";
    public static final String SCREEN_PROFILE = "profile";

    public static final Set<String> SCREEN_KEYS = Set.of(
            SCREEN_GLOBAL_ONBOARDING,
            SCREEN_HOME,
            SCREEN_DAILY_TRANSITS,
            SCREEN_COSMIC_PLANNER,
            SCREEN_DECISION_COMPASS,
            SCREEN_COMPATIBILITY,
            SCREEN_BIRTH_CHART,
            SCREEN_DREAMS,
            SCREEN_NUMEROLOGY,
            SCREEN_NAME_ANALYSIS,
            SCREEN_SPIRITUAL_PRACTICE,
            SCREEN_PROFILE
    );

    public static final Map<String, Set<String>> TARGET_KEYS_BY_SCREEN;

    static {
        Map<String, Set<String>> map = new LinkedHashMap<>();
        map.put(SCREEN_GLOBAL_ONBOARDING, Set.of("global_onboarding.intro"));
        map.put(SCREEN_HOME, Set.of(
                "home.hero_energy",
                "home.quick_actions",
                "home.personal_widget",
                "home.help_entry"
        ));
        map.put(SCREEN_DAILY_TRANSITS, Set.of(
                "daily_transits.hero_summary",
                "daily_transits.transit_cards",
                "daily_transits.impact_zones",
                "daily_transits.help_entry"
        ));
        map.put(SCREEN_COSMIC_PLANNER, Set.of(
                "cosmic_planner.date_picker",
                "cosmic_planner.category_dock",
                "cosmic_planner.daily_recommendations",
                "cosmic_planner.reminder_action",
                "cosmic_planner.help_entry"
        ));
        map.put(SCREEN_DECISION_COMPASS, Set.of(
                "decision_compass.header_summary",
                "decision_compass.input_area",
                "decision_compass.result_area",
                "decision_compass.reevaluate_entry",
                "decision_compass.help_entry"
        ));
        map.put(SCREEN_COMPATIBILITY, Set.of(
                "compatibility.summary_header",
                "compatibility.section_tabs",
                "compatibility.score_area",
                "compatibility.save_share_entry",
                "compatibility.help_entry"
        ));
        map.put(SCREEN_BIRTH_CHART, Set.of(
                "birth_chart.hero_summary",
                "birth_chart.planet_positions",
                "birth_chart.technical_details",
                "birth_chart.insight_panel",
                "birth_chart.detail_action",
                "birth_chart.help_entry"
        ));
        map.put(SCREEN_DREAMS, Set.of(
                "dreams.compose_entry",
                "dreams.interpretation_result",
                "dreams.history_entry",
                "dreams.help_entry"
        ));
        map.put(SCREEN_NUMEROLOGY, Set.of(
                "numerology.input_area",
                "numerology.result_card",
                "numerology.detail_section",
                "numerology.help_entry"
        ));
        map.put(SCREEN_NAME_ANALYSIS, Set.of(
                "name_analysis.name_input",
                "name_analysis.meaning_panel",
                "name_analysis.save_share_entry",
                "name_analysis.help_entry"
        ));
        map.put(SCREEN_SPIRITUAL_PRACTICE, Set.of(
                "spiritual_practice.daily_recommendation",
                "spiritual_practice.practice_counter",
                "spiritual_practice.journal_entry",
                "spiritual_practice.help_entry"
        ));
        map.put(SCREEN_PROFILE, Set.of(
                "profile.personal_info",
                "profile.preferences",
                "profile.tutorial_center_entry",
                "profile.help_entry"
        ));

        TARGET_KEYS_BY_SCREEN = Collections.unmodifiableMap(map);
    }

    public static boolean isSupportedScreenKey(String screenKey) {
        if (screenKey == null || screenKey.isBlank()) {
            return false;
        }
        return SCREEN_KEYS.contains(screenKey.trim());
    }

    public static boolean isSupportedTargetKey(String screenKey, String targetKey) {
        if (screenKey == null || targetKey == null) {
            return false;
        }

        Set<String> options = TARGET_KEYS_BY_SCREEN.get(screenKey.trim());
        if (options == null) {
            return false;
        }

        return options.contains(targetKey.trim());
    }

    public static List<String> screenKeyOptions() {
        return SCREEN_KEYS.stream().sorted().toList();
    }

    public static Map<String, List<String>> targetKeyOptions() {
        Map<String, List<String>> response = new LinkedHashMap<>();
        TARGET_KEYS_BY_SCREEN.forEach((screenKey, targetKeys) -> response.put(screenKey, targetKeys.stream().sorted().toList()));
        return response;
    }
}
