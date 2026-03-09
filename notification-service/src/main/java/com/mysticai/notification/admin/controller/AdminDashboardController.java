package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<AdminDashboardService.DashboardSummary> summary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }
}
