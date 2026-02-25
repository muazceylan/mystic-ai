package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.MatchTraitsResponse;
import com.mysticai.astrology.service.MatchTraitsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/match", "/api/v1/match"})
@RequiredArgsConstructor
@Slf4j
public class MatchTraitsController {

    private final MatchTraitsService matchTraitsService;

    @GetMapping("/{matchId}/traits")
    public ResponseEntity<MatchTraitsResponse> getMatchTraits(@PathVariable Long matchId) {
        log.info("Match traits request: matchId={}", matchId);
        try {
            return ResponseEntity.ok(matchTraitsService.getTraitsForMatch(matchId));
        } catch (Exception e) {
            log.error("Match traits endpoint fallback triggered for matchId={}", matchId, e);
            return ResponseEntity.ok(new MatchTraitsResponse(
                    matchId,
                    null,
                    List.of(),
                    List.of(),
                    "Karşılaştırma eksenleri şu anda hazırlanamadı. Ana sinastri analizi kullanılabilir."
            ));
        }
    }
}
