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
    public ResponseEntity<MatchTraitsResponse> getMatchTraits(
            @PathVariable Long matchId,
            @RequestParam(value = "relationshipType", required = false) String relationshipType
    ) {
        log.info("Match traits request: matchId={}, relationshipType={}", matchId, relationshipType);
        try {
            return ResponseEntity.ok(matchTraitsService.getTraitsForMatch(matchId, relationshipType));
        } catch (Exception e) {
            log.error("Match traits endpoint fallback triggered for matchId={}", matchId, e);
            return ResponseEntity.ok(new MatchTraitsResponse(
                    matchId,
                    null,
                    List.of(),
                    List.of(),
                    "Karşılaştırma eksenleri şu anda hazırlanamadı. Ana sinastri analizi kullanılabilir.",
                    relationshipType != null ? relationshipType : "LOVE",
                    new MatchTraitsResponse.Overall(60, "Dengeli Uyum", 0.50d, "Orta", 50),
                    new MatchTraitsResponse.Summary(
                            "Veri hazırlanıyor, denge korunuyor",
                            "Karşılaştırma sinyalleri tam yüklenemediği için bu yorum kısa tutuldu. Veriler güncellendiğinde daha net bir dağılım ve neden analizi görebilirsiniz.",
                            "Bir süre sonra tekrar deneyin; yeni hesaplamada daha ayrışmış sonuçlar görebilirsiniz."
                    ),
                    List.of(),
                    new MatchTraitsResponse.TopDrivers(List.of(), List.of(), List.of()),
                    List.of(),
                    new MatchTraitsResponse.Explainability(
                            "compare-v3.0.0",
                            List.of("aspect_type", "orb_decay", "confidence_damping"),
                            "limited",
                            java.time.LocalDateTime.now().toString(),
                            "low_confidence_damped",
                            "Doğum saati ve ev verisi netleştiğinde analiz hassasiyeti artar.",
                            "fallback"
                    )
            ));
        }
    }
}
