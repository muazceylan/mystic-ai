package com.mysticai.notification.admin.controller;

import com.mysticai.notification.service.ProductAnalyticsService;
import com.mysticai.notification.service.Ga4AggregateExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/product-analytics")
@RequiredArgsConstructor
public class AdminProductAnalyticsController {

    private final ProductAnalyticsService productAnalyticsService;
    private final Ga4AggregateExportService ga4AggregateExportService;

    @GetMapping("/overview")
    public ResponseEntity<ProductAnalyticsService.AnalyticsOverview> overview(
            @RequestParam(defaultValue = "30") int windowDays,
            @RequestParam(defaultValue = "7") int activeWithinDays,
            @RequestParam(defaultValue = "8") int topScreensLimit
    ) {
        return ResponseEntity.ok(
                productAnalyticsService.getOverview(windowDays, activeWithinDays, topScreensLimit)
        );
    }

    @GetMapping("/active-users")
    public ResponseEntity<Page<ProductAnalyticsService.ActiveUserActivity>> activeUsers(
            @RequestParam(defaultValue = "7") int withinDays,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                productAnalyticsService.getActiveUsers(withinDays, PageRequest.of(page, size))
        );
    }

    @PostMapping("/ga4/export")
    public ResponseEntity<Ga4AggregateExportService.ExportResult> exportGa4(
            @RequestParam(defaultValue = "30") int windowDays,
            @RequestParam(defaultValue = "7") int activeWithinDays
    ) {
        return ResponseEntity.ok(
                ga4AggregateExportService.exportSnapshot(windowDays, activeWithinDays)
        );
    }
}
