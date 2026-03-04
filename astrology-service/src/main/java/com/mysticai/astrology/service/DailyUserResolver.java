package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DailyUserResolver {

    private final ObjectMapper objectMapper;

    public Long resolveUserId(HttpServletRequest request, Long fallbackUserId) {
        if (fallbackUserId != null && fallbackUserId > 0) {
            return fallbackUserId;
        }

        String userIdHeader = request.getHeader("X-User-Id");
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            Long value = toLong(userIdHeader.trim());
            if (value != null && value > 0) {
                return value;
            }
        }

        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            return null;
        }

        String token = auth.substring(7).trim();
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return null;
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Map<String, Object> claims = objectMapper.readValue(payload, new TypeReference<>() {});
            Object userId = claims.get("userId");
            if (userId == null) userId = claims.get("uid");
            if (userId == null) userId = claims.get("sub");
            return toLong(userId);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.longValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) return null;

        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ignored) {
            String digits = text.replaceAll("\\D+", "");
            if (digits.isEmpty()) {
                return null;
            }
            try {
                return Long.parseLong(digits);
            } catch (NumberFormatException ignoreAgain) {
                return null;
            }
        }
    }
}

