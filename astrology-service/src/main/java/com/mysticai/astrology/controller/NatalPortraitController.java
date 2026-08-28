package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.service.natal.NatalPortraitService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Read surface for the redesigned Haritam experience.
 *
 * <p>Sits under the existing {@code /api/v1/astrology/**} gateway route, so no routing change is
 * needed and the mobile client keeps using one base path for the whole astrology domain.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/astrology/natal-portrait")
@RequiredArgsConstructor
public class NatalPortraitController {

    private final NatalPortraitService natalPortraitService;

    public record PortraitResponse(
            NatalPortrait portrait,
            /** True when served from cache — lets the client skip its "generating" state. */
            boolean cached
    ) {}

    public record AskRequest(
            @NotBlank @Size(max = 300) String question,
            String locale
    ) {}

    public record AskResponse(
            String answer,
            /** False when the chart genuinely cannot answer the question. */
            boolean answerable,
            List<NatalPortrait.Evidence> evidence
    ) {}

    /**
     * The user's portrait. Generates and caches on first call for a given chart + locale,
     * then serves from cache until the birth data, contract version or locale changes.
     */
    @GetMapping
    public ResponseEntity<PortraitResponse> getPortrait(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(value = "locale", required = false) String locale) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            NatalPortraitService.PortraitResult result =
                    natalPortraitService.getPortrait(String.valueOf(userId), locale, false);
            return ResponseEntity.ok(new PortraitResponse(result.portrait(), result.fromCache()));
        } catch (IllegalStateException e) {
            // No chart yet — the client shows the "add your birth details" path, not an error.
            log.info("Natal portrait requested before chart exists for user {}", userId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /** Forces a fresh generation. Used by the "regenerate" affordance and by admin support flows. */
    @PostMapping("/regenerate")
    public ResponseEntity<PortraitResponse> regenerate(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(value = "locale", required = false) String locale) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        NatalPortraitService.PortraitResult result =
                natalPortraitService.getPortrait(String.valueOf(userId), locale, true);
        return ResponseEntity.ok(new PortraitResponse(result.portrait(), false));
    }

    /**
     * The factual chart context behind the interpretation.
     *
     * <p>Exposed so "Haritamı Öğren" can teach a placement using the reader's own chart without
     * the client re-deriving rulers, dominants and aspect tone from the raw chart payload.</p>
     */
    @GetMapping("/context")
    public ResponseEntity<NormalizedNatalChart> getContext(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(value = "locale", required = false) String locale) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            return ResponseEntity.ok(
                    natalPortraitService.getNormalizedChart(String.valueOf(userId), locale));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /** "Haritama Sor" — a question answered from this user's chart, or declined. */
    @PostMapping("/ask")
    public ResponseEntity<AskResponse> ask(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody AskRequest request) {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            NatalPortraitService.AskResult result = natalPortraitService.ask(
                    String.valueOf(userId), request.locale(), request.question());
            return ResponseEntity.ok(
                    new AskResponse(result.answer(), result.answerable(), result.evidence()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
