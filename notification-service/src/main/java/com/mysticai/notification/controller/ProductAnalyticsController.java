package com.mysticai.notification.controller;

import com.mysticai.notification.service.ProductAnalyticsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Validated
public class ProductAnalyticsController {

    private final ProductAnalyticsService productAnalyticsService;

    public record ScreenViewRequest(
            @NotBlank String screenKey,
            String routePath,
            String platform,
            String sessionId
    ) {}

    @PostMapping("/screen-views")
    public ResponseEntity<Void> recordScreenView(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody ScreenViewRequest request
    ) {
        productAnalyticsService.recordScreenView(
                userId,
                new ProductAnalyticsService.ScreenViewPayload(
                        request.screenKey(),
                        request.routePath(),
                        request.platform(),
                        request.sessionId()
                )
        );
        return ResponseEntity.ok().build();
    }
}
