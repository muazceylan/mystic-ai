package com.mysticai.numerology.controller;

import com.mysticai.numerology.dto.NumerologyResponse;
import com.mysticai.numerology.dto.PublicNameDetailDto;
import com.mysticai.numerology.dto.PublicNameListItemDto;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.service.NumerologyCalculator;
import com.mysticai.numerology.service.PublicNameService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/numerology")
public class NumerologyController {

    private final NumerologyCalculator numerologyCalculator;
    private final PublicNameService publicNameService;

    public NumerologyController(NumerologyCalculator numerologyCalculator, PublicNameService publicNameService) {
        this.numerologyCalculator = numerologyCalculator;
        this.publicNameService = publicNameService;
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

    @GetMapping("/names")
    public ResponseEntity<Page<PublicNameListItemDto>> listNames(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ParsedGender gender,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) Boolean quranFlag,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(publicNameService.listNames(q, gender, origin, quranFlag, page, size));
    }

    @GetMapping("/names/{id}")
    public ResponseEntity<PublicNameDetailDto> getNameDetail(@PathVariable Long id) {
        return ResponseEntity.ok(publicNameService.getNameDetail(id));
    }
}
