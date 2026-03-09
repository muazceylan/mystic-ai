package com.mysticai.notification.admin.service;

import com.mysticai.notification.config.TriggerRegistrar;
import com.mysticai.notification.entity.NotificationDefinition;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationDefinitionRepository;
import com.mysticai.notification.repository.NotificationTriggerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Verifies that TriggerRegistrar.registerAll() is idempotent:
 *  - does not duplicate existing records
 *  - preserves admin-toggled isActive flag across re-registrations
 *  - updates metadata (displayName, codeReference, cadence) during upsert
 */
@ExtendWith(MockitoExtension.class)
class TriggerRegistrarTest {

    @Mock NotificationDefinitionRepository definitionRepo;
    @Mock NotificationTriggerRepository triggerRepo;
    @Mock AuditLogService auditLogService;

    // Use real service instances to test the actual upsert logic, not mocks
    NotificationDefinitionService definitionService;
    NotificationTriggerService triggerService;
    TriggerRegistrar registrar;

    @BeforeEach
    void setUp() {
        definitionService = new NotificationDefinitionService(definitionRepo, auditLogService);
        triggerService = new NotificationTriggerService(triggerRepo, auditLogService);
        registrar = new TriggerRegistrar(definitionService, triggerService);
    }

    @Test
    void shouldUpsertWithoutDuplicatingAndPreserveIsActiveFlag() {
        // ── Arrange ──────────────────────────────────────────────────────────

        // Simulate "daily_notification_generation" trigger that admin disabled previously
        NotificationTrigger existingTrigger = NotificationTrigger.builder()
                .triggerKey("daily_notification_generation")
                .displayName("Old Display Name")
                .isActive(false)         // admin disabled this trigger
                .isPausable(true)
                .isSystemCritical(false)
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .sourceType(NotificationTrigger.SourceType.STATIC_BACKEND)
                .build();

        // Simulate "daily_summary" definition that admin also disabled
        NotificationDefinition existingDef = NotificationDefinition.builder()
                .definitionKey("daily_summary")
                .displayName("Old Definition Name")
                .isActive(false)         // admin disabled this definition
                .cadenceType(NotificationDefinition.CadenceType.DAILY)
                .channelType(NotificationDefinition.ChannelType.BOTH)
                .sourceType(NotificationDefinition.SourceType.STATIC_BACKEND)
                .triggerType(NotificationDefinition.TriggerType.CRON)
                .build();

        // All other keys → not found (new records, will be created)
        when(triggerRepo.findByTriggerKey(anyString())).thenReturn(Optional.empty());
        when(definitionRepo.findByDefinitionKey(anyString())).thenReturn(Optional.empty());
        when(triggerRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(definitionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Our specific keys → return the existing records (simulate restart scenario)
        when(triggerRepo.findByTriggerKey("daily_notification_generation"))
                .thenReturn(Optional.of(existingTrigger));
        when(definitionRepo.findByDefinitionKey("daily_summary"))
                .thenReturn(Optional.of(existingDef));

        // ── Act ───────────────────────────────────────────────────────────────
        assertThatNoException().isThrownBy(() -> registrar.registerAll());

        // ── Assert: trigger isActive preserved ───────────────────────────────
        assertThat(existingTrigger.isActive())
                .as("Admin-toggled isActive=false must be preserved across re-registration")
                .isFalse();

        // Metadata updated to current seed value (not "Old Display Name")
        assertThat(existingTrigger.getDisplayName())
                .as("displayName metadata must be updated from seed")
                .isEqualTo("Günlük Bildirim Üretimi");

        assertThat(existingTrigger.getCronExpression())
                .as("cronExpression must be updated from seed")
                .isEqualTo("0 30 8 * * *");

        // ── Assert: definition isActive preserved ─────────────────────────────
        assertThat(existingDef.isActive())
                .as("Admin-toggled isActive=false must be preserved for definition")
                .isFalse();

        assertThat(existingDef.getDisplayName())
                .as("displayName metadata must be updated for definition")
                .isEqualTo("Günlük Özet");

        // ── Assert: no duplicate creates ──────────────────────────────────────
        // save() called on the existing object (update path), not a brand-new one
        verify(triggerRepo, atLeastOnce()).save(existingTrigger);
        verify(definitionRepo, atLeastOnce()).save(existingDef);

        // Both repos were checked before deciding create vs update
        verify(triggerRepo, atLeastOnce()).findByTriggerKey("daily_notification_generation");
        verify(definitionRepo, atLeastOnce()).findByDefinitionKey("daily_summary");
    }

    @Test
    void shouldNotThrowWhenCalledMultipleTimes() {
        // Simulate clean DB (all keys new)
        when(triggerRepo.findByTriggerKey(anyString())).thenReturn(Optional.empty());
        when(definitionRepo.findByDefinitionKey(anyString())).thenReturn(Optional.empty());
        when(triggerRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(definitionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> {
            registrar.registerAll();
            registrar.registerAll(); // second call simulates second restart
        });
    }
}
