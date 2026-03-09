package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRecomputeResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameEnrichmentRunDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagTaxonomyDto;
import com.mysticai.numerology.ingestion.model.NameEnrichmentRunStatus;
import com.mysticai.numerology.ingestion.model.NameEnrichmentTriggerType;
import com.mysticai.numerology.ingestion.service.NameEnrichmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameEnrichmentAdminControllerTest {

    @Mock
    private NameEnrichmentService service;

    @InjectMocks
    private NameEnrichmentAdminController controller;

    @Test
    void runAndRecomputeEndpoints_forwardRequests() {
        NameEnrichmentRunDto runDto = new NameEnrichmentRunDto(
                12L,
                NameEnrichmentTriggerType.BATCH,
                NameEnrichmentRunStatus.SUCCESS,
                "deterministic-v1",
                20,
                18,
                2,
                1,
                0,
                LocalDateTime.now(),
                LocalDateTime.now(),
                null,
                "ops@mystic.ai",
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        NameEnrichmentRecomputeResponseDto recompute = new NameEnrichmentRecomputeResponseDto(
                45L,
                true,
                3,
                1,
                0,
                runDto
        );

        when(service.runBatch("ops@mystic.ai")).thenReturn(runDto);
        when(service.recomputeSingleName(45L, "ops@mystic.ai")).thenReturn(recompute);

        ResponseEntity<NameEnrichmentRunDto> runResponse = controller.runBatch("ops@mystic.ai");
        ResponseEntity<NameEnrichmentRecomputeResponseDto> recomputeResponse = controller.recomputeOne(45L, "ops@mystic.ai");

        assertEquals(200, runResponse.getStatusCode().value());
        assertEquals(12L, runResponse.getBody().id());
        assertEquals(200, recomputeResponse.getStatusCode().value());
        assertEquals(45L, recomputeResponse.getBody().nameId());

        verify(service).runBatch("ops@mystic.ai");
        verify(service).recomputeSingleName(45L, "ops@mystic.ai");
    }

    @Test
    void listEndpoints_forwardPaginationAndTaxonomy() {
        when(service.listRuns(0, 25)).thenReturn(Page.empty());
        NameTagTaxonomyDto taxonomy = new NameTagTaxonomyDto(List.of());
        when(service.taxonomy()).thenReturn(taxonomy);

        ResponseEntity<Page<NameEnrichmentRunDto>> runs = controller.listRuns(0, 25);
        ResponseEntity<NameTagTaxonomyDto> taxonomyResponse = controller.taxonomy();

        assertEquals(0, runs.getBody().getTotalElements());
        assertEquals(0, taxonomyResponse.getBody().groups().size());

        verify(service).listRuns(0, 25);
        verify(service).taxonomy();
    }
}
