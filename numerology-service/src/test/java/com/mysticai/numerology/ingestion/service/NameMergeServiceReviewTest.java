package com.mysticai.numerology.ingestion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueActionResponse;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueFilter;
import com.mysticai.numerology.ingestion.dto.admin.ReviewQueueGroupDto;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.NameMergeAuditLog;
import com.mysticai.numerology.ingestion.entity.NameMergeQueue;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.MergeRecommendationStatus;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.ReviewQueueActionType;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeAuditLogRepository;
import com.mysticai.numerology.ingestion.repository.NameMergeQueueRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NameMergeServiceReviewTest {

    @Test
    void approve_marksQueueApprovedAndPersistsNameAndAudit() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(77L)
                .canonicalName("ali")
                .candidateIds("[11,12]")
                .conflictingFields("[\"origin\"]")
                .hasConflict(true)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate bebek = candidate(11L, SourceName.BEBEKISMI, "Ali", "ali", "Yüce", "Yüce kimse", "Arapça", ParsedGender.MALE);
        ParsedNameCandidate sfk = candidate(12L, SourceName.SFK_ISTANBUL_EDU, "Ali", "ali", "Yüksek", "Geniş açıklama", "Arapça", ParsedGender.MALE);

        AtomicReference<NameEntity> savedEntityRef = new AtomicReference<>();
        AtomicReference<NameMergeAuditLog> savedAuditRef = new AtomicReference<>();
        AtomicLong nameId = new AtomicLong(300);
        AtomicLong auditId = new AtomicLong(900);

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(bebek, sfk);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(nameId.incrementAndGet());
                }
                savedEntityRef.set(entity);
                return entity;
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> {
            if ("save".equals(method.getName())) {
                NameMergeAuditLog audit = (NameMergeAuditLog) args[0];
                if (audit.getId() == null) {
                    audit.setId(auditId.incrementAndGet());
                }
                savedAuditRef.set(audit);
                return audit;
            }
            return null;
        });

        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> {
            if ("findByNormalizedAliasName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        ReviewQueueActionResponse response = service.approve(77L, SourceName.SFK_ISTANBUL_EDU, "manual approve", "admin@mystic.ai");

        assertEquals(MergeReviewStatus.APPROVED, response.reviewStatus());
        assertEquals(301L, response.nameId());
        assertEquals(901L, response.auditId());
        assertEquals(SourceName.SFK_ISTANBUL_EDU, response.selectedSource());

        NameEntity savedEntity = savedEntityRef.get();
        assertNotNull(savedEntity);
        assertEquals("ali", savedEntity.getNormalizedName());
        assertEquals(NameStatus.ACTIVE, savedEntity.getStatus());
        assertEquals("Yüksek", savedEntity.getMeaningShort());
        assertEquals("Geniş açıklama", savedEntity.getMeaningLong());

        NameMergeAuditLog savedAudit = savedAuditRef.get();
        assertNotNull(savedAudit);
        assertEquals("manual approve", savedAudit.getReviewNote());
    }

    @Test
    void approve_appliesUfukPrecedenceForQuranFlag() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(88L)
                .canonicalName("fuat")
                .candidateIds("[51,52]")
                .conflictingFields("[\"quran_flag\"]")
                .hasConflict(true)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate ufuk = candidate(51L, SourceName.UFUK, "Fuat", "fuat", "Kalp", "Açıklama", "Arapça", ParsedGender.MALE);
        ufuk.setQuranFlag(Boolean.FALSE);
        ufuk.setSourceConfidence(BigDecimal.valueOf(0.60));
        ufuk.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        ParsedNameCandidate sfk = candidate(52L, SourceName.SFK_ISTANBUL_EDU, "Fuat", "fuat", "Kalp", "Açıklama", "Arapça", ParsedGender.MALE);
        sfk.setQuranFlag(Boolean.TRUE);
        sfk.setSourceConfidence(BigDecimal.valueOf(0.95));
        sfk.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        AtomicReference<NameEntity> savedEntityRef = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(ufuk, sfk);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(700L);
                }
                savedEntityRef.set(entity);
                return entity;
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> args[0]);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        service.approve(88L, null, "ufuk precedence", "admin@mystic.ai");

        assertNotNull(savedEntityRef.get());
        assertEquals(Boolean.FALSE, savedEntityRef.get().getQuranFlag());
    }

    @Test
    void approve_fallsBackToHighestConfidenceQuranFlagWhenUfukIsNull() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(89L)
                .canonicalName("fuat")
                .candidateIds("[53,54]")
                .conflictingFields("[]")
                .hasConflict(false)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate ufuk = candidate(53L, SourceName.UFUK, "Fuat", "fuat", "Kalp", "Açıklama", "Arapça", ParsedGender.MALE);
        ufuk.setQuranFlag(null);
        ufuk.setSourceConfidence(BigDecimal.valueOf(0.91));
        ufuk.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        ParsedNameCandidate sfk = candidate(54L, SourceName.SFK_ISTANBUL_EDU, "Fuat", "fuat", "Kalp", "Açıklama", "Arapça", ParsedGender.MALE);
        sfk.setQuranFlag(Boolean.TRUE);
        sfk.setSourceConfidence(BigDecimal.valueOf(0.89));
        sfk.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        AtomicReference<NameEntity> savedEntityRef = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(ufuk, sfk);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(701L);
                }
                savedEntityRef.set(entity);
                return entity;
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> args[0]);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        service.approve(89L, null, "quran fallback", "admin@mystic.ai");

        assertNotNull(savedEntityRef.get());
        assertEquals(Boolean.TRUE, savedEntityRef.get().getQuranFlag());
    }

    @Test
    void approve_prefersHigherSourceConfidenceForMeaningLongField() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(90L)
                .canonicalName("zehra")
                .candidateIds("[55,56]")
                .conflictingFields("[\"meaning_long\"]")
                .hasConflict(true)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate low = candidate(55L, SourceName.BEBEKISMI, "Zehra", "zehra", "Parlak", "Kısa açıklama", "Arapça", ParsedGender.FEMALE);
        low.setSourceConfidence(BigDecimal.valueOf(0.58));
        low.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        ParsedNameCandidate high = candidate(56L, SourceName.SFK_ISTANBUL_EDU, "Zehra", "zehra", "Parlak", "Uzun ve detaylı açıklama metni", "Arapça", ParsedGender.FEMALE);
        high.setSourceConfidence(BigDecimal.valueOf(0.94));
        high.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        AtomicReference<NameEntity> savedEntityRef = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(low, high);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(702L);
                }
                savedEntityRef.set(entity);
                return entity;
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> args[0]);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        ReviewQueueActionResponse response = service.approve(90L, null, "confidence policy", "admin@mystic.ai");

        assertNotNull(savedEntityRef.get());
        assertEquals("Uzun ve detaylı açıklama metni", savedEntityRef.get().getMeaningLong());
        assertEquals(SourceName.SFK_ISTANBUL_EDU, response.selectedFieldSources().get("meaning_long"));
    }

    @Test
    void approve_prefersHigherSourceConfidenceEvenWhenLowerConfidenceHasHistoricallyPreferredSource() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(91L)
                .canonicalName("emre")
                .candidateIds("[57,58]")
                .conflictingFields("[\"meaning_long\"]")
                .hasConflict(true)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate lowerUfuk = candidate(57L, SourceName.UFUK, "Emre", "emre", "Anlam", "UFUK uzun açıklama metni", "Türkçe", ParsedGender.MALE);
        lowerUfuk.setSourceConfidence(BigDecimal.valueOf(0.86));
        lowerUfuk.setContentQuality(ContentQuality.HIGH);
        lowerUfuk.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        ParsedNameCandidate higherBebek = candidate(58L, SourceName.BEBEKISMI, "Emre", "emre", "Anlam", "BEBEKİSMİ uzun açıklama metni", "Türkçe", ParsedGender.MALE);
        higherBebek.setSourceConfidence(BigDecimal.valueOf(0.90));
        higherBebek.setContentQuality(ContentQuality.LOW);
        higherBebek.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);

        AtomicReference<NameEntity> savedEntityRef = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(lowerUfuk, higherBebek);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(703L);
                }
                savedEntityRef.set(entity);
                return entity;
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> args[0]);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        ReviewQueueActionResponse response = service.approve(91L, null, "strict confidence policy", "admin@mystic.ai");

        assertNotNull(savedEntityRef.get());
        assertEquals("BEBEKİSMİ uzun açıklama metni", savedEntityRef.get().getMeaningLong());
        assertEquals(SourceName.BEBEKISMI, response.selectedFieldSources().get("meaning_long"));
    }

    @Test
    void listGroupedQueue_returnsGroupedCandidatesWithConflictDetails() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(15L)
                .canonicalName("azra")
                .candidateIds("[21,22]")
                .conflictingFields("[\"origin\",\"meaning_short\"]")
                .hasConflict(true)
                .reviewStatus(MergeReviewStatus.PENDING)
                .build();

        ParsedNameCandidate first = candidate(21L, SourceName.BEBEKISMI, "Azra", "azra", "Çok temiz", "Kısa açıklama", "Arapça", ParsedGender.FEMALE);
        ParsedNameCandidate second = candidate(22L, SourceName.ALFABETIK, "Azra", "azra", "Bakire", "Uzun açıklama", "İbranice", ParsedGender.FEMALE);

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByCanonicalNormalizedNameInWithRawEntry".equals(method.getName())) {
                return List.of(first, second);
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findAll".equals(method.getName()) && args.length == 2 && args[1] instanceof Pageable pageable) {
                return new PageImpl<>(List.of(queue), pageable, 1);
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> null);
        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> null);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        ReviewQueueFilter filter = new ReviewQueueFilter(
                null,
                Set.of(),
                null,
                null,
                null,
                null,
                null,
                false
        );

        Page<ReviewQueueGroupDto> response = service.listGroupedQueue(filter, 0, 25);

        assertEquals(1, response.getTotalElements());
        ReviewQueueGroupDto group = response.getContent().getFirst();
        assertEquals("azra", group.canonicalName());
        assertTrue(group.hasConflict());
        assertEquals(2, group.candidates().size());
        assertEquals(2, group.conflictingFields().size());
        assertFalse(group.conflictDetails().isEmpty());
        assertNotNull(group.conflictDetails().stream().filter(item -> "origin".equals(item.field())).findFirst().orElse(null));
    }

    @Test
    void refreshQueue_groupsCandidatesByCanonicalNormalizedName() {
        ParsedNameCandidate first = candidate(31L, SourceName.BEBEKISMI, "Mohammed", "mohammed", "Anlam", "Uzun", "Arapça", ParsedGender.MALE);
        first.setCanonicalNormalizedName("muhammed");
        first.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        first.setSourceConfidence(BigDecimal.valueOf(0.93));
        ParsedNameCandidate second = candidate(32L, SourceName.SFK_ISTANBUL_EDU, "Muhammed", "muhammed", "Anlam", "Uzun", "Arapça", ParsedGender.MALE);
        second.setCanonicalNormalizedName("muhammed");
        second.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        second.setSourceConfidence(BigDecimal.valueOf(0.95));

        AtomicReference<NameMergeQueue> savedQueue = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByCanonicalNormalizedName".equals(method.getName()) && "muhammed".equals(args[0])) {
                return List.of(first, second);
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findByCanonicalName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameMergeQueue queue = (NameMergeQueue) args[0];
                savedQueue.set(queue);
                return queue;
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> Optional.empty());
        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> null);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        NameMergeService.MergeRefreshResult result = service.refreshQueue("muhammed");

        assertTrue(result.queuedForReview());
        assertNotNull(savedQueue.get());
        assertEquals("muhammed", savedQueue.get().getCanonicalName());
        assertEquals(MergeRecommendationStatus.AUTO_MERGE_ELIGIBLE, savedQueue.get().getMergeRecommendationStatus());
        assertTrue(savedQueue.get().isAutoMergeEligible());
    }

    @Test
    void refreshQueue_singleSourceCandidateStillCreatesReviewQueue() {
        ParsedNameCandidate single = candidate(41L, SourceName.BEBEKISMI, "Elif", "elif", "Işık", "Uzun açıklama", "Türkçe", ParsedGender.FEMALE);
        single.setCanonicalNormalizedName("elif");

        AtomicReference<NameMergeQueue> savedQueue = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByCanonicalNormalizedName".equals(method.getName()) && "elif".equals(args[0])) {
                return List.of(single);
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findByCanonicalName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameMergeQueue queue = (NameMergeQueue) args[0];
                savedQueue.set(queue);
                return queue;
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> Optional.empty());
        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> null);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        NameMergeService.MergeRefreshResult result = service.refreshQueue("elif");

        assertTrue(result.queuedForReview());
        assertNotNull(savedQueue.get());
        assertEquals("elif", savedQueue.get().getCanonicalName());
        assertFalse(savedQueue.get().isHasConflict());
        assertEquals(MergeReviewStatus.PENDING, savedQueue.get().getReviewStatus());
        assertEquals(MergeRecommendationStatus.MANUAL_REVIEW_REQUIRED, savedQueue.get().getMergeRecommendationStatus());
    }

    @Test
    void refreshQueue_weakAliasNeverAutoMergeEligible() {
        ParsedNameCandidate weak = candidate(61L, SourceName.BEBEKISMI, "Nuur", "nuur", "Işık", "Uzun açıklama", "Arapça", ParsedGender.UNISEX);
        weak.setCanonicalNormalizedName("nur");
        weak.setAliasMatchLevel(AliasMatchLevel.WEAK_ALIAS);

        AtomicReference<NameMergeQueue> savedQueue = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByCanonicalNormalizedName".equals(method.getName()) && "nur".equals(args[0])) {
                return List.of(weak);
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findByCanonicalName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameMergeQueue queue = (NameMergeQueue) args[0];
                savedQueue.set(queue);
                return queue;
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> Optional.empty());
        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> null);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        service.refreshQueue("nur");

        assertNotNull(savedQueue.get());
        assertEquals(MergeRecommendationStatus.MANUAL_REVIEW_REQUIRED, savedQueue.get().getMergeRecommendationStatus());
        assertFalse(savedQueue.get().isAutoMergeEligible());
    }

    @Test
    void refreshQueue_strongAliasWithHighRiskConflict_marksMergeSuggested() {
        ParsedNameCandidate first = candidate(71L, SourceName.BEBEKISMI, "Azra", "azra", "Temiz", "Uzun açıklama", "Arapça", ParsedGender.FEMALE);
        first.setCanonicalNormalizedName("azra");
        first.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        first.setSourceConfidence(BigDecimal.valueOf(0.88));

        ParsedNameCandidate second = candidate(72L, SourceName.SFK_ISTANBUL_EDU, "Azra", "azra", "Temiz", "Uzun açıklama", "Türkçe", ParsedGender.FEMALE);
        second.setCanonicalNormalizedName("azra");
        second.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        second.setSourceConfidence(BigDecimal.valueOf(0.90));

        AtomicReference<NameMergeQueue> savedQueue = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByCanonicalNormalizedName".equals(method.getName()) && "azra".equals(args[0])) {
                return List.of(first, second);
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findByCanonicalName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameMergeQueue queue = (NameMergeQueue) args[0];
                savedQueue.set(queue);
                return queue;
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> Optional.empty());
        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> null);
        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        service.refreshQueue("azra");

        assertNotNull(savedQueue.get());
        assertTrue(savedQueue.get().isHasConflict());
        assertEquals(MergeRecommendationStatus.MERGE_SUGGESTED, savedQueue.get().getMergeRecommendationStatus());
        assertFalse(savedQueue.get().isAutoMergeEligible());
    }

    @Test
    void autoMerge_writesAuditWithAutoMergeAction() {
        NameMergeQueue queue = NameMergeQueue.builder()
                .id(95L)
                .canonicalName("muhammed")
                .candidateIds("[81]")
                .conflictingFields("[]")
                .hasConflict(false)
                .reviewStatus(MergeReviewStatus.PENDING)
                .autoMergeEligible(true)
                .mergeRecommendationStatus(MergeRecommendationStatus.AUTO_MERGE_ELIGIBLE)
                .build();

        ParsedNameCandidate candidate = candidate(81L, SourceName.SFK_ISTANBUL_EDU, "Muhammed", "muhammed", "Övgü", "Uzun açıklama", "Arapça", ParsedGender.MALE);
        candidate.setAliasMatchLevel(AliasMatchLevel.STRONG_ALIAS);
        candidate.setCanonicalNameId(15L);
        candidate.setCanonicalNormalizedName("muhammed");
        candidate.setSourceConfidence(BigDecimal.valueOf(0.95));

        AtomicReference<NameMergeAuditLog> savedAudit = new AtomicReference<>();

        ParsedNameCandidateRepository parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> {
            if ("findByIdInWithRawEntry".equals(method.getName())) {
                return List.of(candidate);
            }
            if ("saveAll".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameMergeQueueRepository queueRepository = proxy(NameMergeQueueRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.of(queue);
            }
            if ("save".equals(method.getName())) {
                return args[0];
            }
            return null;
        });

        NameEntityRepository entityRepository = proxy(NameEntityRepository.class, (method, args) -> {
            if ("findByNormalizedName".equals(method.getName())) {
                return Optional.empty();
            }
            if ("save".equals(method.getName())) {
                NameEntity entity = (NameEntity) args[0];
                if (entity.getId() == null) {
                    entity.setId(811L);
                }
                return entity;
            }
            if ("findById".equals(method.getName())) {
                NameEntity canonical = new NameEntity();
                canonical.setId(15L);
                canonical.setName("Muhammed");
                canonical.setNormalizedName("muhammed");
                return Optional.of(canonical);
            }
            return null;
        });

        NameMergeAuditLogRepository auditRepository = proxy(NameMergeAuditLogRepository.class, (method, args) -> {
            if ("save".equals(method.getName())) {
                NameMergeAuditLog audit = (NameMergeAuditLog) args[0];
                audit.setId(999L);
                savedAudit.set(audit);
                return audit;
            }
            return null;
        });

        NameAliasRepository aliasRepository = proxy(NameAliasRepository.class, (method, args) -> Optional.empty());
        NameAliasService aliasService = new NameAliasService(entityRepository, aliasRepository, parsedRepository);

        NameMergeService service = new NameMergeService(
                parsedRepository,
                queueRepository,
                entityRepository,
                auditRepository,
                aliasService,
                new ObjectMapper()
        );

        ReviewQueueActionResponse response = service.autoMerge(95L, "auto", "ops@mystic.ai");

        assertEquals(MergeReviewStatus.MERGED, response.reviewStatus());
        assertNotNull(savedAudit.get());
        assertEquals(ReviewQueueActionType.AUTO_MERGE, savedAudit.get().getActionType());
    }

    private ParsedNameCandidate candidate(
            Long id,
            SourceName sourceName,
            String displayName,
            String normalizedName,
            String meaningShort,
            String meaningLong,
            String origin,
            ParsedGender gender
    ) {
        RawNameSourceEntry rawEntry = RawNameSourceEntry.builder()
                .id(id + 100)
                .sourceName(sourceName)
                .sourceUrl("https://example.com/" + id)
                .build();

        ParsedNameCandidate candidate = new ParsedNameCandidate();
        candidate.setId(id);
        candidate.setRawEntry(rawEntry);
        candidate.setDisplayName(displayName);
        candidate.setNormalizedName(normalizedName);
        candidate.setCanonicalNormalizedName(normalizedName);
        candidate.setAliasMatchLevel(AliasMatchLevel.NO_MATCH);
        candidate.setGender(gender);
        candidate.setMeaningShort(meaningShort);
        candidate.setMeaningLong(meaningLong);
        candidate.setOrigin(origin);
        candidate.setCharacterTraitsText("Karakter");
        candidate.setLetterAnalysisText("Harf");
        candidate.setQuranFlag(Boolean.FALSE);
        candidate.setSourceConfidence(BigDecimal.valueOf(0.82));
        candidate.setMismatchFlag(false);
        candidate.setDuplicateContentFlag(false);
        candidate.setContentQuality(ContentQuality.HIGH);
        return candidate;
    }

    @SuppressWarnings("unchecked")
    private <T> T proxy(Class<T> type, RepoMethodHandler handler) {
        return (T) Proxy.newProxyInstance(
                type.getClassLoader(),
                new Class[]{type},
                (proxy, method, args) -> {
                    if (method.getDeclaringClass() == Object.class) {
                        return switch (method.getName()) {
                            case "toString" -> type.getSimpleName() + "Proxy";
                            case "hashCode" -> System.identityHashCode(proxy);
                            case "equals" -> proxy == args[0];
                            default -> null;
                        };
                    }
                    Object[] safeArgs = args == null ? new Object[0] : args;
                    Object result = handler.handle(method, safeArgs);
                    if (result != null) {
                        return result;
                    }
                    return defaultValue(method.getReturnType());
                }
        );
    }

    private Object defaultValue(Class<?> type) {
        if (!type.isPrimitive()) {
            if (Optional.class.equals(type)) {
                return Optional.empty();
            }
            if (List.class.equals(type)) {
                return List.of();
            }
            if (Map.class.equals(type)) {
                return Map.of();
            }
            if (Set.class.equals(type)) {
                return Set.of();
            }
            if (Page.class.isAssignableFrom(type)) {
                return Page.empty();
            }
            return null;
        }
        if (boolean.class.equals(type)) {
            return false;
        }
        if (int.class.equals(type) || short.class.equals(type) || byte.class.equals(type)) {
            return 0;
        }
        if (long.class.equals(type)) {
            return 0L;
        }
        if (double.class.equals(type)) {
            return 0D;
        }
        if (float.class.equals(type)) {
            return 0F;
        }
        if (char.class.equals(type)) {
            return '\0';
        }
        return null;
    }

    @FunctionalInterface
    private interface RepoMethodHandler {
        Object handle(Method method, Object[] args);
    }
}
