package com.mysticai.notification.controller;

import com.mysticai.notification.dto.AppVersionResponse;
import com.mysticai.notification.service.AppVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
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
     * Called at app startup (and on every background → active return) before login.
     *
     * <p>The caller reports what its native package says it is running; the admin-managed policy
     * is evaluated server-side and a normalized status is returned.
     *
     * <pre>
     * GET /api/v1/app-version?platform=android&amp;installedVersion=1.1.0&amp;installedBuild=24&amp;locale=tr
     * </pre>
     *
     * <p>{@code installedVersion} / {@code installedBuild} are optional so app builds shipped
     * before this contract keep receiving the raw policy fields.
     *
     * <p>Responses are marked {@code no-store}: an admin policy change must reach the next check,
     * so no proxy or client may serve a stale decision.
     */
    @GetMapping
    public ResponseEntity<?> getVersionInfo(
            @RequestParam String platform,
            @RequestParam(required = false) String installedVersion,
            @RequestParam(required = false) Integer installedBuild,
            @RequestParam(required = false) String locale) {

        if (!appVersionService.isSupportedPlatform(platform)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Unsupported platform. Accepted values: ios, android"));
        }

        AppVersionResponse response =
                appVersionService.getVersionInfo(platform, installedVersion, installedBuild, locale);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
