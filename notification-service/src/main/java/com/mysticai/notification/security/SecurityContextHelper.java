package com.mysticai.notification.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

/**
 * Utility for extracting the authenticated user id from Spring Security context.
 *
 * WHY: Controllers no longer read userId from request headers.
 * UserJwtFilter sets Authentication.principal = Long userId after validating the JWT.
 * This helper centralises that extraction.
 */
public final class SecurityContextHelper {

    private SecurityContextHelper() {}

    /**
     * Returns the authenticated user's id.
     *
     * @throws ResponseStatusException 401 if there is no authenticated principal.
     */
    public static Long getRequiredUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Bu işlem için giriş yapmanız gerekmektedir.");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Long userId) {
            return userId;
        }
        if (principal instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ex) {
                // fall through
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
            "Kullanıcı kimliği doğrulanamadı.");
    }
}
