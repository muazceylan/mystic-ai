package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.service.DiscoveryService;
import com.mysticai.astrology.service.StarMateActionService;
import com.mysticai.astrology.service.StarMateMatchService;
import com.mysticai.astrology.service.StarMateProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/star-mate")
@RequiredArgsConstructor
@Validated
@Slf4j
public class StarMateController {

    private final StarMateProfileService starMateProfileService;
    private final DiscoveryService discoveryService;
    private final StarMateActionService starMateActionService;
    private final StarMateMatchService starMateMatchService;

    @PostMapping("/profile")
    public ResponseEntity<StarMateProfileResponse> upsertProfile(@Valid @RequestBody StarMateProfileRequest request) {
        log.info("StarMate profile upsert request for userId={}", request.userId());
        return ResponseEntity.ok(starMateProfileService.upsertProfile(request));
    }

    @GetMapping("/feed")
    public ResponseEntity<StarMateFeedResponse> getFeed(
            @RequestParam @NotNull Long userId,
            @RequestParam(required = false) @Min(1) Integer limit
    ) {
        return ResponseEntity.ok(discoveryService.getFeed(userId, limit));
    }

    @PostMapping("/action")
    public ResponseEntity<StarMateActionResponse> action(@Valid @RequestBody StarMateActionRequest request) {
        log.info("StarMate action: userId={} targetUserId={} action={}",
                request.userId(), request.targetUserId(), request.actionType());
        return ResponseEntity.ok(starMateActionService.processAction(request));
    }

    @GetMapping("/matches")
    public ResponseEntity<List<StarMateMatchResponse>> getMatches(@RequestParam @NotNull Long userId) {
        return ResponseEntity.ok(starMateMatchService.listMatches(userId));
    }
}
