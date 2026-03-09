package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import com.mysticai.numerology.ingestion.dto.admin.SourceToggleResponseDto;
import com.mysticai.numerology.ingestion.entity.NameSourceControl;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.repository.NameSourceControlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NameSourceControlService {

    private final NameIngestionProperties properties;
    private final NameSourceControlRepository controlRepository;
    private final NameIngestionMetricsService metricsService;

    @PostConstruct
    void bootstrapGauges() {
        enabledStateSnapshot();
    }

    public boolean isSourceEnabled(SourceName sourceName) {
        boolean configured = properties.settingsFor(sourceName).isEnabled();
        return controlRepository.findById(sourceName)
                .map(NameSourceControl::isEnabled)
                .orElse(configured);
    }

    public Map<SourceName, Boolean> enabledStateSnapshot() {
        Map<SourceName, Boolean> states = new LinkedHashMap<>();
        for (SourceName sourceName : SourceName.values()) {
            boolean enabled = isSourceEnabled(sourceName);
            states.put(sourceName, enabled);
            metricsService.setSourceEnabled(sourceName, enabled);
        }
        return states;
    }

    public Optional<NameSourceControl> getControl(SourceName sourceName) {
        return controlRepository.findById(sourceName);
    }

    @Transactional
    public SourceToggleResponseDto enable(SourceName sourceName, String updatedBy) {
        return setEnabled(sourceName, true, updatedBy);
    }

    @Transactional
    public SourceToggleResponseDto disable(SourceName sourceName, String updatedBy) {
        return setEnabled(sourceName, false, updatedBy);
    }

    private SourceToggleResponseDto setEnabled(SourceName sourceName, boolean enabled, String updatedBy) {
        NameSourceControl control = controlRepository.findById(sourceName)
                .orElseGet(() -> NameSourceControl.builder()
                        .sourceName(sourceName)
                        .enabled(enabled)
                        .build());

        control.setEnabled(enabled);
        control.setUpdatedBy(cleanActor(updatedBy));
        NameSourceControl saved = controlRepository.save(control);
        metricsService.setSourceEnabled(sourceName, enabled);

        return new SourceToggleResponseDto(
                saved.getSourceName(),
                saved.isEnabled(),
                saved.getUpdatedBy(),
                saved.getUpdatedAt()
        );
    }

    private String cleanActor(String actor) {
        if (actor == null) {
            return null;
        }
        String trimmed = actor.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
