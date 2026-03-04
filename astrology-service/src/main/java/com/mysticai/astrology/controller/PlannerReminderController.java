package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.reminder.ReminderCreateRequest;
import com.mysticai.astrology.dto.reminder.ReminderResponse;
import com.mysticai.astrology.dto.reminder.ReminderUpdateRequest;
import com.mysticai.astrology.service.PlannerReminderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reminders")
@RequiredArgsConstructor
public class PlannerReminderController {

    private final PlannerReminderService plannerReminderService;

    @PostMapping
    public ResponseEntity<ReminderResponse> createReminder(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @Valid @RequestBody ReminderCreateRequest request
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        ReminderResponse response = plannerReminderService.createReminder(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> listReminders(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(plannerReminderService.listReminders(userId, from, to));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ReminderResponse> patchReminder(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @PathVariable("id") Long reminderId,
            @Valid @RequestBody ReminderUpdateRequest request
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        return ResponseEntity.ok(plannerReminderService.updateReminder(userId, reminderId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReminder(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(value = "userId", required = false) String queryUserId,
            @PathVariable("id") Long reminderId
    ) {
        Long userId = resolveUserId(headerUserId, queryUserId);
        plannerReminderService.deleteReminder(userId, reminderId);
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId(String headerUserId, String queryUserId) {
        Long parsedHeader = parsePositiveLong(headerUserId);
        if (parsedHeader != null) {
            return parsedHeader;
        }
        Long parsedQuery = parsePositiveLong(queryUserId);
        if (parsedQuery != null) {
            return parsedQuery;
        }
        throw new IllegalArgumentException("Kullanıcı doğrulaması bulunamadı.");
    }

    private Long parsePositiveLong(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(raw.trim());
            return value > 0 ? value : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
