package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.MatchTraitsResponse;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.SynastryRepository;
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
    private final SynastryRepository synastryRepository;

    @GetMapping("/{matchId}/traits")
    public ResponseEntity<MatchTraitsResponse> getMatchTraits(
            @PathVariable Long matchId,
            @RequestParam(value = "relationshipType", required = false) String relationshipType
    ) {
        log.info("Match traits request: matchId={}, relationshipType={}", matchId, relationshipType);
        try {
            return ResponseEntity.ok(matchTraitsService.getTraitsForMatch(matchId, relationshipType));
        } catch (Exception e) {
            log.error("Match traits endpoint fallback triggered for matchId={}", matchId, e);
            Synastry synastry = synastryRepository.findById(matchId).orElse(null);
            int fallbackScore = synastry != null && synastry.getHarmonyScore() != null
                    ? Math.max(0, Math.min(100, synastry.getHarmonyScore()))
                    : 60;
            String fallbackModule = relationshipType != null && !relationshipType.isBlank()
                    ? relationshipType
                    : synastry != null && synastry.getRelationshipType() != null && !synastry.getRelationshipType().isBlank()
                    ? synastry.getRelationshipType()
                    : "LOVE";
            return ResponseEntity.ok(new MatchTraitsResponse(
                    matchId,
                    fallbackScore,
                    List.of(),
                    List.of(),
                    "Karşılaştırma eksenleri şu anda hazırlanamadı. Ana sinastri analizi kullanılabilir.",
                    fallbackModule,
                    new MatchTraitsResponse.Overall(fallbackScore, "Karışık Potansiyel", 0.50d, "Orta", fallbackScore),
                    new MatchTraitsResponse.Summary(
                        "Veri hazırlanıyor, denge korunuyor",
                        "Karşılaştırma sinyalleri tam yüklenemediği için bu yorum kısa tutuldu. Veriler güncellendiğinde daha net bir dağılım ve neden analizi görebilirsiniz.",
                        "Bir süre sonra tekrar deneyin; yeni hesaplamada daha ayrışmış sonuçlar görebilirsiniz."
                    ),
                    List.of(),
                    new MatchTraitsResponse.TopDrivers(List.of(), List.of(), List.of()),
                    List.of(),
                    new MatchTraitsResponse.Explainability(
                            "compare-legacy-fallback",
                            List.of("stored_harmony_score", "fallback_summary"),
                            "limited",
                            java.time.LocalDateTime.now().toString(),
                            null,
                            null,
                            "fallback"
                    )
            ));
        }
    }
}
