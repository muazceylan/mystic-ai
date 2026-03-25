package com.mysticai.auth.controller;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.UserType;
import com.mysticai.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Internal admin endpoint for user lookup.
 * Used by the admin panel to search users for test notifications.
 */
@RestController
@RequestMapping("/api/auth/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    public record UserSummary(
            Long id,
            String email,
            String name,
            UserType userType,
            LocalDateTime createdAt,
            LocalDateTime emailVerifiedAt
    ) {
        static UserSummary from(User u) {
            return new UserSummary(
                    u.getId(),
                    u.getEmail(),
                    resolveName(u),
                    u.getUserType(),
                    u.getCreatedAt(),
                    u.getEmailVerifiedAt()
            );
        }
    }

    public record UserStats(
            long totalUsers,
            long registeredUsers,
            long guestUsers,
            long verifiedUsers
    ) {}

    @GetMapping("/stats")
    public ResponseEntity<UserStats> stats() {
        return ResponseEntity.ok(new UserStats(
                userRepository.count(),
                userRepository.countByUserType(UserType.REGISTERED),
                userRepository.countByUserType(UserType.GUEST),
                userRepository.countByEmailVerifiedAtIsNotNull()
        ));
    }

    @GetMapping
    public ResponseEntity<Page<UserSummary>> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) UserType userType,
            @RequestParam(required = false) String ids,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        List<Long> parsedIds = parseIds(ids);
        String normalizedQuery = q == null ? "" : q.trim();
        Page<User> users = userRepository.adminSearch(
                normalizedQuery,
                userType,
                parsedIds.isEmpty() ? List.of(-1L) : parsedIds,
                parsedIds.isEmpty(),
                PageRequest.of(page, size, Sort.by("email"))
        );

        return ResponseEntity.ok(users.map(UserSummary::from));
    }

    private static String resolveName(User user) {
        if (user.getName() != null && !user.getName().isBlank()) {
            return user.getName();
        }
        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String combined = (firstName + " " + lastName).trim();
        return combined.isEmpty() ? null : combined;
    }

    private static List<Long> parseIds(String ids) {
        if (ids == null || ids.isBlank()) {
            return List.of();
        }
        return Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(token -> !token.isEmpty())
                .map(Long::valueOf)
                .toList();
    }
}
