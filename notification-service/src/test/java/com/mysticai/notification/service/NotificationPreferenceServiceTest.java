package com.mysticai.notification.service;

import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {

    @Mock
    NotificationPreferenceRepository preferenceRepository;

    @InjectMocks
    NotificationPreferenceService service;

    @Test
    void shouldReloadExistingPreferenceWhenConcurrentInsertHitsPrimaryKey() {
        Long userId = 209L;
        NotificationPreference existing = NotificationPreference.builder()
                .userId(userId)
                .build();

        when(preferenceRepository.findById(eq(userId)))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existing));
        when(preferenceRepository.saveAndFlush(any(NotificationPreference.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        NotificationPreference result = service.getOrCreate(userId);

        assertThat(result).isSameAs(existing);
        verify(preferenceRepository, times(2)).findById(userId);
    }
}
