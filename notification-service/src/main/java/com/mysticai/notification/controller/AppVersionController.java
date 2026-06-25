package com.mysticai.notification.controller;

import com.mysticai.notification.dto.AppVersionResponse;
import com.mysticai.notification.service.AppVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/app-version")
@RequiredArgsConstructor
public class AppVersionController {

    private final AppVersionService appVersionService;

    /**
     * Public endpoint — no auth required.
     * Called at app startup before login to determine if a forced update is needed.
     *
     * GET /api/v1/app-version?platform=ios
     * GET /api/v1/app-version?platform=android
     */
    @GetMapping
    public ResponseEntity<?> getVersionInfo(@RequestParam String platform) {
        if (!appVersionService.isSupportedPlatform(platform)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Unsupported platform. Accepted values: ios, android"));
        }
        AppVersionResponse response = appVersionService.getVersionInfo(platform);
        return ResponseEntity.ok(response);
    }
}
