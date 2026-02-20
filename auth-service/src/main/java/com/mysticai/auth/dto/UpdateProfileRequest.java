package com.mysticai.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateProfileRequest(
        String firstName,
        String lastName,
        LocalDate birthDate,
        String birthTime,
        String birthLocation,
        String birthCountry,
        String birthCity,
        Boolean birthTimeUnknown,
        String timezone,
        String gender,
        String maritalStatus,
        String focusPoint,
        String zodiacSign,
        String preferredLanguage
) {}
