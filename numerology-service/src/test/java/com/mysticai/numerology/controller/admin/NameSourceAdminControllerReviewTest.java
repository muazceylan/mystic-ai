package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.MergeDecisionRequest;
import com.mysticai.numerology.ingestion.dto.admin.ManualRunTriggerResponseDto;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionJobLockDto;
import com.mysticai.numerology.ingestion.dto.admin.NameIngestionRunDto;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionRequest;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueBatchActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueFilter;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueGroupDto;
import com.mysticai.numerology.ingestion.dto.admin.RunningIngestionJobDto;
import com.mysticai.numerology.ingestion.dto.admin.StaleLockRecoveryResponseDto;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.dto.admin.CanonicalResolutionDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceHealthSummaryDto;
import com.mysticai.numerology.ingestion.dto.admin.SourceToggleResponseDto;
import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.MergeRecommendationStatus;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.service.NameIngestionService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NameSourceAdminControllerReviewTest {

    @Test
    void groupedQueueEndpoint_parsesFiltersAndReturnsPayload() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ReviewQueueGroupDto group = new ReviewQueueGroupDto(
                10L,
                "ali",
                MergeReviewStatus.PENDING,
                SourceName.BEBEKISMI,
                null,
                true,
                List.of("origin"),
                List.of(),
                List.of(),
                MergeRecommendationStatus.MERGE_SUGGESTED,
                null,
                "Ali",
                Map.of("meaning_short", SourceName.BEBEKISMI),
                false,
                "origin conflict requires review",
                BigDecimal.valueOf(0.712),
                null,
                null
        );

        ingestionService.groupedQueuePage = new PageImpl<>(List.of(group));

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<Page<ReviewQueueGroupDto>> response = controller.listMergeQueueGrouped(
                "bebekismi",
                "PENDING,SKIPPED",
                true,
                false,
                "LOW",
                "ali",
                true,
                false,
                0,
                25
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().getContent().size());
        assertEquals("ali", response.getBody().getContent().getFirst().canonicalName());

        ReviewQueueFilter captured = ingestionService.capturedFilter;
        assertEquals(SourceName.BEBEKISMI, captured.sourceName());
        assertEquals(ContentQuality.LOW, captured.contentQuality());
        assertEquals("ali", captured.canonicalName());
        assertEquals(Boolean.TRUE, captured.mismatchFlag());
        assertEquals(Boolean.FALSE, captured.duplicateContentFlag());
        assertEquals(Boolean.TRUE, captured.hasConflict());
        assertTrue(captured.reviewStatuses().containsAll(Set.of(MergeReviewStatus.PENDING, MergeReviewStatus.SKIPPED)));
    }

    @Test
    void approveEndpoint_forwardsActorAndReturnsResponse() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.approveResponse = new ReviewQueueActionResponse(
                99L,
                "azra",
                MergeReviewStatus.APPROVED,
                555L,
                777L,
                44L,
                SourceName.SFK_ISTANBUL_EDU,
                Map.of("meaning_long", SourceName.SFK_ISTANBUL_EDU),
                "onay"
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<ReviewQueueActionResponse> response = controller.approve(
                99L,
                new MergeDecisionRequest("sfk_istanbul_edu", "onay"),
                "admin@mystic.ai"
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(MergeReviewStatus.APPROVED, response.getBody().reviewStatus());
        assertEquals(555L, response.getBody().nameId());
        assertEquals("admin@mystic.ai", ingestionService.capturedActor);
        assertEquals(SourceName.SFK_ISTANBUL_EDU, ingestionService.capturedSourceName);
        assertEquals("onay", ingestionService.capturedReviewNote);
    }

    @Test
    void addManualAliasEndpoint_mapsTypeAndForwardsPayload() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.aliasResponse = new NameAliasDto(
                71L,
                12L,
                "Muhammed",
                "muhammed",
                "Mohammed",
                "mohammed",
                AliasType.TRANSLITERATION,
                BigDecimal.valueOf(0.95),
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<NameAliasDto> response = controller.addManualAlias(
                12L,
                new NameAliasCreateRequest("Mohammed", "transliteration", BigDecimal.valueOf(0.95))
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(71L, response.getBody().id());
        assertEquals(12L, ingestionService.capturedCanonicalId);
        assertEquals("Mohammed", ingestionService.capturedAliasName);
        assertEquals(AliasType.TRANSLITERATION, ingestionService.capturedAliasType);
    }

    @Test
    void resolveCanonicalEndpoint_returnsResolutionDto() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.resolutionResponse = new CanonicalResolutionDto(
                "Ayse",
                "ayse",
                AliasMatchLevel.STRONG_ALIAS,
                55L,
                "Ayşe",
                "ayşe",
                AliasType.TRANSLITERATION,
                true
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<CanonicalResolutionDto> response = controller.resolveCanonical("Ayse");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("ayşe", response.getBody().canonicalNormalizedName());
        assertEquals("Ayse", ingestionService.capturedResolveInput);
    }

    @Test
    void healthAndRunEndpoints_returnDashboardContracts() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.healthSummaries = List.of(new SourceHealthSummaryDto(
                SourceName.BEBEKISMI,
                true,
                LocalDateTime.now(),
                LocalDateTime.now(),
                null,
                null,
                20,
                18,
                15,
                1,
                0.8333,
                2,
                1,
                1,
                3,
                5,
                0,
                6,
                false,
                List.of(),
                null,
                4
        ));
        ingestionService.runPage = new PageImpl<>(List.of(new NameIngestionRunDto(
                22L,
                SourceName.BEBEKISMI,
                IngestionTriggerType.SCHEDULED,
                IngestionRunStatus.SUCCESS,
                LocalDateTime.now(),
                LocalDateTime.now(),
                1200L,
                20,
                18,
                15,
                1,
                2,
                1,
                1,
                3,
                5,
                0,
                6,
                14,
                13,
                12,
                0.8333,
                null,
                "scheduler"
        )));

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<List<SourceHealthSummaryDto>> health = controller.listSourceHealth();
        ResponseEntity<Page<NameIngestionRunDto>> runs = controller.listRuns("bebekismi", 0, 25);

        assertEquals(1, health.getBody().size());
        assertEquals(SourceName.BEBEKISMI, health.getBody().getFirst().sourceName());
        assertEquals(1, runs.getBody().getContent().size());
        assertEquals(22L, runs.getBody().getContent().getFirst().id());
    }

    @Test
    void enableDisableEndpoints_forwardActorAndSource() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        SourceToggleResponseDto disabled = new SourceToggleResponseDto(
                SourceName.UFUK,
                false,
                "ops@mystic.ai",
                LocalDateTime.now()
        );
        ingestionService.disableResponse = disabled;
        ingestionService.enableResponse = new SourceToggleResponseDto(
                SourceName.UFUK,
                true,
                "ops@mystic.ai",
                LocalDateTime.now()
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<SourceToggleResponseDto> disable = controller.disableSource("ufuk", "ops@mystic.ai");
        ResponseEntity<SourceToggleResponseDto> enable = controller.enableSource("ufuk", "ops@mystic.ai");

        assertFalse(disable.getBody().enabled());
        assertTrue(enable.getBody().enabled());
        assertEquals(SourceName.UFUK, ingestionService.capturedToggleSource);
        assertEquals("ops@mystic.ai", ingestionService.capturedActor);
    }

    @Test
    void runEndpoint_returnsConflictWhenSourceAlreadyRunning() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.manualRunResponse = new ManualRunTriggerResponseDto(
                SourceName.BEBEKISMI,
                false,
                ManualRunRejectionReason.ALREADY_RUNNING,
                "source already running",
                null,
                "instance-2",
                99L,
                IngestionJobLockStatus.RUNNING,
                false
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<?> response = controller.run("bebekismi", "ops@mystic.ai");

        assertEquals(409, response.getStatusCode().value());
        ManualRunTriggerResponseDto body = (ManualRunTriggerResponseDto) response.getBody();
        assertEquals(ManualRunRejectionReason.ALREADY_RUNNING, body.rejectionReason());
    }

    @Test
    void lockEndpoints_returnRunningAndRecoveryPayloads() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.runningJobs = List.of(new RunningIngestionJobDto(
                SourceName.UFUK,
                "instance-1",
                IngestionTriggerType.SCHEDULED,
                10L,
                LocalDateTime.now(),
                LocalDateTime.now(),
                false,
                0
        ));
        ingestionService.lockList = List.of(new NameIngestionJobLockDto(
                1L,
                SourceName.UFUK,
                "lock-1",
                IngestionJobLockStatus.RUNNING,
                "instance-1",
                IngestionTriggerType.SCHEDULED,
                10L,
                LocalDateTime.now(),
                LocalDateTime.now(),
                null,
                null,
                false,
                0L,
                LocalDateTime.now(),
                LocalDateTime.now()
        ));
        ingestionService.singleLock = ingestionService.lockList.getFirst();
        ingestionService.recoveryResponse = new StaleLockRecoveryResponseDto(
                SourceName.UFUK,
                true,
                "recovered",
                IngestionJobLockStatus.RUNNING,
                IngestionJobLockStatus.STALE,
                LocalDateTime.now().minusMinutes(20),
                LocalDateTime.now()
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);

        ResponseEntity<List<RunningIngestionJobDto>> running = controller.listRunningJobs();
        ResponseEntity<List<NameIngestionJobLockDto>> locks = controller.listJobLocks();
        ResponseEntity<NameIngestionJobLockDto> lock = controller.getJobLock("ufuk");
        ResponseEntity<StaleLockRecoveryResponseDto> recover = controller.recoverStale("ufuk", "ops@mystic.ai");

        assertEquals(1, running.getBody().size());
        assertEquals(1, locks.getBody().size());
        assertEquals(SourceName.UFUK, lock.getBody().sourceName());
        assertEquals(200, recover.getStatusCode().value());
        assertTrue(recover.getBody().recovered());
    }

    @Test
    void recoverStaleEndpoint_returnsConflictForActiveLock() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.recoveryResponse = new StaleLockRecoveryResponseDto(
                SourceName.BEBEKISMI,
                false,
                "active running lock cannot be recovered",
                IngestionJobLockStatus.RUNNING,
                IngestionJobLockStatus.RUNNING,
                LocalDateTime.now(),
                null
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<StaleLockRecoveryResponseDto> response = controller.recoverStale("bebekismi", "ops@mystic.ai");

        assertEquals(409, response.getStatusCode().value());
        assertFalse(response.getBody().recovered());
    }

    @Test
    void autoMergeEndpoint_forwardsPayloadAndActor() {
        FakeNameIngestionService ingestionService = new FakeNameIngestionService();
        ingestionService.autoMergeResponse = new ReviewQueueBatchActionResponse(
                2,
                2,
                0,
                List.of()
        );

        NameSourceAdminController controller = new NameSourceAdminController(ingestionService);
        ResponseEntity<ReviewQueueBatchActionResponse> response = controller.autoMergeEligible(
                new ReviewQueueBatchActionRequest(List.of(10L, 11L), null, "auto merge run"),
                "ops@mystic.ai"
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(2, response.getBody().processed());
        assertEquals(List.of(10L, 11L), ingestionService.capturedAutoMergeQueueIds);
        assertEquals("auto merge run", ingestionService.capturedReviewNote);
        assertEquals("ops@mystic.ai", ingestionService.capturedActor);
    }

    private static class FakeNameIngestionService extends NameIngestionService {

        private ReviewQueueFilter capturedFilter;
        private String capturedActor;
        private SourceName capturedSourceName;
        private String capturedReviewNote;
        private Long capturedCanonicalId;
        private String capturedAliasName;
        private AliasType capturedAliasType;
        private String capturedResolveInput;
        private SourceName capturedToggleSource;
        private ManualRunTriggerResponseDto manualRunResponse;
        private List<ManualRunTriggerResponseDto> manualRunList = List.of();
        private List<RunningIngestionJobDto> runningJobs = List.of();
        private List<NameIngestionJobLockDto> lockList = List.of();
        private NameIngestionJobLockDto singleLock;
        private StaleLockRecoveryResponseDto recoveryResponse;
        private List<Long> capturedAutoMergeQueueIds = List.of();
        private ReviewQueueBatchActionResponse autoMergeResponse;

        private Page<ReviewQueueGroupDto> groupedQueuePage = Page.empty();
        private ReviewQueueActionResponse approveResponse;
        private NameAliasDto aliasResponse;
        private CanonicalResolutionDto resolutionResponse;
        private List<SourceHealthSummaryDto> healthSummaries = List.of();
        private Page<NameIngestionRunDto> runPage = Page.empty();
        private SourceToggleResponseDto enableResponse;
        private SourceToggleResponseDto disableResponse;

        FakeNameIngestionService() {
            super(null, null, null, null, null, null, null, null, null, null, null);
        }

        @Override
        public Page<ReviewQueueGroupDto> listGroupedMergeQueue(ReviewQueueFilter filter, int page, int size) {
            this.capturedFilter = filter;
            return groupedQueuePage;
        }

        @Override
        public ReviewQueueActionResponse approveMergeQueue(Long queueId, SourceName chosenSource, String reviewNote, String actedBy) {
            this.capturedSourceName = chosenSource;
            this.capturedReviewNote = reviewNote;
            this.capturedActor = actedBy;
            return approveResponse;
        }

        @Override
        public NameAliasDto addManualAlias(Long canonicalNameId, String aliasName, AliasType aliasType, BigDecimal confidence) {
            this.capturedCanonicalId = canonicalNameId;
            this.capturedAliasName = aliasName;
            this.capturedAliasType = aliasType;
            return aliasResponse;
        }

        @Override
        public CanonicalResolutionDto resolveCanonical(String inputName) {
            this.capturedResolveInput = inputName;
            return resolutionResponse;
        }

        @Override
        public List<SourceHealthSummaryDto> listSourceHealth() {
            return healthSummaries;
        }

        @Override
        public Page<NameIngestionRunDto> listIngestionRuns(SourceName sourceName, int page, int size) {
            this.capturedSourceName = sourceName;
            return runPage;
        }

        @Override
        public SourceToggleResponseDto enableSource(SourceName sourceName, String actedBy) {
            this.capturedToggleSource = sourceName;
            this.capturedActor = actedBy;
            return enableResponse;
        }

        @Override
        public SourceToggleResponseDto disableSource(SourceName sourceName, String actedBy) {
            this.capturedToggleSource = sourceName;
            this.capturedActor = actedBy;
            return disableResponse;
        }

        @Override
        public ManualRunTriggerResponseDto triggerManualRun(SourceName sourceName, String triggeredBy) {
            this.capturedSourceName = sourceName;
            this.capturedActor = triggeredBy;
            return manualRunResponse;
        }

        @Override
        public List<ManualRunTriggerResponseDto> triggerEnabledSourcesManual(String triggeredBy) {
            this.capturedActor = triggeredBy;
            return manualRunList;
        }

        @Override
        public List<RunningIngestionJobDto> listRunningJobs() {
            return runningJobs;
        }

        @Override
        public List<NameIngestionJobLockDto> listJobLocks() {
            return lockList;
        }

        @Override
        public NameIngestionJobLockDto getJobLock(SourceName sourceName) {
            this.capturedSourceName = sourceName;
            return singleLock;
        }

        @Override
        public StaleLockRecoveryResponseDto recoverStaleLock(SourceName sourceName, String actedBy) {
            this.capturedSourceName = sourceName;
            this.capturedActor = actedBy;
            return recoveryResponse;
        }

        @Override
        public ReviewQueueBatchActionResponse autoMergeEligibleQueues(List<Long> queueIds, String reviewNote, String actedBy) {
            this.capturedAutoMergeQueueIds = queueIds == null ? List.of() : queueIds;
            this.capturedReviewNote = reviewNote;
            this.capturedActor = actedBy;
            return autoMergeResponse;
        }
    }
}
