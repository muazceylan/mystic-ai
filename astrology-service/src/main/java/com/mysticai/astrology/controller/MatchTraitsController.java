package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.MatchTraitsResponse;
import com.mysticai.astrology.service.MatchTraitsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/match", "/api/v1/match"})
@RequiredArgsConstructor
@Slf4j
public class MatchTraitsController {

    private final MatchTraitsService matchTraitsService;

    @GetMapping("/{matchId}/traits")
    public ResponseEntity<MatchTraitsResponse> getMatchTraits(@PathVariable Long matchId) {
        log.info("Match traits request: matchId={}", matchId);
        return ResponseEntity.ok(matchTraitsService.getTraitsForMatch(matchId));
    }
}
