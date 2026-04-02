package com.mysticai.orchestrator.controller;

import com.mysticai.orchestrator.dto.admin.AiModelConfigDto;
import com.mysticai.orchestrator.service.AiModelConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/ai-model-config")
@RequiredArgsConstructor
public class AiModelAdminController {

    private final AiModelConfigService configService;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiModelConfigDto> getConfig() {
        return ResponseEntity.ok(configService.getConfig());
    }

    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateConfig(@RequestBody AiModelConfigDto request) {
        try {
            return ResponseEntity.ok(configService.update(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}
