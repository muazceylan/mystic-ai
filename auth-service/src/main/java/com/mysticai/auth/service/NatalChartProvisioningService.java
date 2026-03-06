package com.mysticai.auth.service;

import com.mysticai.auth.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class NatalChartProvisioningService {

    private final RestTemplate astrologyRestTemplate;

    @Value("${services.astrology.base-url:http://localhost:8083}")
    private String astrologyServiceBaseUrl;

    public void ensureNatalChartIfEligible(User user) {
        if (user == null || user.getId() == null) {
            return;
        }

        LocalDate birthDate = user.getBirthDate();
        if (birthDate == null) {
            return;
        }

        String birthLocation = resolveBirthLocation(user);
        if (birthLocation == null) {
            return;
        }

        if (hasLatestNatalChart(user.getId())) {
            return;
        }

        String endpoint = normalizeBaseUrl(astrologyServiceBaseUrl) + "/api/v1/astrology/calculate";
        CreateNatalChartRequest payload = new CreateNatalChartRequest(
                user.getId(),
                resolveName(user),
                birthDate,
                resolveBirthTime(user),
                birthLocation,
                user.getTimezone()
        );

        try {
            astrologyRestTemplate.postForEntity(endpoint, payload, String.class);
            log.info("Provisioned natal chart for user {}", user.getId());
        } catch (RestClientException ex) {
            log.warn("Could not provision natal chart for user {}: {}", user.getId(), ex.getMessage());
        }
    }

    private boolean hasLatestNatalChart(Long userId) {
        String endpoint = normalizeBaseUrl(astrologyServiceBaseUrl)
                + "/api/v1/astrology/natal-charts/user/{userId}/latest";

        try {
            astrologyRestTemplate.getForEntity(endpoint, String.class, userId);
            return true;
        } catch (HttpClientErrorException.NotFound ex) {
            return false;
        } catch (RestClientException ex) {
            log.warn("Could not check latest natal chart for user {}: {}", userId, ex.getMessage());
            return true;
        }
    }

    private String resolveBirthLocation(User user) {
        String direct = trimToNull(user.getBirthLocation());
        if (direct != null) {
            return direct;
        }

        String city = trimToNull(user.getBirthCity());
        String country = trimToNull(user.getBirthCountry());
        if (city == null && country == null) {
            return null;
        }
        if (city == null) {
            return country;
        }
        if (country == null) {
            return city;
        }
        return city + ", " + country;
    }

    private String resolveName(User user) {
        String fullName = trimToNull(user.getName());
        if (fullName != null) {
            return fullName;
        }

        String firstName = trimToNull(user.getFirstName());
        String lastName = trimToNull(user.getLastName());
        if (firstName == null && lastName == null) {
            return null;
        }
        if (firstName == null) {
            return lastName;
        }
        if (lastName == null) {
            return firstName;
        }
        return firstName + " " + lastName;
    }

    private String resolveBirthTime(User user) {
        if (Boolean.TRUE.equals(user.getBirthTimeUnknown())) {
            return null;
        }

        String birthTime = trimToNull(user.getBirthTime());
        if (birthTime == null) {
            return null;
        }

        if (birthTime.length() == 5) {
            return birthTime + ":00";
        }
        return birthTime;
    }

    private String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "http://localhost:8083";
        }
        String trimmed = baseUrl.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record CreateNatalChartRequest(
            Long userId,
            String name,
            LocalDate birthDate,
            String birthTime,
            String birthLocation,
            String timezone
    ) {
    }
}
