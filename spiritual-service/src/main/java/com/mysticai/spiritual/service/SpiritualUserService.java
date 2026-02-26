package com.mysticai.spiritual.service;

import com.mysticai.spiritual.dto.content.ContentReportResponse;
import com.mysticai.spiritual.dto.content.CreateContentReportRequest;
import com.mysticai.spiritual.dto.user.FavoriteStatusResponse;
import com.mysticai.spiritual.dto.user.UpdateUserPreferencesRequest;
import com.mysticai.spiritual.dto.user.UserPreferencesResponse;
import com.mysticai.spiritual.entity.ContentReport;
import com.mysticai.spiritual.entity.UserPrayerFavorite;
import com.mysticai.spiritual.entity.UserPreferences;
import com.mysticai.spiritual.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class SpiritualUserService {

    private final UserPreferencesRepository userPreferencesRepository;
    private final UserPrayerFavoriteRepository userPrayerFavoriteRepository;
    private final ContentReportRepository contentReportRepository;
    private final PrayerRepository prayerRepository;
    private final AsmaulHusnaRepository asmaulHusnaRepository;
    private final MeditationExerciseRepository meditationExerciseRepository;

    @Transactional
    public UserPreferencesResponse getPreferences(Long userId) {
        UserPreferences prefs = userPreferencesRepository.findByUserId(userId)
                .orElseGet(() -> userPreferencesRepository.save(UserPreferences.builder().userId(userId).build()));
        return mapPreferences(prefs);
    }

    @Transactional
    public UserPreferencesResponse updatePreferences(Long userId, UpdateUserPreferencesRequest req) {
        UserPreferences prefs = userPreferencesRepository.findByUserId(userId)
                .orElseGet(() -> UserPreferences.builder().userId(userId).build());

        if (req.contentLanguage() != null) prefs.setContentLanguage(req.contentLanguage());
        if (req.fontScale() != null) prefs.setFontScale(req.fontScale().setScale(2, RoundingMode.HALF_UP));
        if (req.readingModeEnabled() != null) prefs.setReadingModeEnabled(req.readingModeEnabled());
        if (req.keepScreenAwake() != null) prefs.setKeepScreenAwake(req.keepScreenAwake());
        if (req.ttsEnabled() != null) prefs.setTtsEnabled(req.ttsEnabled());
        if (req.ttsDefaultLang() != null) prefs.setTtsDefaultLang(req.ttsDefaultLang());
        if (req.ttsVoiceId() != null) prefs.setTtsVoiceId(req.ttsVoiceId());
        if (req.prayerCounterHaptic() != null) prefs.setPrayerCounterHaptic(req.prayerCounterHaptic());
        if (req.reminderEnabled() != null) prefs.setReminderEnabled(req.reminderEnabled());
        if (req.reminderScheduleJson() != null) prefs.setReminderScheduleJson(req.reminderScheduleJson());
        if (req.shortPrayersEnabled() != null) prefs.setShortPrayersEnabled(req.shortPrayersEnabled());
        if (req.privacyExportEnabled() != null) prefs.setPrivacyExportEnabled(req.privacyExportEnabled());
        if (req.abOverridesJson() != null) prefs.setAbOverridesJson(req.abOverridesJson());

        return mapPreferences(userPreferencesRepository.save(prefs));
    }

    @Transactional
    public FavoriteStatusResponse addFavorite(Long userId, Long prayerId) {
        prayerRepository.findByIdAndActiveTrue(prayerId)
                .orElseThrow(() -> new IllegalArgumentException("Prayer not found"));
        if (!userPrayerFavoriteRepository.existsByUserIdAndPrayerId(userId, prayerId)) {
            userPrayerFavoriteRepository.save(UserPrayerFavorite.builder()
                    .userId(userId)
                    .prayerId(prayerId)
                    .build());
        }
        return new FavoriteStatusResponse(prayerId, true);
    }

    @Transactional
    public FavoriteStatusResponse removeFavorite(Long userId, Long prayerId) {
        userPrayerFavoriteRepository.findByUserIdAndPrayerId(userId, prayerId)
                .ifPresent(userPrayerFavoriteRepository::delete);
        return new FavoriteStatusResponse(prayerId, false);
    }

    @Transactional
    public ContentReportResponse createContentReport(Long userId, CreateContentReportRequest req) {
        validateContentExists(req.contentType(), req.contentId());

        ContentReport report = contentReportRepository.save(ContentReport.builder()
                .userId(userId)
                .contentType(req.contentType())
                .contentId(req.contentId())
                .reason(req.reason())
                .note(req.note())
                .status("OPEN")
                .build());

        return new ContentReportResponse(
                report.getId(),
                report.getUserId(),
                report.getContentType(),
                report.getContentId(),
                report.getReason(),
                report.getNote(),
                report.getStatus(),
                report.getCreatedAt()
        );
    }

    private void validateContentExists(String contentType, Long contentId) {
        boolean exists = switch (contentType) {
            case "PRAYER" -> prayerRepository.findByIdAndActiveTrue(contentId).isPresent();
            case "ASMA" -> asmaulHusnaRepository.findByIdAndActiveTrue(contentId).isPresent();
            case "MEDITATION" -> meditationExerciseRepository.findByIdAndActiveTrue(contentId).isPresent();
            default -> false;
        };
        if (!exists) throw new IllegalArgumentException("Content not found");
    }

    private UserPreferencesResponse mapPreferences(UserPreferences prefs) {
        return new UserPreferencesResponse(
                prefs.getUserId(),
                prefs.getContentLanguage(),
                prefs.getFontScale(),
                prefs.getReadingModeEnabled(),
                prefs.getKeepScreenAwake(),
                prefs.getTtsEnabled(),
                prefs.getTtsDefaultLang(),
                prefs.getTtsVoiceId(),
                prefs.getPrayerCounterHaptic(),
                prefs.getReminderEnabled(),
                prefs.getReminderScheduleJson(),
                prefs.getShortPrayersEnabled(),
                prefs.getPrivacyExportEnabled(),
                prefs.getAbOverridesJson()
        );
    }
}
