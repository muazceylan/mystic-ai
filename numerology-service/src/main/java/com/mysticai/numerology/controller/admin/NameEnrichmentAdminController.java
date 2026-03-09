package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRecomputeResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRunDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyDto;
import com.mysticai.numerology.ingestion.service.NameEnrichmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/name-enrichment")
@RequiredArgsConstructor
public class NameEnrichmentAdminController {

    private final NameEnrichmentService enrichmentService;

    @GetMapping("/runs")
    public ResponseEntity<Page<NameEnrichmentRunDto>> listRuns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return ResponseEntity.ok(enrichmentService.listRuns(page, size));
    }

    @PostMapping("/run")
    public ResponseEntity<NameEnrichmentRunDto> runBatch(
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(enrichmentService.runBatch(actedBy));
    }

    @PostMapping("/recompute/{nameId}")
    public ResponseEntity<NameEnrichmentRecomputeResponseDto> recomputeOne(
            @PathVariable Long nameId,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(enrichmentService.recomputeSingleName(nameId, actedBy));
    }

    @GetMapping("/tags/{nameId}")
    public ResponseEntity<List<NameTagDto>> listNameTags(@PathVariable Long nameId) {
        return ResponseEntity.ok(enrichmentService.listTags(nameId));
    }

    @GetMapping("/taxonomy")
    public ResponseEntity<NameTagTaxonomyDto> taxonomy() {
        return ResponseEntity.ok(enrichmentService.taxonomy());
    }
}
