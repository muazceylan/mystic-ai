package com.mysticai.notification.admin.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.admin.spec.AuditLogSpec;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(Long adminId, String adminEmail, AdminUser.Role role,
                    AuditLog.ActionType action, AuditLog.EntityType entityType,
                    String entityId, String entityDisplay,
                    Object oldValue, Object newValue) {
        try {
            AuditLog entry = AuditLog.builder()
                    .actorAdminId(adminId)
                    .actorEmail(adminEmail)
                    .actorRole(role)
                    .actionType(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityDisplay(entityDisplay)
                    .oldValueJson(oldValue != null ? objectMapper.writeValueAsString(oldValue) : null)
                    .newValueJson(newValue != null ? objectMapper.writeValueAsString(newValue) : null)
                    .build();
            auditLogRepository.save(entry);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize audit log values: {}", e.getMessage());
        }
    }

    public Page<AuditLog> findWithFilters(Long actorId, AuditLog.ActionType actionType,
                                          AuditLog.EntityType entityType,
                                          LocalDateTime from, LocalDateTime to,
                                          Pageable pageable) {
        return auditLogRepository.findAll(AuditLogSpec.filter(actorId, actionType, entityType, from, to), pageable);
    }

    public List<AuditLog> findRecent10() {
        return auditLogRepository.findTop10ByOrderByCreatedAtDesc();
    }
}
