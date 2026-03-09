package com.mysticai.notification.tutorial.controller.app;

import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicListResponse;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.service.TutorialConfigQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/tutorial-configs")
@RequiredArgsConstructor
public class TutorialConfigController {

    private final TutorialConfigQueryService queryService;

    @GetMapping
    public ResponseEntity<TutorialConfigPublicListResponse> list(
            @RequestParam(defaultValue = "MOBILE") TutorialPlatform platform,
            @RequestParam(defaultValue = "true") boolean onlyActive,
            @RequestParam(defaultValue = "true") boolean publishedOnly,
            @RequestParam(required = false) String screenKey
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS))
                .body(queryService.findForMobile(platform, onlyActive, publishedOnly, screenKey));
    }
}
