package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.dto.daily.PlanFeedbackReason;
import com.mysticai.astrology.dto.daily.UserPersonalContext;

import java.time.LocalDate;
import java.time.Period;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * The real, verified signals available for one user on one local day.
 *
 * Nothing here is inferred. If the user never supplied marital status the accessor reports
 * UNKNOWN and the composer falls back to audience-neutral copy rather than guessing.
 *
 * Two fields are deliberately absent:
 * <ul>
 *   <li><b>profession / employment</b> — the product never collects it, so it cannot be used
 *       or assumed;</li>
 *   <li><b>gender</b> — it does not influence any content decision, so under data
 *       minimisation it is not transported from auth-service and not represented here.</li>
 * </ul>
 */
public record PersonalPlanSignals(
        Long userId,
        LocalDate localDate,
        boolean english,
        String sunSign,
        String moonSign,
        String risingSign,
        boolean hasBirthTime,
        boolean hasHouses,
        AgeBand ageBand,
        RelationshipStatus relationshipStatus,
        int retrogradeCount,
        Set<PlanFeedbackReason> recentNegativeReasons,
        Map<LifeArea, Integer> lifeAreaWeights,
        Set<String> preferredActionIntents
) {

    public enum AgeBand {
        UNKNOWN, YOUNG_ADULT, ADULT, MIDLIFE, LATER_LIFE;

        static AgeBand fromBirthDate(LocalDate birthDate, LocalDate today) {
            if (birthDate == null || today == null || birthDate.isAfter(today)) {
                return UNKNOWN;
            }
            int years = Period.between(birthDate, today).getYears();
            if (years < 18) return UNKNOWN;
            if (years < 27) return YOUNG_ADULT;
            if (years < 40) return ADULT;
            if (years < 56) return MIDLIFE;
            return LATER_LIFE;
        }

        public String slug() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    public enum RelationshipStatus {
        UNKNOWN, SINGLE, PARTNERED;

        /**
         * Maps auth-service's free-form marital status. Anything not recognised stays UNKNOWN
         * so the plan never asserts a relationship the user did not describe.
         */
        static RelationshipStatus fromMaritalStatus(String raw) {
            if (raw == null || raw.isBlank()) {
                return UNKNOWN;
            }
            String token = raw.trim().toLowerCase(new Locale("tr", "TR"))
                    .replace("ı", "i")
                    .replace("ş", "s")
                    .replace("ç", "c")
                    .replace("ğ", "g")
                    .replace("ö", "o")
                    .replace("ü", "u");
            if (token.contains("bekar") || token.contains("single")) {
                return SINGLE;
            }
            if (token.contains("evli") || token.contains("married")
                    || token.contains("iliski") || token.contains("relationship")
                    || token.contains("partner") || token.contains("nisanli")
                    || token.contains("engaged")) {
                return PARTNERED;
            }
            // "boşandı" / "divorced" / "dul" / "widowed" describe history, not current status.
            return UNKNOWN;
        }
    }

    public static PersonalPlanSignals build(
            Long userId,
            LocalDate localDate,
            boolean english,
            UserPersonalContext profile,
            String sunSign,
            String moonSign,
            String risingSign,
            boolean hasHouses,
            int retrogradeCount,
            Set<PlanFeedbackReason> recentNegativeReasons
    ) {
        UserPersonalContext safeProfile = profile != null ? profile : UserPersonalContext.empty(userId);
        boolean hasBirthTime = risingSign != null && !risingSign.isBlank()
                && !Boolean.TRUE.equals(safeProfile.birthTimeUnknown());

        return new PersonalPlanSignals(
                userId,
                localDate,
                english,
                blankToNull(sunSign),
                blankToNull(moonSign),
                blankToNull(risingSign),
                hasBirthTime,
                hasHouses,
                AgeBand.fromBirthDate(safeProfile.birthDate(), localDate),
                RelationshipStatus.fromMaritalStatus(safeProfile.maritalStatus()),
                retrogradeCount,
                recentNegativeReasons == null ? Set.of() : Set.copyOf(recentNegativeReasons),
                Map.of(),
                Set.of()
        );
    }

    public static PersonalPlanSignals build(
            Long userId,
            LocalDate localDate,
            boolean english,
            UserPersonalContext profile,
            String sunSign,
            String moonSign,
            String risingSign,
            boolean hasHouses,
            int retrogradeCount,
            Set<PlanFeedbackReason> recentNegativeReasons,
            Map<LifeArea, Integer> lifeAreaWeights,
            Set<String> preferredActionIntents
    ) {
        PersonalPlanSignals base = build(
                userId, localDate, english, profile, sunSign, moonSign, risingSign,
                hasHouses, retrogradeCount, recentNegativeReasons);
        return new PersonalPlanSignals(
                base.userId(), base.localDate(), base.english(), base.sunSign(), base.moonSign(),
                base.risingSign(), base.hasBirthTime(), base.hasHouses(), base.ageBand(),
                base.relationshipStatus(), base.retrogradeCount(), base.recentNegativeReasons(),
                lifeAreaWeights == null ? Map.of() : Map.copyOf(lifeAreaWeights),
                preferredActionIntents == null ? Set.of() : Set.copyOf(preferredActionIntents));
    }

    public int lifeAreaWeight(LifeArea area) {
        return lifeAreaWeights.getOrDefault(area, 0);
    }

    /**
     * Whether the audience-gated copy for this variant may be shown. Unknown status means
     * only neutral copy is eligible.
     */
    public boolean allows(PlanVariant.Audience audience) {
        return switch (audience) {
            case ANY -> true;
            case PARTNERED -> relationshipStatus == RelationshipStatus.PARTNERED;
            case SINGLE -> relationshipStatus == RelationshipStatus.SINGLE;
        };
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
