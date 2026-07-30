package com.mysticai.notification.service.monetization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruTokenReservation;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.repository.GuruTokenReservationRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DreamExpansionReservationService {

    private static final String MODULE_KEY = "dreams";
    private static final Map<String, String> ACTIONS = Map.of(
            "PERSON_MEANING", "dream_expansion_person_meaning",
            "SYMBOL_MEANING", "dream_expansion_symbol_meaning",
            "EMOTIONAL_ANALYSIS", "dream_expansion_emotional_analysis",
            "RELATIONSHIP_ANALYSIS", "dream_expansion_relationship_analysis",
            "COMPARE_WITH_HISTORY", "dream_expansion_compare_with_history"
    );

    private final GuruTokenReservationRepository reservationRepository;
    private final GuruWalletRepository walletRepository;
    private final MonetizationActionRepository actionRepository;
    private final EntitlementService entitlementService;
    private final GuruWalletService walletService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ConfigResponse getConfig(Long userId) {
        Map<String, Integer> costs = new TreeMap<>();
        ACTIONS.forEach((type, actionKey) -> costs.put(type, resolveAction(type).getGuruCost()));
        var entitlement = entitlementService.getSnapshot(userId);
        return new ConfigResponse(
                true,
                "GURU_TOKEN",
                1,
                pricingVersion(costs),
                entitlement.premiumActive(),
                entitlement.tokenBalance(),
                costs,
                true,
                true
        );
    }

    @Transactional
    public ReservationResponse reserve(ReserveRequest request) {
        validate(request);
        GuruTokenReservation replay = reservationRepository
                .findByIdempotencyKey(request.idempotencyKey())
                .orElse(null);
        if (replay != null) {
            ensureSameRequest(replay, request);
            if (replay.getStatus() == GuruTokenReservation.Status.PENDING
                    && replay.getExpiresAt().isBefore(LocalDateTime.now())) {
                if (!entitlementService.getSnapshot(request.userId()).premiumActive()) {
                    throw new ReservationException(HttpStatus.PAYMENT_REQUIRED, "PREMIUM_REQUIRED");
                }
                walletService.getOrCreateWallet(request.userId());
                var wallet = walletRepository.findByUserIdForUpdate(request.userId()).orElseThrow();
                long held = reservationRepository.sumActivePendingCost(request.userId(), LocalDateTime.now());
                int available = Math.max(0, wallet.getCurrentBalance() - Math.toIntExact(held));
                if (available < replay.getCost()) {
                    throw new ReservationException(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_GURU_BALANCE");
                }
                replay.setExpiresAt(LocalDateTime.now().plusMinutes(10));
                return toResponse(reservationRepository.save(replay));
            }
            return toResponse(replay);
        }

        if (!entitlementService.getSnapshot(request.userId()).premiumActive()) {
            throw new ReservationException(HttpStatus.PAYMENT_REQUIRED, "PREMIUM_REQUIRED");
        }

        String type = normalizeType(request.expansionType());
        MonetizationAction action = resolveAction(type);
        Map<String, Integer> currentCosts = currentCosts();
        if (request.pricingVersion() == null
                || !pricingVersion(currentCosts).equals(request.pricingVersion())) {
            throw new ReservationException(
                    HttpStatus.CONFLICT,
                    "DREAM_EXPANSION_PRICE_CHANGED",
                    action.getGuruCost(),
                    walletService.getBalance(request.userId())
            );
        }
        walletService.getOrCreateWallet(request.userId());
        var wallet = walletRepository.findByUserIdForUpdate(request.userId()).orElseThrow();
        GuruTokenReservation concurrentReplay = reservationRepository
                .findByIdempotencyKey(request.idempotencyKey())
                .orElse(null);
        if (concurrentReplay != null) {
            ensureSameRequest(concurrentReplay, request);
            return toResponse(concurrentReplay);
        }
        long held = reservationRepository.sumActivePendingCost(request.userId(), LocalDateTime.now());
        int available = Math.max(0, wallet.getCurrentBalance() - Math.toIntExact(held));
        if (available < action.getGuruCost()) {
            throw new ReservationException(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_GURU_BALANCE");
        }

        GuruTokenReservation reservation = reservationRepository.save(GuruTokenReservation.builder()
                .userId(request.userId())
                .dreamId(request.dreamId())
                .expansionType(type)
                .actionKey(action.getActionKey())
                .cost(action.getGuruCost())
                .idempotencyKey(request.idempotencyKey())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());
        return toResponse(reservation);
    }

    @Transactional
    public ReservationResponse commit(UUID reservationId, SettlementRequest request) {
        GuruTokenReservation reservation = requireOwned(reservationId, request.userId());
        if (reservation.getStatus() == GuruTokenReservation.Status.COMMITTED) {
            return toResponse(reservation);
        }
        if (reservation.getStatus() != GuruTokenReservation.Status.PENDING
                || reservation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ReservationException(HttpStatus.CONFLICT, "RESERVATION_NOT_ACTIVE");
        }

        GuruLedger ledger = walletService.commitDreamExpansion(
                reservation.getUserId(),
                reservation.getCost(),
                reservation.getActionKey(),
                "dream-expansion-spend:" + reservation.getId(),
                metadata(reservation, request.expansionId(), request.promptVersion(), "commit")
        );
        reservation.setLedgerTransactionId(ledger.getId());
        reservation.setStatus(GuruTokenReservation.Status.COMMITTED);
        return toResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public ReservationResponse cancel(UUID reservationId, SettlementRequest request) {
        GuruTokenReservation reservation = requireOwned(reservationId, request.userId());
        if (reservation.getStatus() == GuruTokenReservation.Status.PENDING) {
            reservation.setStatus(GuruTokenReservation.Status.CANCELLED);
            return toResponse(reservationRepository.save(reservation));
        }
        if (reservation.getStatus() == GuruTokenReservation.Status.COMMITTED) {
            walletService.refundDreamExpansion(
                    reservation.getUserId(),
                    reservation.getCost(),
                    reservation.getActionKey(),
                    "dream-expansion-refund:" + reservation.getId(),
                    metadata(reservation, request.expansionId(), request.promptVersion(), "refund")
            );
            reservation.setStatus(GuruTokenReservation.Status.REFUNDED);
            return toResponse(reservationRepository.save(reservation));
        }
        return toResponse(reservation);
    }

    private GuruTokenReservation requireOwned(UUID id, Long userId) {
        GuruTokenReservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ReservationException(HttpStatus.NOT_FOUND, "RESERVATION_NOT_FOUND"));
        if (!reservation.getUserId().equals(userId)) {
            throw new ReservationException(HttpStatus.FORBIDDEN, "RESERVATION_FORBIDDEN");
        }
        return reservation;
    }

    private MonetizationAction resolveAction(String expansionType) {
        String actionKey = ACTIONS.get(normalizeType(expansionType));
        if (actionKey == null) {
            throw new ReservationException(HttpStatus.BAD_REQUEST, "INVALID_EXPANSION_TYPE");
        }
        MonetizationAction action = actionRepository.findByActionKeyAndModuleKey(actionKey, MODULE_KEY)
                .orElseThrow(() -> new ReservationException(HttpStatus.SERVICE_UNAVAILABLE, "EXPANSION_NOT_CONFIGURED"));
        if (!action.isEnabled() || action.getGuruCost() < 0) {
            throw new ReservationException(HttpStatus.SERVICE_UNAVAILABLE, "EXPANSION_DISABLED");
        }
        return action;
    }

    private String normalizeType(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private void validate(ReserveRequest request) {
        if (request == null || request.userId() == null || request.dreamId() == null
                || request.idempotencyKey() == null || request.idempotencyKey().isBlank()) {
            throw new ReservationException(HttpStatus.BAD_REQUEST, "INVALID_RESERVATION_REQUEST");
        }
        if (request.idempotencyKey().length() > 180) {
            throw new ReservationException(HttpStatus.BAD_REQUEST, "INVALID_IDEMPOTENCY_KEY");
        }
        resolveAction(request.expansionType());
    }

    private Map<String, Integer> currentCosts() {
        Map<String, Integer> costs = new TreeMap<>();
        ACTIONS.forEach((type, actionKey) -> costs.put(type, resolveAction(type).getGuruCost()));
        return costs;
    }

    private String pricingVersion(Map<String, Integer> costs) {
        try {
            String canonical = costs.entrySet().stream()
                    .map(entry -> entry.getKey() + "=" + entry.getValue())
                    .reduce((left, right) -> left + "|" + right)
                    .orElse("");
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256")
                            .digest(canonical.getBytes(StandardCharsets.UTF_8))
            ).substring(0, 16);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not version dream expansion pricing", ex);
        }
    }

    private void ensureSameRequest(GuruTokenReservation existing, ReserveRequest request) {
        if (!existing.getUserId().equals(request.userId())
                || !existing.getDreamId().equals(request.dreamId())
                || !existing.getExpansionType().equals(normalizeType(request.expansionType()))) {
            throw new ReservationException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED");
        }
    }

    private String metadata(GuruTokenReservation reservation, UUID expansionId,
                            String promptVersion, String operation) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "dreamId", reservation.getDreamId(),
                    "expansionId", expansionId != null ? expansionId.toString() : "",
                    "expansionType", reservation.getExpansionType(),
                    "promptVersion", promptVersion != null ? promptVersion : "",
                    "operation", operation
            ));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize ledger metadata", e);
        }
    }

    private ReservationResponse toResponse(GuruTokenReservation reservation) {
        int balance = walletService.getBalance(reservation.getUserId());
        return new ReservationResponse(
                reservation.getId(),
                reservation.getStatus().name(),
                reservation.getCost(),
                balance,
                reservation.getLedgerTransactionId(),
                reservation.getExpiresAt()
        );
    }

    public record ConfigResponse(
            boolean enabled,
            String currency,
            int defaultCost,
            String pricingVersion,
            boolean premiumActive,
            int currentBalance,
            Map<String, Integer> costs,
            boolean rewardedAvailable,
            boolean purchaseAvailable
    ) {}

    public record ReserveRequest(
            Long userId,
            Long dreamId,
            String expansionType,
            String idempotencyKey,
            String pricingVersion
    ) {}

    public record SettlementRequest(
            Long userId,
            UUID expansionId,
            String promptVersion
    ) {}

    public record ReservationResponse(
            UUID reservationId,
            String status,
            int cost,
            int currentBalance,
            UUID ledgerTransactionId,
            LocalDateTime expiresAt
    ) {}

    public static class ReservationException extends ResponseStatusException {
        private final String code;
        private final Integer currentCost;
        private final Integer currentBalance;

        public ReservationException(HttpStatus status, String code) {
            this(status, code, null, null);
        }

        public ReservationException(HttpStatus status, String code,
                                    Integer currentCost, Integer currentBalance) {
            super(status, code);
            this.code = code;
            this.currentCost = currentCost;
            this.currentBalance = currentBalance;
        }

        public String getCode() {
            return code;
        }

        public Integer getCurrentCost() {
            return currentCost;
        }

        public Integer getCurrentBalance() {
            return currentBalance;
        }
    }
}
