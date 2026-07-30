package com.mysticai.auth.controller;

import com.mysticai.auth.dto.UserPersonalContextResponse;
import com.mysticai.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Service-to-service endpoints. Never served to mobile or admin clients.
 *
 * Authentication is enforced centrally by
 * {@link com.mysticai.auth.security.InternalServiceKeyFilter} — this controller intentionally
 * contains no key handling, so no endpoint added here can forget the check. The gateway blocks
 * {@code /internal/} paths from outside as an additional layer.
 */
@RestController
@RequestMapping({"/api/v1/auth/internal", "/api/auth/internal"})
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;

    @GetMapping("/users/{userId}/personal-context")
    public ResponseEntity<UserPersonalContextResponse> getPersonalContext(@PathVariable Long userId) {
        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok(new UserPersonalContextResponse(
                        user.getId(),
                        user.getBirthDate(),
                        user.getBirthTimeUnknown(),
                        user.getMaritalStatus(),
                        user.getTimezone()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
