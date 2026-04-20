package com.mysticai.auth.scheduler;

import com.mysticai.auth.config.properties.SignupBonusSyncProperties;
import com.mysticai.auth.service.SignupBonusSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SignupBonusSyncScheduler {

    private final SignupBonusSyncService signupBonusSyncService;
    private final SignupBonusSyncProperties properties;

    @Scheduled(
            initialDelayString = "#{@signupBonusSyncProperties.schedulerInitialDelay().toMillis()}",
            fixedDelayString = "#{@signupBonusSyncProperties.schedulerFixedDelay().toMillis()}"
    )
    public void processPendingSignupBonuses() {
        List<Long> userIds = signupBonusSyncService.findRetryCandidateIds();
        if (userIds.isEmpty()) {
            log.debug("Signup bonus retry job: no pending users");
            return;
        }

        log.info("Signup bonus retry job started: candidates={}, batchSize={}", userIds.size(), properties.batchSize());
        for (Long userId : userIds) {
            try {
                signupBonusSyncService.attemptSignupBonusSync(userId, "scheduler");
            } catch (Exception e) {
                log.error("Signup bonus retry job failed for userId={}", userId, e);
            }
        }
        log.info("Signup bonus retry job finished: processed={}", userIds.size());
    }
}
