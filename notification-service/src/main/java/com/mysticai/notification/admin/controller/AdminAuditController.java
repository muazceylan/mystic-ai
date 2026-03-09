package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AuditLog;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/v1/audit-logs")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> list(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) AuditLog.ActionType actionType,
            @RequestParam(required = false) AuditLog.EntityType entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(auditLogService.findWithFilters(actorId, actionType, entityType, from, to,
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }
}
