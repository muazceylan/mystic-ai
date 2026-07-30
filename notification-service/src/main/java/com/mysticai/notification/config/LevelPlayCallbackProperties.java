package com.mysticai.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "levelplay.rewarded")
@Getter
@Setter
public class LevelPlayCallbackProperties {
    /** Server-owned grant rule. Callback reward values never size the credit. */
    private int rewardAmount = 1;
    private int expectedRewardAmount = 1;
    private int dailyLimit = 10;
    private long sessionTtlSeconds = 600;
    /** Private key configured on the LevelPlay S2S callback page. */
    private String privateKey = "";
    /** Local-only escape hatch. Must remain false in production. */
    private boolean allowUnsignedCallbacks = false;
}
