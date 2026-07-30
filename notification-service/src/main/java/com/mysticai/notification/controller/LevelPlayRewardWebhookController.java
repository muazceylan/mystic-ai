package com.mysticai.notification.controller;

import com.mysticai.notification.dto.rewarded.LevelPlayCallbackParams;
import com.mysticai.notification.service.rewarded.LevelPlayRewardCallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/levelplay")
@RequiredArgsConstructor
public class LevelPlayRewardWebhookController {
    private final LevelPlayRewardCallbackService callbackService;

    @GetMapping(value = "/rewarded", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> rewarded(
            @RequestParam String timestamp,
            @RequestParam String eventId,
            @RequestParam String userId,
            @RequestParam int rewards,
            @RequestParam(required = false) String signature,
            @RequestParam("custom_rewardSessionId") String rewardSessionId,
            @RequestParam(required = false) String placementName,
            @RequestParam(required = false) String adNetwork,
            @RequestParam(required = false) String auctionId) {
        var params = new LevelPlayCallbackParams(timestamp, eventId, userId, rewards,
                signature, rewardSessionId, placementName, adNetwork, auctionId);
        var result = callbackService.handle(params);
        return switch (result.outcome()) {
            case PROCESSED, DUPLICATE -> ResponseEntity.ok(eventId + ":OK");
            case BAD_REQUEST -> ResponseEntity.badRequest().body(result.code());
            case FORBIDDEN -> ResponseEntity.status(HttpStatus.FORBIDDEN).body(result.code());
            case ERROR -> ResponseEntity.internalServerError().body(result.code());
        };
    }
}
