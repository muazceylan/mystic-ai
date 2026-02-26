package com.mysticai.spiritual.service;

import com.mysticai.spiritual.dto.common.PagedResponse;
import com.mysticai.spiritual.dto.log.*;
import com.mysticai.spiritual.dto.stats.WeeklyStatsResponse;
import com.mysticai.spiritual.entity.*;
import com.mysticai.spiritual.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpiritualLogService {

    private final PrayerRepository prayerRepository;
    private final AsmaulHusnaRepository asmaulHusnaRepository;
    private final MeditationExerciseRepository meditationExerciseRepository;
    private final DhikrEntryRepository dhikrEntryRepository;
    private final MeditationSessionRepository meditationSessionRepository;
    private final IdempotencyService idempotencyService;

    @Transactional
    public DhikrLogResponse logPrayer(Long userId, CreatePrayerLogRequest req, String idempotencyKey) {
        idempotencyService.reserveOrThrow(userId, "log-prayer", idempotencyKey);
        prayerRepository.findByIdAndActiveTrue(req.prayerId())
                .orElseThrow(() -> new IllegalArgumentException("Prayer not found"));

        DhikrEntry entry = dhikrEntryRepository.findByUserIdAndEntryDateAndPrayerId(userId, req.date(), req.prayerId())
                .orElseGet(() -> DhikrEntry.newPrayerEntry(userId, req.date(), req.prayerId()));

        entry.setTotalRepeatCount((entry.getTotalRepeatCount() == null ? 0 : entry.getTotalRepeatCount()) + req.count());
        entry.setSessionCount((entry.getSessionCount() == null ? 0 : entry.getSessionCount()) + 1);
        if (req.note() != null && !req.note().isBlank()) entry.setNote(req.note());
        if (req.mood() != null && !req.mood().isBlank()) entry.setMood(req.mood());

        return DhikrLogResponse.from(dhikrEntryRepository.save(entry));
    }

    @Transactional
    public DhikrLogResponse logAsma(Long userId, CreateAsmaLogRequest req, String idempotencyKey) {
        idempotencyService.reserveOrThrow(userId, "log-asma", idempotencyKey);
        asmaulHusnaRepository.findByIdAndActiveTrue(req.asmaId())
                .orElseThrow(() -> new IllegalArgumentException("Asma not found"));

        DhikrEntry entry = dhikrEntryRepository.findByUserIdAndEntryDateAndAsmaId(userId, req.date(), req.asmaId())
                .orElseGet(() -> DhikrEntry.newAsmaEntry(userId, req.date(), req.asmaId()));

        entry.setTotalRepeatCount((entry.getTotalRepeatCount() == null ? 0 : entry.getTotalRepeatCount()) + req.count());
        entry.setSessionCount((entry.getSessionCount() == null ? 0 : entry.getSessionCount()) + 1);
        if (req.note() != null && !req.note().isBlank()) entry.setNote(req.note());
        if (req.mood() != null && !req.mood().isBlank()) entry.setMood(req.mood());

        return DhikrLogResponse.from(dhikrEntryRepository.save(entry));
    }

    @Transactional
    public MeditationLogResponse logMeditation(Long userId, CreateMeditationLogRequest req, String idempotencyKey) {
        idempotencyService.reserveOrThrow(userId, "log-meditation", idempotencyKey);
        meditationExerciseRepository.findByIdAndActiveTrue(req.exerciseId())
                .orElseThrow(() -> new IllegalArgumentException("Meditation exercise not found"));

        LocalDateTime now = LocalDateTime.now();
        MeditationSession session = MeditationSession.builder()
                .userId(userId)
                .sessionDate(req.date())
                .startedAt(now.minusSeconds(req.durationSec()))
                .endedAt(now)
                .exerciseId(req.exerciseId())
                .targetDurationSec(req.durationSec())
                .actualDurationSec(req.durationSec())
                .completedCycles(req.completedCycles())
                .moodBefore(req.moodBefore())
                .moodAfter(req.moodAfter())
                .note(req.note())
                .status("COMPLETED")
                .build();

        MeditationSession saved = meditationSessionRepository.save(session);
        return new MeditationLogResponse(
                saved.getId(),
                saved.getUserId(),
                saved.getSessionDate(),
                saved.getExerciseId(),
                saved.getTargetDurationSec(),
                saved.getActualDurationSec(),
                saved.getCompletedCycles(),
                saved.getMoodBefore(),
                saved.getMoodAfter(),
                saved.getStatus(),
                saved.getCreatedAt()
        );
    }

    public PagedResponse<DhikrLogResponse> getPrayerLogs(Long userId, LocalDate from, LocalDate to, int page, int pageSize) {
        LocalDate start = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now();

        List<DhikrLogResponse> all = dhikrEntryRepository
                .findAllByUserIdAndEntryDateBetweenOrderByEntryDateDesc(userId, start, end)
                .stream()
                .filter(entry -> "PRAYER".equals(entry.getEntryType()))
                .map(DhikrLogResponse::from)
                .toList();

        int safePage = Math.max(page, 1);
        int safePageSize = Math.max(1, Math.min(pageSize, 100));
        int fromIndex = Math.min((safePage - 1) * safePageSize, all.size());
        int toIndex = Math.min(fromIndex + safePageSize, all.size());
        List<DhikrLogResponse> items = all.subList(fromIndex, toIndex);
        int totalPages = (int) Math.ceil((double) all.size() / safePageSize);

        return new PagedResponse<>(items, safePage, safePageSize, all.size(), totalPages);
    }

    public WeeklyStatsResponse getWeeklyStats(Long userId, String isoWeek) {
        LocalDate start = LocalDate.parse(isoWeek + "-1", DateTimeFormatter.ISO_WEEK_DATE);
        LocalDate end = start.plusDays(6);

        List<DhikrEntry> dhikrEntries = dhikrEntryRepository.findAllByUserIdAndEntryDateBetweenOrderByEntryDateDesc(userId, start, end);
        List<MeditationSession> sessions = meditationSessionRepository.findAllByUserIdAndSessionDateBetweenOrderBySessionDateDesc(userId, start, end);

        int totalPrayerRepeats = dhikrEntries.stream()
                .filter(e -> "PRAYER".equals(e.getEntryType()))
                .mapToInt(e -> Optional.ofNullable(e.getTotalRepeatCount()).orElse(0))
                .sum();

        int totalAsmaRepeats = dhikrEntries.stream()
                .filter(e -> "ASMA".equals(e.getEntryType()))
                .mapToInt(e -> Optional.ofNullable(e.getTotalRepeatCount()).orElse(0))
                .sum();

        int totalMeditationSec = sessions.stream()
                .mapToInt(s -> Optional.ofNullable(s.getActualDurationSec()).orElse(0))
                .sum();

        Map<Long, Integer> prayerCounts = dhikrEntries.stream()
                .filter(e -> "PRAYER".equals(e.getEntryType()) && e.getPrayerId() != null)
                .collect(Collectors.groupingBy(DhikrEntry::getPrayerId,
                        Collectors.summingInt(e -> Optional.ofNullable(e.getTotalRepeatCount()).orElse(0))));

        WeeklyStatsResponse.TopPrayerSummary topPrayer = prayerCounts.entrySet().stream()
                .max(Comparator.comparingInt(Map.Entry::getValue))
                .map(entry -> {
                    String title = prayerRepository.findById(entry.getKey())
                            .map(Prayer::getTitle)
                            .orElse("Unknown Prayer");
                    return new WeeklyStatsResponse.TopPrayerSummary(entry.getKey(), title, entry.getValue());
                })
                .orElse(null);

        int activeDays = (int) dhikrEntries.stream().map(DhikrEntry::getEntryDate).distinct().count();
        int streakDays = activeDays; // Skeleton: gerçek streak hesaplamasi sonraki iterasyonda iyilestirilmeli.

        return new WeeklyStatsResponse(
                isoWeek,
                totalPrayerRepeats,
                totalAsmaRepeats,
                totalMeditationSec,
                topPrayer,
                streakDays,
                activeDays
        );
    }
}
