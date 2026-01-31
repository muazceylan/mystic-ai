package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.NatalChartRequest;
import com.mysticai.astrology.dto.NatalChartResponse;
import com.mysticai.astrology.entity.ZodiacSign;
import com.mysticai.astrology.service.AstrologyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/astrology")
@RequiredArgsConstructor
public class AstrologyController {

    private final AstrologyService astrologyService;

    /**
     * Calculate natal chart from birth information
     */
    @PostMapping("/calculate")
    public ResponseEntity<NatalChartResponse> calculateNatalChart(
            @Valid @RequestBody NatalChartRequest request
    ) {
        NatalChartResponse response = astrologyService.calculateAndSaveNatalChart(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get natal chart by ID
     */
    @GetMapping("/natal-chart/{id}")
    public ResponseEntity<NatalChartResponse> getNatalChartById(@PathVariable Long id) {
        return ResponseEntity.ok(astrologyService.getNatalChartById(id));
    }

    /**
     * Get all natal charts for a user
     */
    @GetMapping("/natal-charts/user/{userId}")
    public ResponseEntity<List<NatalChartResponse>> getNatalChartsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(astrologyService.getNatalChartsByUserId(userId));
    }

    /**
     * Get latest natal chart for a user
     */
    @GetMapping("/natal-charts/user/{userId}/latest")
    public ResponseEntity<NatalChartResponse> getLatestNatalChart(@PathVariable Long userId) {
        return ResponseEntity.ok(astrologyService.getLatestNatalChartByUserId(userId));
    }

    /**
     * Quick sun sign calculation without saving
     */
    @GetMapping("/sun-sign")
    public ResponseEntity<Map<String, Object>> getSunSign(
            @RequestParam int month,
            @RequestParam int day
    ) {
        ZodiacSign sign = astrologyService.calculateSunSignOnly(month, day);
        return ResponseEntity.ok(Map.of(
                "sign", sign.name(),
                "turkishName", sign.getTurkishName(),
                "symbol", sign.getSymbol(),
                "element", sign.getElement(),
                "dateRange", sign.getDateRange()
        ));
    }

    /**
     * Get all zodiac signs information
     */
    @GetMapping("/zodiac-signs")
    public ResponseEntity<List<Map<String, String>>> getAllZodiacSigns() {
        List<Map<String, String>> signs = Arrays.stream(ZodiacSign.values())
                .filter(sign -> sign != ZodiacSign.UNKNOWN)
                .map(sign -> Map.of(
                        "name", sign.name(),
                        "turkishName", sign.getTurkishName(),
                        "symbol", sign.getSymbol(),
                        "element", sign.getElement(),
                        "dateRange", sign.getDateRange()
                ))
                .toList();
        return ResponseEntity.ok(signs);
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Astrology Service is running");
    }
}
