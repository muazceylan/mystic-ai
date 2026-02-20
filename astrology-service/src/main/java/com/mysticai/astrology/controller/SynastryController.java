package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.SynastryRequest;
import com.mysticai.astrology.dto.SynastryResponse;
import com.mysticai.astrology.service.SynastryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/synastry")
@RequiredArgsConstructor
@Slf4j
public class SynastryController {

    private final SynastryService synastryService;

    /** POST /api/v1/synastry — trigger a new synastry analysis */
    @PostMapping
    public ResponseEntity<SynastryResponse> analyze(@Valid @RequestBody SynastryRequest request) {
        log.info("Synastry request: userId={}, personId={}, type={}",
                request.userId(), request.savedPersonId(), request.relationshipType());
        return ResponseEntity.status(HttpStatus.CREATED).body(synastryService.analyze(request));
    }

    /** GET /api/v1/synastry/{id} — poll for synastry result */
    @GetMapping("/{id}")
    public ResponseEntity<SynastryResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(synastryService.getById(id));
    }

    /** GET /api/v1/synastry/user/{userId} — all synastry results for a user */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SynastryResponse>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(synastryService.getByUser(userId));
    }
}
