package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.admin.StaleLockRecoveryResponseDto;
import com.mysticai.numerology.ingestion.entity.NameIngestionJobLock;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameIngestionJobLockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameIngestionJobLockServiceTest {

    @Mock
    private NameIngestionJobLockRepository lockRepository;

    private NameIngestionJobLockService service;
    private NameIngestionJobLock lock;

    @BeforeEach
    void setUp() {
        NameIngestionProperties properties = new NameIngestionProperties();
        properties.setLockStaleSeconds(120);
        properties.setLockHeartbeatIntervalSeconds(5);

        IngestionInstanceIdentityService identityService = new IngestionInstanceIdentityService("instance-1", "numerology-service");
        service = new NameIngestionJobLockService(properties, lockRepository, identityService);

        lock = NameIngestionJobLock.builder()
                .id(1L)
                .sourceName(SourceName.BEBEKISMI)
                .status(IngestionJobLockStatus.RELEASED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(lockRepository.findBySourceNameForUpdate(SourceName.BEBEKISMI)).thenReturn(Optional.of(lock));
        when(lockRepository.save(any(NameIngestionJobLock.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void acquire_preventsDuplicateScheduledAndManualCollision() {
        NameIngestionJobLockService.LockAcquireResult first = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.SCHEDULED);
        assertTrue(first.acquired());
        assertNotNull(first.handle());

        NameIngestionJobLockService.LockAcquireResult secondScheduled = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.SCHEDULED);
        assertFalse(secondScheduled.acquired());
        assertEquals(ManualRunRejectionReason.ALREADY_RUNNING, secondScheduled.rejectionReason());

        NameIngestionJobLockService.LockAcquireResult secondManual = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.MANUAL);
        assertFalse(secondManual.acquired());
        assertEquals(ManualRunRejectionReason.ALREADY_RUNNING, secondManual.rejectionReason());
    }

    @Test
    void release_andConcurrentManualAttemptBehavior() {
        NameIngestionJobLockService.LockAcquireResult acquired = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.MANUAL);
        assertTrue(acquired.acquired());

        NameIngestionJobLockService.LockAcquireResult rejected = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.MANUAL);
        assertFalse(rejected.acquired());
        assertEquals(ManualRunRejectionReason.ALREADY_RUNNING, rejected.rejectionReason());

        service.release(acquired.handle(), true, "done");
        assertEquals(IngestionJobLockStatus.RELEASED, lock.getStatus());
        assertEquals("done", lock.getReleaseReason());
    }

    @Test
    void staleDetectionAndRecovery_behavesSafely() {
        lock.setStatus(IngestionJobLockStatus.RUNNING);
        lock.setHeartbeatAt(LocalDateTime.now().minusMinutes(10));
        lock.setStartedAt(LocalDateTime.now().minusMinutes(12));
        lock.setLockKey("old-lock");
        lock.setOwnerInstanceId("instance-x");

        NameIngestionJobLockService.LockAcquireResult staleAcquire = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.SCHEDULED);
        assertFalse(staleAcquire.acquired());
        assertEquals(ManualRunRejectionReason.LOCK_STALE, staleAcquire.rejectionReason());
        assertTrue(staleAcquire.staleLock());

        StaleLockRecoveryResponseDto recovered = service.recoverStale(SourceName.BEBEKISMI, "ops@mystic.ai");
        assertTrue(recovered.recovered());
        assertEquals(IngestionJobLockStatus.STALE, lock.getStatus());

        lock.setStatus(IngestionJobLockStatus.RUNNING);
        lock.setHeartbeatAt(LocalDateTime.now());
        lock.setLockKey("active-lock");

        StaleLockRecoveryResponseDto activeRecover = service.recoverStale(SourceName.BEBEKISMI, "ops@mystic.ai");
        assertFalse(activeRecover.recovered());
        assertEquals(IngestionJobLockStatus.RUNNING, activeRecover.currentStatus());
    }

    @Test
    void heartbeat_updatesOnlyWhenLockIsOwned() throws Exception {
        NameIngestionJobLockService.LockAcquireResult acquired = service.tryAcquire(SourceName.BEBEKISMI, IngestionTriggerType.MANUAL);
        LocalDateTime before = lock.getHeartbeatAt();

        Thread.sleep(1100L);
        service.heartbeat(acquired.handle());
        service.heartbeat(new NameIngestionJobLockService.JobLockHandle(
                2L,
                SourceName.BEBEKISMI,
                "another-key",
                "instance-1",
                IngestionTriggerType.MANUAL
        ));

        assertNotNull(lock.getHeartbeatAt());
        assertTrue(!lock.getHeartbeatAt().isBefore(before));
        verify(lockRepository).save(lock);
    }
}
