package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.DreamAnalysisExpansion;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.repository.DreamAnalysisExpansionRepository;
import com.mysticai.astrology.repository.DreamEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DreamExpansionService {

    public static final String PROMPT_VERSION = "dream-expansion-v1.0";
    public static final String SCHEMA_VERSION = "dream-expansion-schema-v1";
    private final DreamEntryRepository dreamRepository;
    private final DreamAnalysisExpansionRepository expansionRepository;
    private final ObjectMapper objectMapper;
    private final DreamExpansionMonetizationClient monetizationClient;
    private final DreamExpansionAiClient aiClient;

    public DreamExpansionConfigResponse getConfig(Long userId) {
        requireUser(userId);
        return monetizationClient.getConfig(userId);
    }

    public DreamExpansionResponse expand(Long userId, Long dreamId, DreamExpansionRequest request) {
        requireUser(userId);
        DreamEntry dream = dreamRepository.findByIdAndUserId(dreamId, userId)
                .orElseThrow(() -> new ExpansionException(HttpStatus.NOT_FOUND, "DREAM_NOT_FOUND"));
        validateRequest(request);
        String targetHash = hashTarget(request.targetElement());

        DreamAnalysisExpansion idempotent = expansionRepository
                .findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (idempotent != null) {
            ensureIdempotentMatch(idempotent, userId, dreamId, request, targetHash);
            if ("COMPLETED".equals(idempotent.getStatus())) {
                return response(idempotent, true, currentBalance(userId));
            }
            throw new ExpansionException(HttpStatus.CONFLICT, "EXPANSION_ALREADY_PROCESSING");
        }

        if (!request.regenerate()) {
            Optional<DreamAnalysisExpansion> existing = expansionRepository
                    .findFirstByUserIdAndDreamIdAndExpansionTypeAndTargetHashAndStatusOrderByCreatedAtDesc(
                            userId, dreamId, request.expansionType(), targetHash, "COMPLETED");
            if (existing.isPresent()) {
                return response(existing.get(), true, currentBalance(userId));
            }
        }

        DreamAnalysisExpansion expansion = createProcessing(userId, dreamId, request, targetHash);
        if ("COMPLETED".equals(expansion.getStatus())) {
            return response(expansion, true, currentBalance(userId));
        }
        DreamExpansionMonetizationClient.ReservationResponse reservation = null;
        try {
            reservation = reserve(userId, dreamId, request);
            expansion.setReservationId(reservation.reservationId());
            expansion.setTokenCost(reservation.cost());
            expansionRepository.save(expansion);

            String resultJson = aiClient.generate(dream, request, buildHistory(userId, dreamId));
            JsonNode validated = validateAiResult(resultJson);
            expansion.setResultJson(objectMapper.writeValueAsString(validated));
            expansion.setStatus("GENERATED_PENDING_COMMIT");
            expansionRepository.save(expansion);

            var committed = monetizationClient.settle(
                    reservation.reservationId(), userId, expansion.getId(), PROMPT_VERSION, true);
            expansion.setTokenTransactionId(committed.ledgerTransactionId());
            expansion.setStatus("COMPLETED");
            expansionRepository.save(expansion);
            return response(expansion, false, committed.currentBalance());
        } catch (ExpansionException ex) {
            failAndCancel(expansion, reservation);
            throw ex;
        } catch (RestClientResponseException ex) {
            failAndCancel(expansion, reservation);
            if (reservation == null) {
                expansionRepository.delete(expansion);
            }
            throw translateRemoteError(ex);
        } catch (Exception ex) {
            boolean refunded = failAndCancel(expansion, reservation);
            log.warn("Dream expansion failed: expansionId={}, type={}, reason={}",
                    expansion.getId(), expansion.getExpansionType(), ex.getMessage());
            throw new ExpansionException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    refunded ? "TOKEN_REFUNDED" : "EXPANSION_FAILED"
            );
        }
    }

    @Transactional(readOnly = true)
    public List<DreamExpansionResponse> list(Long userId, Long dreamId) {
        requireUser(userId);
        if (dreamRepository.findByIdAndUserId(dreamId, userId).isEmpty()) {
            throw new ExpansionException(HttpStatus.NOT_FOUND, "DREAM_NOT_FOUND");
        }
        int balance = currentBalance(userId);
        return expansionRepository.findAllByUserIdAndDreamIdAndStatusOrderByCreatedAtAsc(
                        userId, dreamId, "COMPLETED")
                .stream()
                .map(row -> response(row, true, balance))
                .toList();
    }

    private DreamAnalysisExpansion createProcessing(Long userId, Long dreamId,
                                                    DreamExpansionRequest request, String targetHash) {
        try {
            return expansionRepository.saveAndFlush(DreamAnalysisExpansion.builder()
                    .userId(userId)
                    .dreamId(dreamId)
                    .expansionType(request.expansionType())
                    .targetHash(targetHash)
                    .status("PROCESSING")
                    .idempotencyKey(request.idempotencyKey())
                    .promptVersion(PROMPT_VERSION)
                    .schemaVersion(SCHEMA_VERSION)
                    .build());
        } catch (DataIntegrityViolationException ex) {
            DreamAnalysisExpansion replay = expansionRepository
                    .findByIdempotencyKey(request.idempotencyKey())
                    .orElseThrow(() -> ex);
            if ("COMPLETED".equals(replay.getStatus())) {
                return replay;
            }
            throw new ExpansionException(HttpStatus.CONFLICT, "EXPANSION_ALREADY_PROCESSING");
        }
    }

    private DreamExpansionMonetizationClient.ReservationResponse reserve(
            Long userId, Long dreamId, DreamExpansionRequest request) {
        return monetizationClient.reserve(
                userId, dreamId, request.expansionType(), request.idempotencyKey(),
                request.pricingVersion());
    }

    private JsonNode validateAiResult(String json) throws Exception {
        if (json == null || json.isBlank()) {
            throw new ExpansionException(HttpStatus.SERVICE_UNAVAILABLE, "AI_EMPTY_RESULT");
        }
        JsonNode node = objectMapper.readTree(json);
        if (!node.isObject()
                || node.path("title").asText().isBlank()
                || node.path("summary").asText().length() < 20
                || !node.path("insights").isArray()
                || node.path("insights").size() < 2
                || node.path("reflectionPrompt").asText().isBlank()) {
            throw new ExpansionException(HttpStatus.SERVICE_UNAVAILABLE, "AI_INVALID_RESULT");
        }
        String normalized = node.toString().toLowerCase(Locale.ROOT);
        if (normalized.contains("system prompt") || normalized.contains("ignore previous instructions")) {
            throw new ExpansionException(HttpStatus.SERVICE_UNAVAILABLE, "AI_UNSAFE_RESULT");
        }
        return node;
    }

    private String buildHistory(Long userId, Long currentDreamId) {
        return dreamRepository.findAllByUserIdOrderByDreamDateDescCreatedAtDesc(userId).stream()
                .filter(d -> !d.getId().equals(currentDreamId))
                .filter(d -> d.getAnalysisJson() != null || d.getInterpretation() != null)
                .limit(5)
                .map(d -> {
                    String analysis = d.getAnalysisJson() != null ? d.getAnalysisJson() : d.getInterpretation();
                    return d.getDreamDate() + ": " + truncate(analysis, 700);
                })
                .collect(Collectors.joining("\n"));
    }

    private boolean failAndCancel(
            DreamAnalysisExpansion expansion,
            DreamExpansionMonetizationClient.ReservationResponse reservation) {
        expansion.setStatus("FAILED");
        expansionRepository.save(expansion);
        if (reservation == null) return false;
        try {
            var settlement = monetizationClient.settle(
                    reservation.reservationId(),
                    expansion.getUserId(),
                    expansion.getId(),
                    PROMPT_VERSION,
                    false
            );
            return settlement != null && "REFUNDED".equals(settlement.status());
        } catch (Exception cancelError) {
            log.error("Dream expansion compensation failed: reservationId={}, expansionId={}",
                    reservation.reservationId(), expansion.getId(), cancelError);
            return false;
        }
    }

    private int currentBalance(Long userId) {
        DreamExpansionConfigResponse config = getConfig(userId);
        return config != null ? config.currentBalance() : 0;
    }

    private DreamExpansionResponse response(DreamAnalysisExpansion row, boolean existing, int balance) {
        try {
            return new DreamExpansionResponse(
                    row.getId(),
                    row.getDreamId(),
                    row.getExpansionType(),
                    row.getResultJson() != null ? objectMapper.readTree(row.getResultJson()) : null,
                    row.getTokenCost(),
                    balance,
                    row.getStatus(),
                    existing,
                    row.getPromptVersion(),
                    row.getCreatedAt()
            );
        } catch (Exception ex) {
            throw new ExpansionException(HttpStatus.INTERNAL_SERVER_ERROR, "CORRUPT_EXPANSION_RESULT");
        }
    }

    private void validateRequest(DreamExpansionRequest request) {
        if (request == null || request.expansionType() == null
                || request.idempotencyKey() == null || request.idempotencyKey().isBlank()
                || request.pricingVersion() == null || request.pricingVersion().isBlank()) {
            throw new ExpansionException(HttpStatus.BAD_REQUEST, "INVALID_EXPANSION_REQUEST");
        }
        if (requiresTarget(request.expansionType())
                && (request.targetElement() == null || request.targetElement().isBlank())) {
            throw new ExpansionException(HttpStatus.BAD_REQUEST, "TARGET_REQUIRED");
        }
    }

    private boolean requiresTarget(DreamExpansionType type) {
        return type == DreamExpansionType.PERSON_MEANING
                || type == DreamExpansionType.SYMBOL_MEANING
                || type == DreamExpansionType.RELATIONSHIP_ANALYSIS;
    }

    private void ensureIdempotentMatch(DreamAnalysisExpansion row, Long userId, Long dreamId,
                                       DreamExpansionRequest request, String targetHash) {
        if (!row.getUserId().equals(userId)
                || !row.getDreamId().equals(dreamId)
                || row.getExpansionType() != request.expansionType()
                || !row.getTargetHash().equals(targetHash)) {
            throw new ExpansionException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED");
        }
    }

    private String hashTarget(String target) {
        try {
            String normalized = target == null ? "" : target.trim().toLowerCase(Locale.ROOT);
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private ExpansionException translateRemoteError(RestClientResponseException ex) {
        try {
            JsonNode body = objectMapper.readTree(ex.getResponseBodyAsString());
            String code = body.path("code").asText();
            if (!code.isBlank()) {
                return new ExpansionException(HttpStatus.valueOf(ex.getStatusCode().value()), code);
            }
        } catch (Exception ignored) {
        }
        return new ExpansionException(HttpStatus.SERVICE_UNAVAILABLE, "EXPANSION_DEPENDENCY_FAILED");
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.substring(0, Math.min(value.length(), max));
    }

    private void requireUser(Long userId) {
        if (userId == null) {
            throw new ExpansionException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED");
        }
    }

    public static class ExpansionException extends ResponseStatusException {
        private final String code;

        public ExpansionException(HttpStatus status, String code) {
            super(status, code);
            this.code = code;
        }

        public String getCode() {
            return code;
        }
    }
}
