package com.mysticai.notification.tutorial.service;

import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicListResponse;
import com.mysticai.notification.tutorial.dto.mobile.TutorialConfigPublicTutorialDto;
import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.mapper.TutorialConfigMapper;
import com.mysticai.notification.tutorial.repository.TutorialConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TutorialConfigQueryService {

    private final TutorialConfigRepository repository;
    private final TutorialConfigMapper mapper;

    public TutorialConfigPublicListResponse findForMobile(
            TutorialPlatform requestedPlatform,
            boolean onlyActive,
            boolean publishedOnly,
            String screenKey
    ) {
        TutorialPlatform effectivePlatform = requestedPlatform != null ? requestedPlatform : TutorialPlatform.MOBILE;
        Set<TutorialPlatform> platforms = resolvePlatformSet(effectivePlatform);

        LocalDateTime now = LocalDateTime.now();

        List<TutorialConfigPublicTutorialDto> tutorials = repository
                .findForPublicRead(platforms, normalizeNullable(screenKey), onlyActive, publishedOnly, TutorialConfigStatus.PUBLISHED)
                .stream()
                .filter(config -> isWithinDateWindow(config, now))
                .sorted(Comparator.comparingInt(TutorialConfig::getPriority).reversed()
                        .thenComparing(TutorialConfig::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(mapper::toPublicTutorialDto)
                .filter(dto -> !dto.steps().isEmpty())
                .toList();

        LocalDateTime fetchedAt = LocalDateTime.now();
        String configVersion = tutorials.stream()
                .map(TutorialConfigPublicTutorialDto::updatedAt)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .map(LocalDateTime::toString)
                .orElse(fetchedAt.toString());

        return mapper.toPublicListResponse(tutorials, configVersion, fetchedAt);
    }

    private boolean isWithinDateWindow(TutorialConfig config, LocalDateTime now) {
        if (config.getStartAt() != null && config.getStartAt().isAfter(now)) {
            return false;
        }

        if (config.getEndAt() != null && config.getEndAt().isBefore(now)) {
            return false;
        }

        return true;
    }

    private Set<TutorialPlatform> resolvePlatformSet(TutorialPlatform platform) {
        return switch (platform) {
            case MOBILE -> EnumSet.of(TutorialPlatform.MOBILE, TutorialPlatform.IOS, TutorialPlatform.ANDROID, TutorialPlatform.ALL);
            case IOS -> EnumSet.of(TutorialPlatform.IOS, TutorialPlatform.MOBILE, TutorialPlatform.ALL);
            case ANDROID -> EnumSet.of(TutorialPlatform.ANDROID, TutorialPlatform.MOBILE, TutorialPlatform.ALL);
            case WEB -> EnumSet.of(TutorialPlatform.WEB, TutorialPlatform.ALL);
            case ALL -> EnumSet.allOf(TutorialPlatform.class);
        };
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
