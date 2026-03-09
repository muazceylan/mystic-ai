package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameListItemDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameUpdateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.service.NameAdminCommandService;
import com.mysticai.numerology.ingestion.service.NameAdminQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/names")
@RequiredArgsConstructor
public class NameAdminController {

    private final NameAdminQueryService nameAdminQueryService;
    private final NameAdminCommandService nameAdminCommandService;

    @GetMapping
    public ResponseEntity<Page<AdminNameListItemDto>> listNames(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) Boolean hasTags,
            @RequestParam(required = false) Boolean hasAliases,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        NameStatus parsedStatus = parseStatus(status);
        ParsedGender parsedGender = parseGender(gender);
        return ResponseEntity.ok(nameAdminQueryService.listNames(
                q,
                parsedStatus,
                parsedGender,
                origin,
                hasTags,
                hasAliases,
                page,
                size
        ));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<AdminNameListItemDto>> search(
            @RequestParam String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) Boolean hasTags,
            @RequestParam(required = false) Boolean hasAliases,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return listNames(q, status, gender, origin, hasTags, hasAliases, page, size);
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<AdminNameDetailDto> getName(@PathVariable Long id) {
        return ResponseEntity.ok(nameAdminQueryService.getName(id));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<AdminNameDetailDto> updateName(
            @PathVariable Long id,
            @RequestBody AdminNameUpdateRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(nameAdminCommandService.updateName(id, request, actedBy));
    }

    @GetMapping("/{id:\\d+}/tags")
    public ResponseEntity<List<NameTagDto>> listTags(@PathVariable Long id) {
        return ResponseEntity.ok(nameAdminCommandService.listTags(id));
    }

    @PostMapping("/{id:\\d+}/tags")
    public ResponseEntity<NameTagDto> addTag(
            @PathVariable Long id,
            @RequestBody NameTagCreateRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(nameAdminCommandService.addTag(id, request, actedBy));
    }

    @DeleteMapping("/{id:\\d+}/tags/{tagId:\\d+}")
    public ResponseEntity<Void> deleteTag(
            @PathVariable Long id,
            @PathVariable Long tagId,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        nameAdminCommandService.deleteTag(id, tagId, actedBy);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id:\\d+}/aliases")
    public ResponseEntity<Page<NameAliasDto>> listAliases(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return ResponseEntity.ok(nameAdminCommandService.listAliases(id, page, size));
    }

    @PostMapping("/{id:\\d+}/aliases")
    public ResponseEntity<NameAliasDto> addAlias(
            @PathVariable Long id,
            @RequestBody NameAliasCreateRequest request,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        return ResponseEntity.ok(nameAdminCommandService.addAlias(id, request, actedBy));
    }

    @DeleteMapping("/{id:\\d+}/aliases/{aliasId:\\d+}")
    public ResponseEntity<Void> deleteAlias(
            @PathVariable Long id,
            @PathVariable Long aliasId,
            @RequestHeader(name = "X-Admin-Email", required = false) String actedBy
    ) {
        nameAdminCommandService.deleteAlias(id, aliasId, actedBy);
        return ResponseEntity.noContent().build();
    }

    private NameStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return NameStatus.valueOf(status.trim().toUpperCase());
    }

    private ParsedGender parseGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return null;
        }
        return ParsedGender.valueOf(gender.trim().toUpperCase());
    }
}
