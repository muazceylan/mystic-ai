package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.StarMatePreferencePayload;
import com.mysticai.astrology.dto.StarMateProfileRequest;
import com.mysticai.astrology.dto.StarMateProfileResponse;
import com.mysticai.astrology.entity.StarMatePreference;
import com.mysticai.astrology.entity.StarMateProfile;
import com.mysticai.astrology.entity.StarMateShowMe;
import com.mysticai.astrology.repository.StarMatePreferenceRepository;
import com.mysticai.astrology.repository.StarMateProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StarMateProfileService {

    private final StarMateProfileRepository profileRepository;
    private final StarMatePreferenceRepository preferenceRepository;
    private final StarMateSupport support;
    private final SynastryQueueService synastryQueueService;

    @Transactional
    public StarMateProfileResponse upsertProfile(StarMateProfileRequest request) {
        validateAgeRange(request.minCompatibilityAge(), request.maxCompatibilityAge(), "profile");

        StarMateProfile profile = profileRepository.findByUserId(request.userId())
                .orElseGet(() -> StarMateProfile.builder()
                        .userId(request.userId())
                        .photosJson("[]")
                        .interestedIn(StarMateShowMe.EVERYONE)
                        .isActive(true)
                        .build());

        profile.setBio(request.bio());
        if (request.photos() != null) {
            profile.setPhotosJson(support.toPhotosJson(request.photos()));
        }
        profile.setGender(support.parseGender(request.gender()));
        profile.setInterestedIn(support.parseShowMe(request.interestedIn(), profile.getInterestedIn() != null ? profile.getInterestedIn() : StarMateShowMe.EVERYONE));
        profile.setBirthDate(request.birthDate());
        profile.setLocationLabel(request.locationLabel());
        profile.setLatitude(request.latitude());
        profile.setLongitude(request.longitude());
        if (request.minCompatibilityAge() != null) profile.setMinCompatibilityAge(request.minCompatibilityAge());
        if (request.maxCompatibilityAge() != null) profile.setMaxCompatibilityAge(request.maxCompatibilityAge());
        if (request.isActive() != null) profile.setActive(request.isActive());

        StarMateProfile savedProfile = profileRepository.save(profile);
        StarMatePreference preference = upsertPreferenceInternal(request.userId(), request.preference());

        if (savedProfile.isActive()) {
            synastryQueueService.warmScoresForProfileUpdate(savedProfile.getUserId());
        }

        log.info("StarMate profile upserted for userId={} profileId={} active={}",
                request.userId(), savedProfile.getId(), savedProfile.isActive());
        return toResponse(savedProfile, preference);
    }

    @Transactional(readOnly = true)
    public StarMateProfile findByUserIdOrThrow(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("StarMate profile not found for userId=" + userId));
    }

    @Transactional(readOnly = true)
    public StarMateProfile findActiveByUserIdOrThrow(Long userId) {
        StarMateProfile profile = findByUserIdOrThrow(userId);
        if (!profile.isActive()) {
            throw new IllegalArgumentException("StarMate profile is not active for userId=" + userId);
        }
        return profile;
    }

    @Transactional
    public StarMatePreference getOrCreatePreference(Long userId) {
        return preferenceRepository.findByUserId(userId)
                .orElseGet(() -> support.buildDefaultPreference(userId));
    }

    private StarMatePreference upsertPreferenceInternal(Long userId, StarMatePreferencePayload payload) {
        StarMatePreference preference = preferenceRepository.findByUserId(userId)
                .orElseGet(() -> support.buildDefaultPreference(userId));

        if (payload != null) {
            validateAgeRange(payload.minAge(), payload.maxAge(), "preference");
            if (payload.maxDistanceKm() != null) preference.setMaxDistanceKm(payload.maxDistanceKm());
            if (payload.minAge() != null) preference.setMinAge(payload.minAge());
            if (payload.maxAge() != null) preference.setMaxAge(payload.maxAge());
            if (payload.minCompatibilityScore() != null) preference.setMinCompatibilityScore(payload.minCompatibilityScore());
            if (payload.showMe() != null) {
                preference.setShowMe(support.parseShowMe(payload.showMe(), preference.getShowMe()));
            }
            if (payload.strictDistance() != null) preference.setStrictDistance(payload.strictDistance());
            if (payload.strictAge() != null) preference.setStrictAge(payload.strictAge());
        }

        return preferenceRepository.save(preference);
    }

    private StarMateProfileResponse toResponse(StarMateProfile profile, StarMatePreference preference) {
        List<String> photos = support.parsePhotos(profile.getPhotosJson());
        return new StarMateProfileResponse(
                profile.getId(),
                profile.getUserId(),
                profile.getBio(),
                photos,
                profile.getGender() != null ? profile.getGender().name() : null,
                profile.getInterestedIn() != null ? profile.getInterestedIn().name() : null,
                profile.getBirthDate(),
                profile.getLocationLabel(),
                profile.getLatitude(),
                profile.getLongitude(),
                profile.getMinCompatibilityAge(),
                profile.getMaxCompatibilityAge(),
                profile.isActive(),
                support.toPreferencePayload(preference),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    private void validateAgeRange(Integer min, Integer max, String source) {
        if (min == null || max == null) return;
        if (min > max) {
            throw new IllegalArgumentException(source + " age range is invalid: minAge cannot exceed maxAge");
        }
    }
}
