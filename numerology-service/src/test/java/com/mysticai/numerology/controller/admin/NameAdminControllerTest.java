package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.ingestion.dto.admin.AdminNameCanonicalInfoDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameDetailDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameListItemDto;
import com.mysticai.numerology.ingestion.dto.admin.AdminNameUpdateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameAliasDto;
import com.mysticai.numerology.ingestion.dto.admin.NameTagCreateRequest;
import com.mysticai.numerology.ingestion.dto.admin.NameTagDto;
import com.mysticai.numerology.ingestion.model.AliasType;
import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.service.NameAdminCommandService;
import com.mysticai.numerology.ingestion.service.NameAdminQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NameAdminControllerTest {

    @Mock
    private NameAdminQueryService queryService;

    @Mock
    private NameAdminCommandService commandService;

    @InjectMocks
    private NameAdminController controller;

    @Test
    void listNames_forwardsFiltersAndPagination() {
        Page<AdminNameListItemDto> expected = new PageImpl<>(List.of(new AdminNameListItemDto(
                11L,
                "Ali",
                "ali",
                ParsedGender.MALE,
                "Arapça",
                "Yüce",
                NameStatus.ACTIVE,
                Boolean.FALSE,
                86,
                List.of("Liderlik"),
                true,
                2,
                LocalDateTime.now(),
                LocalDateTime.now()
        )));

        when(queryService.listNames("ali", NameStatus.ACTIVE, ParsedGender.MALE, "arap", true, true, 2, 30))
                .thenReturn(expected);

        ResponseEntity<Page<AdminNameListItemDto>> response = controller.listNames(
                "ali",
                "active",
                "male",
                "arap",
                true,
                true,
                2,
                30
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().getContent().size());
        verify(queryService).listNames("ali", NameStatus.ACTIVE, ParsedGender.MALE, "arap", true, true, 2, 30);
    }

    @Test
    void searchEndpoint_reusesListFlow() {
        when(queryService.listNames("azra", null, null, null, null, null, 0, 25)).thenReturn(Page.empty());

        ResponseEntity<Page<AdminNameListItemDto>> response = controller.search(
                "azra",
                null,
                null,
                null,
                null,
                null,
                0,
                25
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(0, response.getBody().getTotalElements());
        verify(queryService).listNames("azra", null, null, null, null, null, 0, 25);
    }

    @Test
    void getName_returnsDetailResponse() {
        AdminNameDetailDto detail = new AdminNameDetailDto(
                45L,
                "Ayşe",
                "ayşe",
                ParsedGender.FEMALE,
                "Türkçe",
                "Yaşayan",
                "Uzun açıklama",
                "Nazik, sezgisel",
                "A güçlü",
                Boolean.TRUE,
                NameStatus.ACTIVE,
                91,
                List.of("Nazik"),
                new AdminNameCanonicalInfoDto(45L, "Ayşe", "ayşe"),
                List.of(),
                List.of(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(queryService.getName(45L)).thenReturn(detail);

        ResponseEntity<AdminNameDetailDto> response = controller.getName(45L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(45L, response.getBody().id());
        verify(queryService).getName(45L);
    }

    @Test
    void updateName_forwardsPayloadAndHeader() {
        AdminNameUpdateRequest request = new AdminNameUpdateRequest(
                "Elif Nur",
                ParsedGender.FEMALE,
                "Türkçe",
                "Kısa",
                "Uzun",
                "Nazik",
                "Analiz",
                Boolean.FALSE,
                NameStatus.HIDDEN
        );

        AdminNameDetailDto detail = new AdminNameDetailDto(
                9L,
                "Elif Nur",
                "elif nur",
                ParsedGender.FEMALE,
                "Türkçe",
                "Kısa",
                "Uzun",
                "Nazik",
                "Analiz",
                Boolean.FALSE,
                NameStatus.HIDDEN,
                77,
                List.of("Nazik"),
                new AdminNameCanonicalInfoDto(9L, "Elif Nur", "elif nur"),
                List.of(),
                List.of(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(commandService.updateName(9L, request, "admin@mystic.ai")).thenReturn(detail);

        ResponseEntity<AdminNameDetailDto> response = controller.updateName(9L, request, "admin@mystic.ai");

        assertEquals(200, response.getStatusCode().value());
        assertEquals(NameStatus.HIDDEN, response.getBody().status());
        verify(commandService).updateName(9L, request, "admin@mystic.ai");
    }

    @Test
    void tagEndpoints_forwardToCommandService() {
        NameTagDto tag = new NameTagDto(
                21L,
                4L,
                NameTagGroup.VIBE,
                "Lider",
                "lider",
                NameTagSource.MANUAL,
                BigDecimal.ONE,
                "manual override",
                null,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(commandService.listTags(4L)).thenReturn(List.of(tag));
        when(commandService.addTag(any(), any(), any())).thenReturn(tag);

        ResponseEntity<List<NameTagDto>> listResponse = controller.listTags(4L);
        ResponseEntity<NameTagDto> addResponse = controller.addTag(
                4L,
                new NameTagCreateRequest("VIBE", "strong", "manual", BigDecimal.ONE, "manual override"),
                "admin@mystic.ai"
        );
        ResponseEntity<Void> deleteResponse = controller.deleteTag(4L, 21L, "admin@mystic.ai");

        assertEquals(1, listResponse.getBody().size());
        assertEquals("Lider", addResponse.getBody().tagValue());
        assertEquals(204, deleteResponse.getStatusCode().value());

        verify(commandService).listTags(4L);
        verify(commandService).addTag(4L, new NameTagCreateRequest("VIBE", "strong", "manual", BigDecimal.ONE, "manual override"), "admin@mystic.ai");
        verify(commandService).deleteTag(4L, 21L, "admin@mystic.ai");
    }

    @Test
    void aliasEndpoints_forwardToCommandService() {
        NameAliasDto alias = new NameAliasDto(
                33L,
                5L,
                "Muhammed",
                "muhammed",
                "Mohammed",
                "mohammed",
                AliasType.TRANSLITERATION,
                BigDecimal.valueOf(0.96),
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(commandService.listAliases(5L, 0, 25)).thenReturn(new PageImpl<>(List.of(alias)));
        when(commandService.addAlias(any(), any(), any())).thenReturn(alias);

        ResponseEntity<Page<NameAliasDto>> listResponse = controller.listAliases(5L, 0, 25);
        ResponseEntity<NameAliasDto> addResponse = controller.addAlias(
                5L,
                new NameAliasCreateRequest("Mohammed", "TRANSLITERATION", BigDecimal.valueOf(0.96)),
                "admin@mystic.ai"
        );
        ResponseEntity<Void> deleteResponse = controller.deleteAlias(5L, 33L, "admin@mystic.ai");

        assertEquals(1, listResponse.getBody().getTotalElements());
        assertEquals("Mohammed", addResponse.getBody().aliasName());
        assertEquals(204, deleteResponse.getStatusCode().value());

        verify(commandService).listAliases(5L, 0, 25);
        verify(commandService).addAlias(
                5L,
                new NameAliasCreateRequest("Mohammed", "TRANSLITERATION", BigDecimal.valueOf(0.96)),
                "admin@mystic.ai"
        );
        verify(commandService).deleteAlias(5L, 33L, "admin@mystic.ai");
    }
}
