package com.mysticai.auth.controller;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Internal admin endpoint for user lookup.
 * Used by the admin panel to search users for test notifications.
 */
@RestController
@RequestMapping("/api/auth/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    public record UserSummary(Long id, String email, String name) {
        static UserSummary from(User u) {
            return new UserSummary(u.getId(), u.getEmail(), u.getName());
        }
    }

    @GetMapping
    public ResponseEntity<Page<UserSummary>> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        Page<User> users = q.isBlank()
                ? userRepository.findAll(PageRequest.of(page, size, Sort.by("email")))
                : userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
                        q, q, PageRequest.of(page, size, Sort.by("email")));

        return ResponseEntity.ok(users.map(UserSummary::from));
    }
}
