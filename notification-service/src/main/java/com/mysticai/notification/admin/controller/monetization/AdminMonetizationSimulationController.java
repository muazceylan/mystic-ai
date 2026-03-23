package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.monetization.MonetizationSimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/simulation")
@RequiredArgsConstructor
public class AdminMonetizationSimulationController {

    private final MonetizationSimulationService service;

    @PostMapping
    public ResponseEntity<MonetizationSimulationService.SimulationResult> simulate(
            @RequestBody MonetizationSimulationService.SimulationRequest request) {
        return ResponseEntity.ok(service.simulate(request));
    }
}
