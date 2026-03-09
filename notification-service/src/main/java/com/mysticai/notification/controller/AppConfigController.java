package com.mysticai.notification.controller;

import com.mysticai.notification.admin.service.AppConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/app-config")
@RequiredArgsConstructor
public class AppConfigController {

    private final AppConfigService appConfigService;

    /**
     * Public endpoint — no auth required.
     * Returns active module visibility, navigation config, and maintenance flags.
     * Cached for 60 seconds on the client side to reduce load.
     */
    @GetMapping
    public ResponseEntity<AppConfigService.AppConfig> getConfig() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS))
                .body(appConfigService.getConfig());
    }
}
