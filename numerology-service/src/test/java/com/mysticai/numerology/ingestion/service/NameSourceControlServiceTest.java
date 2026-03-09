package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.admin.SourceToggleResponseDto;
import com.mysticai.numerology.ingestion.entity.NameSourceControl;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameSourceControlRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameSourceControlServiceTest {

    @Mock
    private NameSourceControlRepository controlRepository;
    @Mock
    private NameIngestionMetricsService metricsService;

    @Test
    void enableDisable_overridesConfigAndPublishesGauge() {
        NameIngestionProperties properties = new NameIngestionProperties();
        NameIngestionProperties.SourceSettings settings = new NameIngestionProperties.SourceSettings();
        settings.setEnabled(true);
        properties.setSources(Map.of(SourceName.BEBEKISMI.getConfigKey(), settings));

        NameSourceControlService service = new NameSourceControlService(properties, controlRepository, metricsService);

        when(controlRepository.findById(SourceName.BEBEKISMI)).thenReturn(Optional.empty());
        when(controlRepository.save(any(NameSourceControl.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SourceToggleResponseDto disabled = service.disable(SourceName.BEBEKISMI, "ops@mystic.ai");
        assertFalse(disabled.enabled());

        NameSourceControl overrideEnabled = NameSourceControl.builder()
                .sourceName(SourceName.BEBEKISMI)
                .enabled(false)
                .build();
        when(controlRepository.findById(SourceName.BEBEKISMI)).thenReturn(Optional.of(overrideEnabled));
        assertFalse(service.isSourceEnabled(SourceName.BEBEKISMI));

        SourceToggleResponseDto enabled = service.enable(SourceName.BEBEKISMI, "ops@mystic.ai");
        assertTrue(enabled.enabled());

        verify(metricsService, times(1)).setSourceEnabled(SourceName.BEBEKISMI, false);
        verify(metricsService).setSourceEnabled(SourceName.BEBEKISMI, true);
    }
}
