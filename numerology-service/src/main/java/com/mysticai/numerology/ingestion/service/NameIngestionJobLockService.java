package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionJobLockDto;
import com.mysticai.numerology.ingestion.dto.admin.RunningIngestionJobDto;
import com.mysticai.numerology.ingestion.dto.admin.StaleLockRecoveryResponseDto;
import com.mysticai.numerology.ingestion.entity.NameIngestionJobLock;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameIngestionJobLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class NameIngestionJobLockService {

    private final NameIngestionProperties properties;
    private final NameIngestionJobLockRepository lockRepository;
    private final IngestionInstanceIdentityService instanceIdentityService;

    private final Map<String, LocalDateTime> localHeartbeatByLockKey = new ConcurrentHashMap<>();

    @Transactional
    public LockAcquireResult tryAcquire(SourceName sourceName, IngestionTriggerType triggerType) {
        NameIngestionJobLock lock = loadOrCreateForUpdate(sourceName);
        LocalDateTime now = LocalDateTime.now();

        if (lock.getStatus() == IngestionJobLockStatus.RUNNING) {
            boolean stale = isStale(lock, now);
            ManualRunRejectionReason rejectionReason = stale
                    ? ManualRunRejectionReason.LOCK_STALE
                    : ManualRunRejectionReason.ALREADY_RUNNING;

            String message = stale
                    ? "source lock is stale; recover required before next run"
                    : "source is already running";

            return new LockAcquireResult(
                    false,
                    null,
                    rejectionReason,
                    message,
                    lock,
                    stale
            );
        }

        lock.setStatus(IngestionJobLockStatus.RUNNING);
        lock.setLockKey(UUID.randomUUID().toString());
        lock.setOwnerInstanceId(instanceIdentityService.getInstanceId());
        lock.setTriggerType(triggerType);
        lock.setJobRunId(null);
        lock.setStartedAt(now);
        lock.setHeartbeatAt(now);
        lock.setReleasedAt(null);
        lock.setReleaseReason(null);
        lock = lockRepository.save(lock);

        JobLockHandle handle = new JobLockHandle(
                lock.getId(),
                lock.getSourceName(),
                lock.getLockKey(),
                lock.getOwnerInstanceId(),
                triggerType
        );
        localHeartbeatByLockKey.put(handle.lockKey(), now);

        return new LockAcquireResult(
                true,
                handle,
                ManualRunRejectionReason.NONE,
                "lock acquired",
                lock,
                false
        );
    }

    @Transactional
    public void attachRunId(JobLockHandle handle, Long runId) {
        if (handle == null || runId == null) {
            return;
        }
        NameIngestionJobLock lock = loadOrCreateForUpdate(handle.sourceName());
        if (!matchesActiveLock(lock, handle.lockKey())) {
            return;
        }
        lock.setJobRunId(runId);
        lockRepository.save(lock);
    }

    @Transactional
    public void heartbeat(JobLockHandle handle) {
        if (handle == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLocal = localHeartbeatByLockKey.get(handle.lockKey());
        if (lastLocal != null) {
            long seconds = Duration.between(lastLocal, now).getSeconds();
            if (seconds < Math.max(1, properties.getLockHeartbeatIntervalSeconds())) {
                return;
            }
        }

        NameIngestionJobLock lock = loadOrCreateForUpdate(handle.sourceName());
        if (!matchesActiveLock(lock, handle.lockKey())) {
            return;
        }

        lock.setHeartbeatAt(now);
        lockRepository.save(lock);
        localHeartbeatByLockKey.put(handle.lockKey(), now);
    }

    @Transactional
    public void release(JobLockHandle handle, boolean success, String releaseReason) {
        if (handle == null) {
            return;
        }
        try {
            NameIngestionJobLock lock = loadOrCreateForUpdate(handle.sourceName());
            if (!matchesActiveLock(lock, handle.lockKey())) {
                return;
            }

            LocalDateTime now = LocalDateTime.now();
            lock.setStatus(success ? IngestionJobLockStatus.RELEASED : IngestionJobLockStatus.FAILED);
            lock.setHeartbeatAt(now);
            lock.setReleasedAt(now);
            lock.setReleaseReason(cleanReason(releaseReason));
            lock.setLockKey(null);
            lockRepository.save(lock);
        } finally {
            localHeartbeatByLockKey.remove(handle.lockKey());
        }
    }

    public List<RunningIngestionJobDto> listRunningJobs() {
        LocalDateTime now = LocalDateTime.now();
        return lockRepository.findByStatusOrderByHeartbeatAtDesc(IngestionJobLockStatus.RUNNING)
                .stream()
                .map(lock -> toRunningDto(lock, now))
                .toList();
    }

    public List<NameIngestionJobLockDto> listLocks() {
        LocalDateTime now = LocalDateTime.now();
        return lockRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(lock -> toLockDto(lock, now))
                .toList();
    }

    public Optional<NameIngestionJobLockDto> getLock(SourceName sourceName) {
        LocalDateTime now = LocalDateTime.now();
        return lockRepository.findBySourceName(sourceName).map(lock -> toLockDto(lock, now));
    }

    @Transactional
    public StaleLockRecoveryResponseDto recoverStale(SourceName sourceName, String actor) {
        NameIngestionJobLock lock = loadOrCreateForUpdate(sourceName);
        LocalDateTime now = LocalDateTime.now();

        if (lock.getStatus() != IngestionJobLockStatus.RUNNING) {
            return new StaleLockRecoveryResponseDto(
                    sourceName,
                    false,
                    "lock is not in RUNNING status",
                    lock.getStatus(),
                    lock.getStatus(),
                    lock.getHeartbeatAt(),
                    null
            );
        }

        if (!isStale(lock, now)) {
            return new StaleLockRecoveryResponseDto(
                    sourceName,
                    false,
                    "active running lock cannot be recovered",
                    IngestionJobLockStatus.RUNNING,
                    IngestionJobLockStatus.RUNNING,
                    lock.getHeartbeatAt(),
                    null
            );
        }

        LocalDateTime previousHeartbeat = lock.getHeartbeatAt();
        lock.setStatus(IngestionJobLockStatus.STALE);
        lock.setReleasedAt(now);
        lock.setReleaseReason("manual stale recovery by " + cleanActor(actor));
        lock.setLockKey(null);
        lockRepository.save(lock);

        return new StaleLockRecoveryResponseDto(
                sourceName,
                true,
                "stale lock recovered",
                IngestionJobLockStatus.RUNNING,
                IngestionJobLockStatus.STALE,
                previousHeartbeat,
                now
        );
    }

    public boolean isStale(NameIngestionJobLock lock, LocalDateTime now) {
        if (lock == null || lock.getStatus() != IngestionJobLockStatus.RUNNING) {
            return false;
        }

        LocalDateTime anchor = lock.getHeartbeatAt() == null ? lock.getStartedAt() : lock.getHeartbeatAt();
        if (anchor == null) {
            return false;
        }

        return anchor.plusSeconds(Math.max(30, properties.getLockStaleSeconds())).isBefore(now);
    }

    public String currentInstanceId() {
        return instanceIdentityService.getInstanceId();
    }

    private NameIngestionJobLock loadOrCreateForUpdate(SourceName sourceName) {
        Optional<NameIngestionJobLock> existing = lockRepository.findBySourceNameForUpdate(sourceName);
        if (existing.isPresent()) {
            return existing.get();
        }

        try {
            lockRepository.saveAndFlush(NameIngestionJobLock.builder()
                    .sourceName(sourceName)
                    .status(IngestionJobLockStatus.RELEASED)
                    .releaseReason("initialized")
                    .build());
        } catch (DataIntegrityViolationException ex) {
            log.debug("source={} lock row already initialized by another transaction", sourceName);
        }

        return lockRepository.findBySourceNameForUpdate(sourceName)
                .orElseThrow(() -> new IllegalStateException("failed to initialize lock row for source: " + sourceName));
    }

    private boolean matchesActiveLock(NameIngestionJobLock lock, String lockKey) {
        return lock.getStatus() == IngestionJobLockStatus.RUNNING
                && lock.getLockKey() != null
                && lock.getLockKey().equals(lockKey);
    }

    private RunningIngestionJobDto toRunningDto(NameIngestionJobLock lock, LocalDateTime now) {
        boolean stale = isStale(lock, now);
        long staleForSeconds = stale && lock.getHeartbeatAt() != null
                ? Math.max(0, Duration.between(lock.getHeartbeatAt(), now).getSeconds())
                : 0L;

        return new RunningIngestionJobDto(
                lock.getSourceName(),
                lock.getOwnerInstanceId(),
                lock.getTriggerType(),
                lock.getJobRunId(),
                lock.getStartedAt(),
                lock.getHeartbeatAt(),
                stale,
                staleForSeconds
        );
    }

    private NameIngestionJobLockDto toLockDto(NameIngestionJobLock lock, LocalDateTime now) {
        boolean stale = isStale(lock, now);
        long staleForSeconds = stale && lock.getHeartbeatAt() != null
                ? Math.max(0, Duration.between(lock.getHeartbeatAt(), now).getSeconds())
                : 0L;

        return new NameIngestionJobLockDto(
                lock.getId(),
                lock.getSourceName(),
                lock.getLockKey(),
                lock.getStatus(),
                lock.getOwnerInstanceId(),
                lock.getTriggerType(),
                lock.getJobRunId(),
                lock.getStartedAt(),
                lock.getHeartbeatAt(),
                lock.getReleasedAt(),
                lock.getReleaseReason(),
                stale,
                staleForSeconds,
                lock.getCreatedAt(),
                lock.getUpdatedAt()
        );
    }

    private String cleanReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() <= 2000) {
            return trimmed;
        }
        return trimmed.substring(0, 2000);
    }

    private String cleanActor(String actor) {
        if (actor == null || actor.isBlank()) {
            return "unknown";
        }
        return actor.trim();
    }

    public record JobLockHandle(
            Long lockId,
            SourceName sourceName,
            String lockKey,
            String ownerInstanceId,
            IngestionTriggerType triggerType
    ) {
    }

    public record LockAcquireResult(
            boolean acquired,
            JobLockHandle handle,
            ManualRunRejectionReason rejectionReason,
            String message,
            NameIngestionJobLock lockSnapshot,
            boolean staleLock
    ) {
    }
}
