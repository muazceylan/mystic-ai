package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.DreamAnalysisExpansion;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.repository.DreamAnalysisExpansionRepository;
import com.mysticai.astrology.repository.DreamEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DreamExpansionServiceTest {

    @Mock DreamEntryRepository dreamRepository;
    @Mock DreamAnalysisExpansionRepository expansionRepository;
    @Mock DreamExpansionMonetizationClient monetizationClient;
    @Mock DreamExpansionAiClient aiClient;

    DreamExpansionService service;
    DreamEntry dream;

    @BeforeEach
    void setUp() {
        service = new DreamExpansionService(
                dreamRepository,
                expansionRepository,
                new ObjectMapper(),
                monetizationClient,
                aiClient
        );
        dream = DreamEntry.builder()
                .id(10L)
                .userId(42L)
                .text("Deniz kıyısında yürürken eski bir kapı gördüm.")
                .analysisJson("{\"essence\":\"Değişim eşiği\"}")
                .dreamDate(LocalDate.now())
                .build();
        lenient().when(dreamRepository.findByIdAndUserId(10L, 42L))
                .thenReturn(Optional.of(dream));
        lenient().when(dreamRepository.findAllByUserIdOrderByDreamDateDescCreatedAtDesc(42L))
                .thenReturn(List.of(dream));
        lenient().when(expansionRepository.saveAndFlush(any()))
                .thenAnswer(invocation -> initialize(invocation.getArgument(0)));
        lenient().when(expansionRepository.save(any()))
                .thenAnswer(invocation -> initialize(invocation.getArgument(0)));
        lenient().when(monetizationClient.getConfig(42L))
                .thenReturn(new DreamExpansionConfigResponse(
                        true, "GURU_TOKEN", 1, "pricing-v1",
                        true, 5, Map.of("EMOTIONAL_ANALYSIS", 1), true, true));
    }

    @Test
    void successfulAiResultCommitsReservationAndReturnsUpdatedBalance() {
        UUID reservationId = UUID.randomUUID();
        UUID ledgerId = UUID.randomUUID();
        when(monetizationClient.reserve(
                42L, 10L, DreamExpansionType.EMOTIONAL_ANALYSIS, "req-1", "pricing-v1"))
                .thenReturn(reservation(reservationId, "PENDING", 1, 5, null));
        when(aiClient.generate(eq(dream), any(), anyString())).thenReturn(validAiJson());
        when(monetizationClient.settle(
                eq(reservationId), eq(42L), any(), eq(DreamExpansionService.PROMPT_VERSION), eq(true)))
                .thenReturn(reservation(reservationId, "COMMITTED", 1, 4, ledgerId));

        DreamExpansionResponse response = service.expand(42L, 10L, request("req-1"));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.currentBalance()).isEqualTo(4);
        assertThat(response.usedExistingResult()).isFalse();
        assertThat(response.result().path("insights")).hasSize(2);
        verify(monetizationClient).settle(
                eq(reservationId), eq(42L), any(), eq(DreamExpansionService.PROMPT_VERSION), eq(true));
        verify(monetizationClient, never()).settle(
                eq(reservationId), eq(42L), any(), anyString(), eq(false));
    }

    @Test
    void aiFailureCancelsReservationAndNeverCommits() {
        UUID reservationId = UUID.randomUUID();
        when(monetizationClient.reserve(
                42L, 10L, DreamExpansionType.EMOTIONAL_ANALYSIS, "req-2", "pricing-v1"))
                .thenReturn(reservation(reservationId, "PENDING", 1, 5, null));
        when(aiClient.generate(eq(dream), any(), anyString()))
                .thenThrow(new IllegalStateException("provider timeout"));

        assertThatThrownBy(() -> service.expand(42L, 10L, request("req-2")))
                .isInstanceOf(DreamExpansionService.ExpansionException.class)
                .extracting("code")
                .isEqualTo("EXPANSION_FAILED");
        verify(monetizationClient).settle(
                eq(reservationId), eq(42L), any(), eq(DreamExpansionService.PROMPT_VERSION), eq(false));
        verify(monetizationClient, never()).settle(
                eq(reservationId), eq(42L), any(), anyString(), eq(true));
    }

    @Test
    void existingCompletedResultReopensWithoutReserveOrAiCall() {
        DreamAnalysisExpansion existing = completed("old-request");
        when(expansionRepository
                .findFirstByUserIdAndDreamIdAndExpansionTypeAndTargetHashAndStatusOrderByCreatedAtDesc(
                        eq(42L), eq(10L), eq(DreamExpansionType.EMOTIONAL_ANALYSIS), anyString(), eq("COMPLETED")))
                .thenReturn(Optional.of(existing));

        DreamExpansionResponse response = service.expand(42L, 10L, request("new-request"));

        assertThat(response.usedExistingResult()).isTrue();
        assertThat(response.id()).isEqualTo(existing.getId());
        verifyNoInteractions(aiClient);
        verify(monetizationClient, never()).reserve(
                anyLong(), anyLong(), any(), anyString(), anyString());
    }

    @Test
    void completedIdempotencyReplayDoesNotSpendAgain() {
        DreamAnalysisExpansion existing = completed("same-request");
        when(expansionRepository.findByIdempotencyKey("same-request"))
                .thenReturn(Optional.of(existing));

        DreamExpansionResponse response = service.expand(42L, 10L, request("same-request"));

        assertThat(response.usedExistingResult()).isTrue();
        verifyNoInteractions(aiClient);
        verify(monetizationClient, never()).reserve(
                anyLong(), anyLong(), any(), anyString(), anyString());
    }

    @Test
    void cannotExpandAnotherUsersDream() {
        when(dreamRepository.findByIdAndUserId(10L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.expand(99L, 10L, request("req-3")))
                .isInstanceOf(DreamExpansionService.ExpansionException.class)
                .extracting("code")
                .isEqualTo("DREAM_NOT_FOUND");
        verifyNoInteractions(monetizationClient, aiClient);
    }

    @Test
    void personExpansionRequiresTargetBeforeAnyReservation() {
        DreamExpansionRequest missingTarget = new DreamExpansionRequest(
                DreamExpansionType.PERSON_MEANING, "", "req-4", "pricing-v1", false, "tr");

        assertThatThrownBy(() -> service.expand(42L, 10L, missingTarget))
                .isInstanceOf(DreamExpansionService.ExpansionException.class)
                .extracting("code")
                .isEqualTo("TARGET_REQUIRED");
        verify(monetizationClient, never()).reserve(
                anyLong(), anyLong(), any(), anyString(), anyString());
    }

    private DreamExpansionRequest request(String key) {
        return new DreamExpansionRequest(
                DreamExpansionType.EMOTIONAL_ANALYSIS, null, key, "pricing-v1", false, "tr");
    }

    private DreamAnalysisExpansion completed(String key) {
        return DreamAnalysisExpansion.builder()
                .id(UUID.randomUUID())
                .userId(42L)
                .dreamId(10L)
                .expansionType(DreamExpansionType.EMOTIONAL_ANALYSIS)
                .targetHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
                .resultJson(validAiJson())
                .tokenCost(1)
                .status("COMPLETED")
                .idempotencyKey(key)
                .promptVersion(DreamExpansionService.PROMPT_VERSION)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private DreamAnalysisExpansion initialize(DreamAnalysisExpansion row) {
        if (row.getId() == null) row.setId(UUID.randomUUID());
        if (row.getCreatedAt() == null) row.setCreatedAt(LocalDateTime.now());
        if (row.getUpdatedAt() == null) row.setUpdatedAt(LocalDateTime.now());
        return row;
    }

    private DreamExpansionMonetizationClient.ReservationResponse reservation(
            UUID id, String status, int cost, int balance, UUID ledgerId) {
        return new DreamExpansionMonetizationClient.ReservationResponse(
                id, status, cost, balance, ledgerId, LocalDateTime.now().plusMinutes(5));
    }

    private String validAiJson() {
        return """
                {
                  "title": "Duygusal katman",
                  "summary": "Bu rüya değişim karşısındaki merakı ve temkini birlikte taşıyor.",
                  "insights": [
                    "Deniz duyguların hareket alanını temsil ediyor olabilir.",
                    "Kapı yeni bir eşiğe yaklaşma hissini gösterebilir."
                  ],
                  "reflectionPrompt": "Şu an hangi değişime hem merak hem temkinle yaklaşıyorsun?",
                  "safetyNote": "Bu yorum kesin bir hüküm değildir."
                }
                """;
    }
}
