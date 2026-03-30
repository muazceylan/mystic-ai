package com.mysticai.notification.tutorial.controller.admin;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminSummaryResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigAdminUpsertRequest;
import com.mysticai.notification.tutorial.dto.admin.TutorialConfigBootstrapResponse;
import com.mysticai.notification.tutorial.dto.admin.TutorialContractOptionsResponse;
import com.mysticai.notification.tutorial.contract.TutorialContractCatalog;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import com.mysticai.notification.tutorial.service.TutorialConfigAdminService;
import com.mysticai.notification.tutorial.service.TutorialConfigBootstrapService;
import com.mysticai.notification.tutorial.service.TutorialConfigPublishService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/admin/v1/tutorial-configs")
@RequiredArgsConstructor
public class AdminTutorialConfigController {

    private final TutorialConfigAdminService adminService;
    private final TutorialConfigPublishService publishService;
    private final TutorialConfigBootstrapService bootstrapService;

    @GetMapping
    public ResponseEntity<Page<TutorialConfigAdminSummaryResponse>> list(
            @RequestParam(required = false) String screenKey,
            @RequestParam(required = false) TutorialConfigStatus status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) TutorialPlatform platform,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(
                adminService.findAll(
                        screenKey,
                        status,
                        isActive,
                        platform,
                        locale,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"))
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<TutorialConfigAdminResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.findById(id));
    }

    @GetMapping("/contract")
    public ResponseEntity<TutorialContractOptionsResponse> contractOptions() {
        return ResponseEntity.ok(
                TutorialContractOptionsResponse.builder()
                        .screenKeys(TutorialContractCatalog.screenKeyOptions())
                        .targetKeysByScreen(TutorialContractCatalog.targetKeyOptions())
                        .platformOptions(Arrays.asList(TutorialPlatform.values()))
                        .presentationTypeOptions(Arrays.asList(TutorialPresentationType.values()))
                        .statusOptions(Arrays.asList(TutorialConfigStatus.values()))
                        .build()
        );
    }

    @PostMapping("/bootstrap-defaults")
    public ResponseEntity<TutorialConfigBootstrapResponse> bootstrapDefaults(
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        TutorialConfigBootstrapService.BootstrapResult result = bootstrapService.seedDefaults(adminId, adminEmail, role);
        return ResponseEntity.ok(new TutorialConfigBootstrapResponse(
                result.createdCount(),
                result.skippedCount(),
                result.totalCount()
        ));
    }

    @PostMapping
    public ResponseEntity<TutorialConfigAdminResponse> create(
            @Valid @RequestBody TutorialConfigAdminUpsertRequest request,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.create(request, adminId, adminEmail, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TutorialConfigAdminResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TutorialConfigAdminUpsertRequest request,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.ok(adminService.update(id, request, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<TutorialConfigAdminResponse> publish(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.ok(publishService.publish(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<TutorialConfigAdminResponse> archive(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.ok(publishService.archive(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<TutorialConfigAdminResponse> activate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.ok(adminService.activate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<TutorialConfigAdminResponse> deactivate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role
    ) {
        return ResponseEntity.ok(adminService.deactivate(id, adminId, adminEmail, role));
    }
}
