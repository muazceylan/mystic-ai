package com.mysticai.oracle.controller;

import com.mysticai.oracle.dto.HomeBriefResponse;
import com.mysticai.oracle.dto.OracleResponse;
import com.mysticai.oracle.service.OracleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/oracle")
@RequiredArgsConstructor
@Slf4j
public class OracleController {

    private final OracleService oracleService;

    /**
     * GET /api/v1/oracle/daily-secret
     * 
     * Returns the Grand Synthesis - the mystical secret of the day.
     * Combines data from Numerology, Astrology (Natal Chart), and Dreams.
     * 
     * Headers:
     * - X-User-Id: User ID (required)
     * - X-Username: Username (optional)
     * 
     * Query Parameters:
     * - name: User's full name for numerology calculation
     * - birthDate: Birth date in YYYY-MM-DD format
     */
    @GetMapping("/daily-secret")
    public Mono<ResponseEntity<OracleResponse>> getDailySecret(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String maritalStatus,
            @RequestParam(required = false) String focusPoint) {

        log.info("Daily secret requested for user: {} ({})", userId, username);

        return oracleService.getDailySecret(userId, name, birthDate, maritalStatus, focusPoint)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/home-brief")
    public Mono<ResponseEntity<HomeBriefResponse>> getHomeBrief(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String maritalStatus,
            @RequestParam(required = false) String focusPoint) {

        log.info("Home brief requested for user: {} ({})", userId, username);

        return oracleService.getHomeBrief(userId, username, name, birthDate, maritalStatus, focusPoint)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Oracle Service is running");
    }
}
