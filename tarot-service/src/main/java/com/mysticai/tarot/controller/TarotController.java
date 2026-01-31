package com.mysticai.tarot.controller;

import com.mysticai.tarot.dto.AiInterpretationRequest;
import com.mysticai.tarot.dto.TarotCardDTO;
import com.mysticai.tarot.dto.TarotReadingRequest;
import com.mysticai.tarot.dto.TarotReadingResponse;
import com.mysticai.tarot.service.TarotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tarot")
@RequiredArgsConstructor
public class TarotController {

    private final TarotService tarotService;

    @GetMapping("/cards")
    public ResponseEntity<List<TarotCardDTO>> getAllCards() {
        return ResponseEntity.ok(tarotService.getAllCards());
    }

    @GetMapping("/cards/{id}")
    public ResponseEntity<TarotCardDTO> getCardById(@PathVariable Long id) {
        return ResponseEntity.ok(tarotService.getCardById(id));
    }

    @GetMapping("/cards/arcana/{arcana}")
    public ResponseEntity<List<TarotCardDTO>> getCardsByArcana(@PathVariable String arcana) {
        return ResponseEntity.ok(tarotService.getCardsByArcana(arcana));
    }

    @PostMapping("/readings/three-card")
    public ResponseEntity<TarotReadingResponse> createThreeCardReading(
            @Valid @RequestBody TarotReadingRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "anonymous") String userId
    ) {
        TarotReadingResponse response = tarotService.createThreeCardReading(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/readings/{id}")
    public ResponseEntity<TarotReadingResponse> getReadingById(@PathVariable Long id) {
        return ResponseEntity.ok(tarotService.getReadingById(id));
    }

    @GetMapping("/readings")
    public ResponseEntity<List<TarotReadingResponse>> getUserReadings(
            @RequestHeader(value = "X-User-Id", defaultValue = "anonymous") String userId
    ) {
        return ResponseEntity.ok(tarotService.getUserReadings(userId));
    }

    @GetMapping("/readings/{id}/prepare-interpretation")
    public ResponseEntity<AiInterpretationRequest> prepareForAiInterpretation(@PathVariable Long id) {
        return ResponseEntity.ok(tarotService.prepareForAiInterpretation(id));
    }

    @PutMapping("/readings/{id}/interpretation")
    public ResponseEntity<Void> updateInterpretation(
            @PathVariable Long id,
            @RequestBody String interpretation
    ) {
        tarotService.updateReadingInterpretation(id, interpretation);
        return ResponseEntity.ok().build();
    }
}
