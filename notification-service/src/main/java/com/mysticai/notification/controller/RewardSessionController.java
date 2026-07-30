package com.mysticai.notification.controller;

import com.mysticai.notification.dto.rewarded.CreateRewardSessionRequest;
import com.mysticai.notification.dto.rewarded.CreateRewardSessionResponse;
import com.mysticai.notification.entity.monetization.RewardSession;
import com.mysticai.notification.security.SecurityContextHelper;
import com.mysticai.notification.service.rewarded.RewardSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Mints opaque reward sessions for provider S2S rewarded-ad flows.
 *
 * Base path: /api/v1/rewarded-ads
 *
 * AUTH: user Bearer token — validated independently by {@code UserJwtFilter}
 * (which also guards this prefix). userId comes from the security context, never
 * from the request body or X-User-Id header, so a session can only ever be minted
 * for the authenticated caller.
 */
@RestController
@RequestMapping("/api/v1/rewarded-ads")
@RequiredArgsConstructor
@Slf4j
public class RewardSessionController {

    private final RewardSessionService sessionService;

    @PostMapping("/sessions")
    public ResponseEntity<CreateRewardSessionResponse> createSession(
            @Valid @RequestBody(required = false) CreateRewardSessionRequest req) {

        Long userId = SecurityContextHelper.getRequiredUserId();
        CreateRewardSessionRequest safeReq = req != null
                ? req
                : new CreateRewardSessionRequest(null, null, null);

        RewardSession session = sessionService.createSession(
                userId, safeReq.provider(), safeReq.channel(), safeReq.placement());

        CreateRewardSessionResponse body = new CreateRewardSessionResponse(
                session.getId(),
                session.getId(), // externalIdentifier == sessionId (opaque, unguessable)
                session.getRewardAmount(),
                session.getExpiresAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}
