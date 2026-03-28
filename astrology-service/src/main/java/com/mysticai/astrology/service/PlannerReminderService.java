package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.reminder.ReminderCreateRequest;
import com.mysticai.astrology.dto.reminder.ReminderResponse;
import com.mysticai.astrology.dto.reminder.ReminderUpdateRequest;
import com.mysticai.astrology.entity.PlannerReminder;
import com.mysticai.astrology.entity.ReminderStatus;
import com.mysticai.astrology.entity.ReminderType;
import com.mysticai.astrology.repository.PlannerReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlannerReminderService {

    private final PlannerReminderRepository plannerReminderRepository;
    private final NotificationBridgeService notificationBridgeService;
    private final ObjectMapper objectMapper;

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_RETRY_ATTEMPTS = 3;

    @Transactional
    public ReminderResponse createReminder(Long userId, ReminderCreateRequest request) {
        validateUser(userId);
        if (request == null) {
            throw new IllegalArgumentException("Reminder body boş olamaz.");
        }

        ZoneId zone = resolveZone(request.timezone());
        String time = normalizeTime(request.time());
        LocalDate reminderDate = request.date();
        LocalDateTime dateTimeUtc = toUtc(reminderDate, time, zone);
        String payloadJson = writePayload(request.payload());
        String payloadHash = sha256(payloadJson);

        Optional<PlannerReminder> existing = plannerReminderRepository.findByUserIdAndTypeAndPayloadHashAndDateTimeUtc(
                userId,
                request.type(),
                payloadHash,
                dateTimeUtc
        );
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        MessageBundle message = buildMessage(request.type(), reminderDate, time, request.payload());
        PlannerReminder reminder = PlannerReminder.builder()
                .userId(userId)
                .reminderDate(reminderDate)
                .dateTimeUtc(dateTimeUtc)
                .nextAttemptUtc(dateTimeUtc)
                .localTime(time)
                .timezone(zone.getId())
                .type(request.type())
                .payloadJson(payloadJson)
                .payloadHash(payloadHash)
                .messageTitle(message.title())
                .messageBody(message.body())
                .status(ReminderStatus.SCHEDULED)
                .attemptCount(0)
                .enabled(true)
                .build();

        return toResponse(plannerReminderRepository.save(reminder));
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> listReminders(Long userId, LocalDate from, LocalDate to) {
        validateUser(userId);
        LocalDate start = from != null ? from : LocalDate.now(DEFAULT_ZONE).withDayOfMonth(1);
        LocalDate end = to != null ? to : start.plusMonths(1).minusDays(1);
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("to tarihi from tarihinden önce olamaz.");
        }

        return plannerReminderRepository.findByUserIdAndReminderDateBetweenOrderByDateTimeUtcAsc(userId, start, end).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ReminderResponse updateReminder(Long userId, Long reminderId, ReminderUpdateRequest request) {
        validateUser(userId);
        if (request == null) {
            throw new IllegalArgumentException("Reminder update body boş olamaz.");
        }

        PlannerReminder reminder = plannerReminderRepository.findByIdAndUserId(reminderId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder bulunamadı."));

        LocalDate nextDate = request.date() != null ? request.date() : reminder.getReminderDate();
        String nextTime = request.time() != null && !request.time().isBlank()
                ? normalizeTime(request.time())
                : reminder.getLocalTime();
        String nextZone = request.timezone() != null && !request.timezone().isBlank()
                ? resolveZone(request.timezone()).getId()
                : reminder.getTimezone();
        LocalDateTime nextDateTimeUtc = toUtc(nextDate, nextTime, ZoneId.of(nextZone));

        if (!Objects.equals(nextDateTimeUtc, reminder.getDateTimeUtc())) {
            Optional<PlannerReminder> duplicate = plannerReminderRepository.findByUserIdAndTypeAndPayloadHashAndDateTimeUtc(
                    userId,
                    reminder.getType(),
                    reminder.getPayloadHash(),
                    nextDateTimeUtc
            );
            if (duplicate.isPresent() && !Objects.equals(duplicate.get().getId(), reminder.getId())) {
                throw new IllegalArgumentException("Aynı tarih/saat ve içerikte hatırlatıcı zaten mevcut.");
            }
            reminder.setDateTimeUtc(nextDateTimeUtc);
            reminder.setReminderDate(nextDate);
            reminder.setLocalTime(nextTime);
            reminder.setTimezone(nextZone);
            reminder.setSentAt(null);
            reminder.setLastError(null);
            reminder.setAttemptCount(0);
            reminder.setNextAttemptUtc(nextDateTimeUtc);
            if (reminder.getStatus() == ReminderStatus.SENT || reminder.getStatus() == ReminderStatus.FAILED) {
                reminder.setStatus(ReminderStatus.SCHEDULED);
            }
        }

        if (request.enabled() != null) {
            boolean enabled = request.enabled();
            reminder.setEnabled(enabled);
            if (!enabled) {
                reminder.setStatus(ReminderStatus.CANCELLED);
                reminder.setNextAttemptUtc(LocalDateTime.now(ZoneOffset.UTC));
            } else if (reminder.getStatus() == ReminderStatus.CANCELLED || reminder.getStatus() == ReminderStatus.FAILED) {
                reminder.setStatus(ReminderStatus.SCHEDULED);
                reminder.setLastError(null);
                reminder.setAttemptCount(0);
                reminder.setSentAt(null);
                reminder.setNextAttemptUtc(nextSchedulableAttempt(reminder.getDateTimeUtc()));
            }
        }

        MessageBundle message = buildMessage(
                reminder.getType(),
                reminder.getReminderDate(),
                reminder.getLocalTime(),
                readPayload(reminder.getPayloadJson())
        );
        reminder.setMessageTitle(message.title());
        reminder.setMessageBody(message.body());

        return toResponse(plannerReminderRepository.save(reminder));
    }

    @Transactional
    public void deleteReminder(Long userId, Long reminderId) {
        validateUser(userId);
        PlannerReminder reminder = plannerReminderRepository.findByIdAndUserId(reminderId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder bulunamadı."));
        reminder.setEnabled(false);
        reminder.setStatus(ReminderStatus.CANCELLED);
        reminder.setNextAttemptUtc(LocalDateTime.now(ZoneOffset.UTC));
        plannerReminderRepository.save(reminder);
        log.info("event=reminder_deleted reminderId={} userId={} plannerDate={} type={}",
                reminder.getId(), reminder.getUserId(), reminder.getReminderDate(), reminder.getType());
    }

    @Transactional
    public int dispatchDueReminders() {
        LocalDateTime dueThreshold = LocalDateTime.now(ZoneOffset.UTC).plusSeconds(60);
        List<PlannerReminder> dueReminders = plannerReminderRepository
                .findTop200ByStatusAndEnabledTrueAndNextAttemptUtcLessThanEqualOrderByNextAttemptUtcAsc(
                        ReminderStatus.SCHEDULED,
                        dueThreshold
                );

        int sentCount = 0;
        for (PlannerReminder reminder : dueReminders) {
            if (!reminder.isEnabled()) continue;
            if (reminder.getStatus() != ReminderStatus.SCHEDULED) continue;

            int nextAttempt = reminder.getAttemptCount() + 1;
            reminder.setAttemptCount(nextAttempt);
            try {
                notificationBridgeService.sendPlannerReminder(reminder);
                reminder.setStatus(ReminderStatus.SENT);
                reminder.setSentAt(LocalDateTime.now(ZoneOffset.UTC));
                reminder.setLastError(null);
                reminder.setNextAttemptUtc(reminder.getDateTimeUtc());
                plannerReminderRepository.save(reminder);
                log.info("event=reminder_sent reminderId={} userId={} plannerDate={} type={} sentAt={}",
                        reminder.getId(), reminder.getUserId(), reminder.getReminderDate(), reminder.getType(), reminder.getSentAt());
                sentCount += 1;
            } catch (Exception ex) {
                markSendFailure(reminder, nextAttempt, clampText(ex.getMessage(), 220));
                plannerReminderRepository.save(reminder);
            }
        }

        if (sentCount > 0) {
            log.info("planner reminder dispatch completed: sent={}", sentCount);
        }
        return sentCount;
    }

    private ReminderResponse toResponse(PlannerReminder reminder) {
        return new ReminderResponse(
                reminder.getId(),
                reminder.getReminderDate(),
                reminder.getLocalTime(),
                reminder.getTimezone(),
                reminder.getType(),
                reminder.getStatus(),
                reminder.isEnabled(),
                readPayload(reminder.getPayloadJson()),
                reminder.getDateTimeUtc(),
                reminder.getSentAt(),
                reminder.getMessageTitle(),
                reminder.getMessageBody(),
                reminder.getLastError(),
                reminder.getCreatedAt(),
                reminder.getUpdatedAt()
        );
    }

    private void validateUser(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Geçerli kullanıcı bulunamadı.");
        }
    }

    private ZoneId resolveZone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return DEFAULT_ZONE;
        }
        try {
            return ZoneId.of(timezone.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Geçersiz timezone: " + timezone);
        }
    }

    private String normalizeTime(String time) {
        if (time == null || time.isBlank()) {
            throw new IllegalArgumentException("time HH:mm formatında olmalıdır.");
        }
        try {
            LocalTime parsed = LocalTime.parse(time.trim(), TIME_FORMATTER);
            return parsed.format(TIME_FORMATTER);
        } catch (Exception ex) {
            throw new IllegalArgumentException("time HH:mm formatında olmalıdır.");
        }
    }

    private LocalDateTime toUtc(LocalDate date, String time, ZoneId zone) {
        LocalTime localTime = LocalTime.parse(time, TIME_FORMATTER);
        return date.atTime(localTime).atZone(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    private MessageBundle buildMessage(ReminderType type, LocalDate date, String time, Map<String, Object> payload) {
        String categoryLabel = extractString(payload, "categoryLabel", "Gunun plani");
        String hook = plannerHook(extractString(payload, "plannerCategoryId", ""));

        return switch (type) {
            case DO -> new MessageBundle(
                    "Guru Planlayici • " + categoryLabel + " zamani",
                    hook + " " + time + " itibariyla " + categoryLabel + " alaninda hamleni yap."
            );
            case AVOID -> new MessageBundle(
                    "Guru Planlayici • " + categoryLabel + " uyarisi",
                    hook + " " + time + " sonrasi " + categoryLabel + " alaninda acele etme; temkinli ilerle."
            );
            case WINDOW_START -> new MessageBundle(
                    "Guru Planlayici • " + categoryLabel + " penceresi",
                    hook + " " + time + " itibariyla " + categoryLabel + " icin guclu bir pencere aciliyor."
            );
        };
    }

    private String writePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Reminder payload işlenemedi.");
        }
    }

    private Map<String, Object> readPayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Payload hash üretilemedi.", ex);
        }
    }

    private String clampText(String value, int maxLen) {
        if (value == null) return "";
        String source = value.trim();
        if (source.length() <= maxLen) return source;
        return source.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }

    private LocalDateTime nextSchedulableAttempt(LocalDateTime preferredUtc) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (preferredUtc == null) {
            return now;
        }
        return preferredUtc.isAfter(now) ? preferredUtc : now;
    }

    private void markSendFailure(PlannerReminder reminder, int nextAttempt, String reason) {
        reminder.setLastError(clampText(reason, 220));
        if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
            reminder.setStatus(ReminderStatus.FAILED);
            reminder.setNextAttemptUtc(LocalDateTime.now(ZoneOffset.UTC));
            log.warn("event=reminder_sent reminderId={} userId={} result=fail attempts={} reason={}",
                    reminder.getId(), reminder.getUserId(), nextAttempt, reminder.getLastError());
            return;
        }

        long retryInMinutes = 1L << (nextAttempt - 1); // 1, 2
        reminder.setStatus(ReminderStatus.SCHEDULED);
        reminder.setNextAttemptUtc(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(retryInMinutes));
        log.warn("event=reminder_retry_scheduled reminderId={} userId={} attempt={} retryInMinutes={} reason={}",
                reminder.getId(), reminder.getUserId(), nextAttempt, retryInMinutes, reminder.getLastError());
    }

    private String extractString(Map<String, Object> payload, String key, String fallback) {
        if (payload == null || key == null) return fallback;
        Object value = payload.get(key);
        if (value instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        return fallback;
    }

    private String plannerHook(String plannerCategoryId) {
        return switch ((plannerCategoryId == null ? "" : plannerCategoryId).trim()) {
            case "transit" -> "Gokyuzu akisi senin tarafinda.";
            case "moon" -> "Ay ritmi sezgini yukseltiyor.";
            case "date" -> "Flort enerjisi isiniyor.";
            case "marriage" -> "Uzun vadeli baglar bugun hassas.";
            case "partnerHarmony" -> "Iliskide uyum kurmak kolaylasiyor.";
            case "family" -> "Ev ve aile temasi one cikiyor.";
            case "jointFinance" -> "Ortak para basliklari dikkat istiyor.";
            case "beauty" -> "Bakim ve gorunum enerjisi parliyor.";
            case "health" -> "Bedenin bugun daha fazla ozen istiyor.";
            case "activity" -> "Tempo ve hareket alani aciliyor.";
            case "official" -> "Resmi islerde detaylar onem kazaniyor.";
            case "spiritual" -> "Ruhsal alan daha acik ve akista.";
            case "color" -> "Renk frekansin bugun seni destekliyor.";
            case "recommendations" -> "Gunun en iyi secimleri netlesiyor.";
            default -> "Gokyuzu ritmi seni cagiriyor.";
        };
    }

    private record MessageBundle(String title, String body) {}
}
