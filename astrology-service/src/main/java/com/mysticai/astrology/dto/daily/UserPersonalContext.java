package com.mysticai.astrology.dto.daily;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;

/**
 * Profile fields fetched from auth-service for personalisation.
 *
 * Deliberately narrow. Gender is absent because it changes no content decision, so under data
 * minimisation it is never requested or transported. Profession, employer, team and working
 * style are absent because the product never collects them and must never infer them.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UserPersonalContext(
        Long userId,
        LocalDate birthDate,
        Boolean birthTimeUnknown,
        String maritalStatus,
        String timezone
) {
    public static UserPersonalContext empty(Long userId) {
        return new UserPersonalContext(userId, null, null, null, null);
    }

    public boolean hasMaritalStatus() {
        return maritalStatus != null && !maritalStatus.isBlank();
    }

    public boolean hasBirthDate() {
        return birthDate != null;
    }

    public boolean hasTimezone() {
        return timezone != null && !timezone.isBlank();
    }
}
