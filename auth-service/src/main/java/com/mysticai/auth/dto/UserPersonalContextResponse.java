package com.mysticai.auth.dto;

import java.time.LocalDate;

/**
 * Minimal, service-to-service view of the profile fields a downstream domain service needs in
 * order to personalise generated content.
 *
 * Data minimisation: a field belongs here only if a consumer demonstrably changes its output
 * because of it. Deliberately excluded —
 * <ul>
 *   <li><b>gender</b>: influences no content decision, so it is never transported;</li>
 *   <li><b>preferredLanguage</b>: the caller already carries the request locale;</li>
 *   <li><b>name / email / avatar</b>: never needed for content generation;</li>
 *   <li><b>profession / employment</b>: the product does not collect it at all.</li>
 * </ul>
 */
public record UserPersonalContextResponse(
        Long userId,
        LocalDate birthDate,
        Boolean birthTimeUnknown,
        String maritalStatus,
        String timezone
) {}
