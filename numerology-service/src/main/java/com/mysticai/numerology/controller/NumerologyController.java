package com.mysticai.numerology.controller;

import com.mysticai.numerology.dto.NumerologyResponse;
import com.mysticai.numerology.service.NumerologyCalculator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/numerology")
public class NumerologyController {

    private final NumerologyCalculator numerologyCalculator;

    public NumerologyController(NumerologyCalculator numerologyCalculator) {
        this.numerologyCalculator = numerologyCalculator;
    }

    @GetMapping("/calculate")
    public ResponseEntity<NumerologyResponse> calculate(
            @RequestParam String name,
            @RequestParam String birthDate,
            @RequestParam(required = false) String effectiveDate,
            @RequestParam(required = false, defaultValue = "tr") String locale,
            @RequestParam(required = false, defaultValue = "day") String guidancePeriod
    ) {
        NumerologyResponse response = numerologyCalculator.calculate(name, birthDate, effectiveDate, locale, guidancePeriod);
        return ResponseEntity.ok(response);
    }
}
