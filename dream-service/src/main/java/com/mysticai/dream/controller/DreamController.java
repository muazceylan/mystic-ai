package com.mysticai.dream.controller;

import com.mysticai.dream.dto.DreamRequest;
import com.mysticai.dream.dto.DreamResponse;
import com.mysticai.dream.service.DreamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dreams")
public class DreamController {

    private final DreamService dreamService;

    public DreamController(DreamService dreamService) {
        this.dreamService = dreamService;
    }

    @PostMapping
    public ResponseEntity<DreamResponse> createDream(
            @Valid @RequestBody DreamRequest request,
            @RequestHeader("X-User-Id") Long userId
    ) {
        DreamResponse response = dreamService.saveDream(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DreamResponse>> getUserDreams(
            @RequestHeader("X-User-Id") Long userId
    ) {
        List<DreamResponse> dreams = dreamService.getUserDreams(userId);
        return ResponseEntity.ok(dreams);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DreamResponse> getDreamById(@PathVariable Long id) {
        DreamResponse dream = dreamService.getDreamById(id);
        return ResponseEntity.ok(dream);
    }
}
