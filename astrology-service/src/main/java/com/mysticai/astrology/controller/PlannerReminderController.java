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
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ReminderCreateRequest request
    ) {
        ReminderResponse response = plannerReminderService.createReminder(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> listReminders(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(plannerReminderService.listReminders(userId, from, to));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ReminderResponse> patchReminder(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable("id") Long reminderId,
            @Valid @RequestBody ReminderUpdateRequest request
    ) {
        return ResponseEntity.ok(plannerReminderService.updateReminder(userId, reminderId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReminder(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable("id") Long reminderId
    ) {
        plannerReminderService.deleteReminder(userId, reminderId);
        return ResponseEntity.noContent().build();
    }
}
