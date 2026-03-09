package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.NameAlias;
import com.mysticai.numerology.ingestion.entity.NameEntity;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.repository.NameAliasRepository;
import com.mysticai.numerology.ingestion.repository.NameEntityRepository;
import com.mysticai.numerology.ingestion.repository.ParsedNameCandidateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NameAliasServiceTest {

    @Test
    void resolveByNormalizedName_exactMatch() {
        AliasTestContext ctx = new AliasTestContext();
        ctx.addName(1L, "Mehmet", "mehmet", NameStatus.ACTIVE);

        NameAliasService.AliasResolution resolution = ctx.service.resolveByNormalizedName("mehmet");

        assertEquals(AliasMatchLevel.EXACT, resolution.matchLevel());
        assertEquals(1L, resolution.canonicalNameId());
        assertTrue(resolution.matchLevel().canAutoGroup());
    }

    @Test
    void resolveByNormalizedName_transliterationAliasStrong() {
        AliasTestContext ctx = new AliasTestContext();
        NameEntity canonical = ctx.addName(1L, "Ayşe", "ayşe", NameStatus.ACTIVE);
        ctx.addAlias(canonical, "Ayse", "ayse", AliasType.TRANSLITERATION, false, BigDecimal.valueOf(0.95));

        NameAliasService.AliasResolution resolution = ctx.service.resolveByNormalizedName("ayse");

        assertEquals(AliasMatchLevel.STRONG_ALIAS, resolution.matchLevel());
        assertEquals(1L, resolution.canonicalNameId());
        assertEquals("ayşe", resolution.canonicalNormalizedName());
    }

    @Test
    void resolveByNormalizedName_compoundVariantStrong() {
        AliasTestContext ctx = new AliasTestContext();
        NameEntity canonical = ctx.addName(5L, "Elif Nur", "elif nur", NameStatus.ACTIVE);
        ctx.addAlias(canonical, "Elifnur", "elifnur", AliasType.COMPOUND_VARIANT, false, BigDecimal.valueOf(0.93));

        NameAliasService.AliasResolution resolution = ctx.service.resolveByNormalizedName("elifnur");

        assertEquals(AliasMatchLevel.STRONG_ALIAS, resolution.matchLevel());
        assertEquals("elif nur", resolution.canonicalNormalizedName());
    }

    @Test
    void resolveByNormalizedName_repeatedVowelIsWeakNotAutoGrouped() {
        AliasTestContext ctx = new AliasTestContext();
        ctx.addName(7L, "Nur", "nur", NameStatus.ACTIVE);

        NameAliasService.AliasResolution resolution = ctx.service.resolveByNormalizedName("nuur");

        assertEquals(AliasMatchLevel.WEAK_ALIAS, resolution.matchLevel());
        assertEquals(7L, resolution.canonicalNameId());
        assertFalse(resolution.matchLevel().canAutoGroup());
    }

    @Test
    void resolveByNormalizedName_preventsFalsePositiveForDifferentStem() {
        AliasTestContext ctx = new AliasTestContext();
        ctx.addName(8L, "Nur", "nur", NameStatus.ACTIVE);

        NameAliasService.AliasResolution resolution = ctx.service.resolveByNormalizedName("onur");

        assertEquals(AliasMatchLevel.NO_MATCH, resolution.matchLevel());
        assertNull(resolution.canonicalNameId());
        assertEquals("onur", resolution.canonicalNormalizedName());
    }

    @Test
    void addManualAlias_updatesParsedCandidatesAndReturnsAffectedQueueKeys() {
        AliasTestContext ctx = new AliasTestContext();
        NameEntity canonical = ctx.addName(3L, "Mehmet", "mehmet", NameStatus.ACTIVE);
        ParsedNameCandidate candidate = ctx.addCandidate(40L, "mehmed", "mehmed");

        NameAliasService.AliasMutationResult result = ctx.service.addManualAlias(
                canonical.getId(),
                "Mehmed",
                AliasType.SPELLING_VARIANT,
                BigDecimal.valueOf(0.99)
        );

        assertNotNull(result.alias());
        assertTrue(result.alias().isManual());
        assertEquals("mehmed", result.alias().normalizedAliasName());

        assertEquals(canonical.getId(), candidate.getCanonicalNameId());
        assertEquals("mehmet", candidate.getCanonicalNormalizedName());
        assertEquals(AliasMatchLevel.STRONG_ALIAS, candidate.getAliasMatchLevel());

        assertTrue(result.affectedQueueKeys().contains("mehmed"));
        assertTrue(result.affectedQueueKeys().contains("mehmet"));
    }

    @Test
    void backfillCanonicalAndAliasData_generatesAliasesAndRebindsCandidates() {
        AliasTestContext ctx = new AliasTestContext();
        NameEntity canonical = ctx.addName(11L, "Muhammed", "muhammed", NameStatus.ACTIVE);
        ParsedNameCandidate parsed = ctx.addCandidate(90L, "mohammed", "mohammed");

        NameAliasService.BackfillResult result = ctx.service.backfillCanonicalAndAliasData();

        assertEquals(1, result.canonicalCount());
        assertTrue(result.aliasUpsertCount() > 0);
        assertEquals(1, result.candidateUpdatedCount());

        assertEquals(canonical.getId(), parsed.getCanonicalNameId());
        assertEquals("muhammed", parsed.getCanonicalNormalizedName());
        assertEquals(AliasMatchLevel.STRONG_ALIAS, parsed.getAliasMatchLevel());

        assertTrue(result.affectedQueueKeys().contains("mohammed"));
        assertTrue(result.affectedQueueKeys().contains("muhammed"));
    }

    private static class AliasTestContext {

        private final AtomicLong aliasId = new AtomicLong(0);
        private final Map<Long, NameEntity> namesById = new HashMap<>();
        private final Map<String, NameEntity> namesByNormalized = new HashMap<>();
        private final Map<Long, NameAlias> aliasesById = new HashMap<>();
        private final Map<String, NameAlias> aliasesByNormalized = new HashMap<>();
        private final List<ParsedNameCandidate> parsedCandidates = new ArrayList<>();

        private final NameEntityRepository nameRepository;
        private final NameAliasRepository aliasRepository;
        private final ParsedNameCandidateRepository parsedRepository;
        private final NameAliasService service;

        private AliasTestContext() {
            nameRepository = proxy(NameEntityRepository.class, (method, args) -> switch (method.getName()) {
                case "findByNormalizedName" -> Optional.ofNullable(namesByNormalized.get(args[0]));
                case "findById" -> Optional.ofNullable(namesById.get(args[0]));
                case "findByStatus" -> namesById.values().stream().filter(name -> name.getStatus() == args[0]).toList();
                case "findAll" -> new ArrayList<>(namesById.values());
                case "save" -> {
                    NameEntity entity = (NameEntity) args[0];
                    if (entity.getId() == null) {
                        entity.setId((long) (namesById.size() + 1));
                    }
                    namesById.put(entity.getId(), entity);
                    namesByNormalized.put(entity.getNormalizedName(), entity);
                    yield entity;
                }
                default -> null;
            });

            aliasRepository = proxy(NameAliasRepository.class, (method, args) -> switch (method.getName()) {
                case "findByNormalizedAliasName" -> Optional.ofNullable(aliasesByNormalized.get(args[0]));
                case "findById" -> Optional.ofNullable(aliasesById.get(args[0]));
                case "findByCanonicalNameIdOrderByAliasNameAsc" -> aliasesById.values().stream()
                        .filter(alias -> alias.getCanonicalName().getId().equals(args[0]))
                        .sorted(Comparator.comparing(NameAlias::getAliasName))
                        .toList();
                case "findByCanonicalNameIdOrderByUpdatedAtDesc" -> {
                    List<NameAlias> aliases = aliasesById.values().stream()
                            .filter(alias -> alias.getCanonicalName().getId().equals(args[0]))
                            .sorted(Comparator.comparing(NameAlias::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                            .toList();
                    Pageable pageable = (Pageable) args[1];
                    int from = Math.min((int) pageable.getOffset(), aliases.size());
                    int to = Math.min(from + pageable.getPageSize(), aliases.size());
                    yield new PageImpl<>(aliases.subList(from, to), pageable, aliases.size());
                }
                case "findByCanonicalNameAndNormalizedAliasName" -> aliasesById.values().stream()
                        .filter(alias -> alias.getCanonicalName().getId().equals(((NameEntity) args[0]).getId()))
                        .filter(alias -> alias.getNormalizedAliasName().equals(args[1]))
                        .findFirst();
                case "existsByCanonicalNameIdAndNormalizedAliasName" -> aliasesById.values().stream()
                        .anyMatch(alias -> alias.getCanonicalName().getId().equals(args[0])
                                && alias.getNormalizedAliasName().equals(args[1]));
                case "save" -> {
                    NameAlias alias = (NameAlias) args[0];
                    if (alias.getId() == null) {
                        alias.setId(aliasId.incrementAndGet());
                        alias.setCreatedAt(LocalDateTime.now());
                    }
                    alias.setUpdatedAt(LocalDateTime.now());
                    aliasesById.put(alias.getId(), alias);
                    aliasesByNormalized.put(alias.getNormalizedAliasName(), alias);
                    yield alias;
                }
                case "delete" -> {
                    NameAlias alias = (NameAlias) args[0];
                    aliasesById.remove(alias.getId());
                    aliasesByNormalized.remove(alias.getNormalizedAliasName());
                    yield null;
                }
                default -> null;
            });

            parsedRepository = proxy(ParsedNameCandidateRepository.class, (method, args) -> switch (method.getName()) {
                case "findByNormalizedName" -> parsedCandidates.stream()
                        .filter(candidate -> Objects.equals(candidate.getNormalizedName(), args[0]))
                        .toList();
                case "findAll" -> new ArrayList<>(parsedCandidates);
                case "saveAll" -> args[0];
                default -> null;
            });

            service = new NameAliasService(nameRepository, aliasRepository, parsedRepository);
        }

        private NameEntity addName(Long id, String name, String normalizedName, NameStatus status) {
            NameEntity entity = new NameEntity();
            entity.setId(id);
            entity.setName(name);
            entity.setNormalizedName(normalizedName);
            entity.setStatus(status);
            entity.setGender(ParsedGender.UNKNOWN);
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdatedAt(LocalDateTime.now());
            namesById.put(id, entity);
            namesByNormalized.put(normalizedName, entity);
            return entity;
        }

        private NameAlias addAlias(NameEntity canonical, String aliasName, String normalizedAliasName, AliasType aliasType, boolean manual, BigDecimal confidence) {
            NameAlias alias = NameAlias.builder()
                    .id(aliasId.incrementAndGet())
                    .canonicalName(canonical)
                    .aliasName(aliasName)
                    .normalizedAliasName(normalizedAliasName)
                    .aliasType(aliasType)
                    .manual(manual)
                    .confidence(confidence)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            aliasesById.put(alias.getId(), alias);
            aliasesByNormalized.put(alias.getNormalizedAliasName(), alias);
            return alias;
        }

        private ParsedNameCandidate addCandidate(Long id, String normalizedName, String canonicalNormalizedName) {
            ParsedNameCandidate candidate = new ParsedNameCandidate();
            candidate.setId(id);
            candidate.setNormalizedName(normalizedName);
            candidate.setDisplayName(normalizedName);
            candidate.setCanonicalNormalizedName(canonicalNormalizedName);
            candidate.setAliasMatchLevel(AliasMatchLevel.NO_MATCH);
            candidate.setContentQuality(ContentQuality.MEDIUM);
            candidate.setSourceConfidence(BigDecimal.valueOf(0.85));
            parsedCandidates.add(candidate);
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
                if (Set.class.equals(type)) {
                    return Set.of();
                }
                if (Map.class.equals(type)) {
                    return Map.of();
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
}
