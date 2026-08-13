package com.mysticai.astrology.service.personalplan;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.dto.daily.DailyActionsDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Optional AI rewording pass over a plan the rule-based composer has already produced.
 *
 * What the model may change: wording only. What it may not change is enforced here rather than
 * asked for in the prompt — every returned field is re-validated and, when it fails any check,
 * that single field falls back to the composer's copy. So the worst case for a hostile or
 * malfunctioning model is the rule-based plan, which is exactly what ships when the flag is off.
 *
 * Checks applied to every field:
 * <ul>
 *   <li>length bands matching the catalog's own bands, so refined copy stays renderable;</li>
 *   <li>{@link PlanQualityGuard}, so refined copy cannot reintroduce motivational filler;</li>
 *   <li>the title may not paraphrase the body's first sentence — the defect short titles exist
 *       to prevent;</li>
 *   <li>no context the product never collects (profession, employer, meeting, child, …);</li>
 *   <li>no digit that was not already in the composed text, so no invented time or amount.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PersonalPlanRefiner {

    static final String SOURCE_RULE_BASED = "rule_based";
    static final String SOURCE_AI_REFINED = "ai_refined";

    private static final int TITLE_MIN_CHARS = 12;
    private static final int TITLE_MAX_CHARS = 44;
    private static final int BODY_MIN_CHARS = 60;
    private static final int BODY_MAX_CHARS = 240;
    /** The home card is a teaser; keep its body at the size the composer produces. */
    private static final int TEASER_MAX_CHARS = 160;

    private static final String THEME = "theme";
    private static final String PRIMARY = "primary";
    private static final String CAUTION = "caution";
    private static final String TEASER = "teaser";
    private static final String AREA_PREFIX = "area-";
    private static final String CAUTION_SLOT_ID = "slot-caution";
    private static final String CAUTION_ACTION_ID = "plan-caution";

    /**
     * Normalised stems for context the product never collects. The catalog deliberately contains
     * none of these, so their appearance means the model invented a situation for the user.
     */
    private static final Set<String> FORBIDDEN_CONTEXT = Set.of(
            // Turkish
            "toplant", "isvere", "sirket", "musteri", "cocug", "cocuk", "maas", "ofis",
            "meslek", "kariye", "patron", "proje", "ekibin", "esiniz", "mudurun",
            // English
            "meetin", "employ", "compan", "client", "collea", "cowork", "salary", "office",
            "career", "child", "kids", "spouse", "team", "projec", "boss", "manager");

    private final PersonalPlanAiClient aiClient;
    private final PlanQualityGuard qualityGuard;
    private final PersonalPlanProperties properties;
    private final ObjectMapper objectMapper;

    /** One refinable slot: the composed copy plus the bound its body has to respect. */
    private record Slot(String id, String kind, String title, String body, int maxBody) {}

    private record Refined(String title, String body) {}

    /**
     * @return the payload with refined wording where it passed validation, or the payload
     *         unchanged when refinement is disabled, unavailable or entirely rejected
     */
    public DailyActionsDTO refine(DailyActionsDTO payload, String locale) {
        if (!properties.isAiRefinementEnabled() || payload == null) {
            return payload;
        }

        List<Slot> slots = collectSlots(payload);
        if (slots.isEmpty()) {
            return payload;
        }

        String raw = aiClient.refine(locale, slots.stream().map(this::toRequestItem).toList());
        if (raw == null || raw.isBlank()) {
            return payload;
        }

        Map<String, Refined> accepted = parseAndValidate(raw, slots);
        if (accepted.isEmpty()) {
            log.info("Personal plan refinement returned nothing usable; keeping rule-based copy.");
            return payload;
        }
        log.info("Personal plan refinement applied to {}/{} slots.", accepted.size(), slots.size());
        return apply(payload, accepted);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Slot collection
    // ─────────────────────────────────────────────────────────────────────────

    private List<Slot> collectSlots(DailyActionsDTO payload) {
        List<Slot> slots = new ArrayList<>();
        if (payload.mainTheme() != null) {
            slots.add(new Slot(THEME, "THEME",
                    payload.mainTheme().title(), payload.mainTheme().description(), BODY_MAX_CHARS));
        }
        if (payload.primaryAction() != null) {
            slots.add(new Slot(PRIMARY, "ACTION",
                    payload.primaryAction().title(), payload.primaryAction().description(), BODY_MAX_CHARS));
        }
        if (payload.lifeAreaCards() != null) {
            for (int index = 0; index < payload.lifeAreaCards().size(); index++) {
                DailyActionsDTO.LifeAreaCard card = payload.lifeAreaCards().get(index);
                slots.add(new Slot(AREA_PREFIX + index, "ACTION",
                        card.title(), card.description(), BODY_MAX_CHARS));
            }
        }
        if (payload.caution() != null) {
            slots.add(new Slot(CAUTION, "CAUTION",
                    payload.caution().title(), payload.caution().description(), BODY_MAX_CHARS));
        }
        if (payload.homeTeaser() != null) {
            slots.add(new Slot(TEASER, "ACTION",
                    payload.homeTeaser().headline(), payload.homeTeaser().body(), TEASER_MAX_CHARS));
        }
        return slots.stream().filter(slot -> notBlank(slot.title()) && notBlank(slot.body())).toList();
    }

    private Map<String, String> toRequestItem(Slot slot) {
        Map<String, String> item = new LinkedHashMap<>();
        item.put("id", slot.id());
        item.put("kind", slot.kind());
        item.put("title", slot.title());
        item.put("body", slot.body());
        return item;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Refined> parseAndValidate(String raw, List<Slot> slots) {
        Map<String, Slot> slotsById = new LinkedHashMap<>();
        slots.forEach(slot -> slotsById.put(slot.id(), slot));

        JsonNode items;
        try {
            items = objectMapper.readTree(raw).path("items");
        } catch (Exception e) {
            log.warn("Personal plan refinement response was not parseable JSON; keeping rule-based copy.");
            return Map.of();
        }
        if (!items.isArray()) {
            return Map.of();
        }

        Map<String, Refined> accepted = new LinkedHashMap<>();
        for (JsonNode item : items) {
            String id = item.path("id").asText(null);
            Slot slot = id == null ? null : slotsById.get(id);
            if (slot == null) {
                continue;
            }
            String title = trimmed(item.path("title").asText(null));
            String body = ensureSentence(trimmed(item.path("body").asText(null)));

            String rejection = rejectionReason(slot, title, body);
            if (rejection != null) {
                log.debug("Refined slot {} rejected: {}", id, rejection);
                continue;
            }
            accepted.put(id, new Refined(title, body));
        }
        return accepted;
    }

    /** @return null when the refined pair is safe to show, otherwise a short reason for logs */
    private String rejectionReason(Slot slot, String title, String body) {
        if (!notBlank(title) || !notBlank(body)) {
            return "empty";
        }
        if (title.length() < TITLE_MIN_CHARS || title.length() > TITLE_MAX_CHARS) {
            return "title_length";
        }
        if (body.length() < BODY_MIN_CHARS || body.length() > slot.maxBody()) {
            return "body_length";
        }
        if (qualityGuard.rejectionReason(title, true) != null) {
            return "title_quality";
        }
        if (qualityGuard.rejectionReason(body) != null) {
            return "body_quality";
        }
        if (qualityGuard.isDuplicate(title, firstSentence(body))) {
            return "title_repeats_body";
        }
        if (containsForbiddenContext(title) || containsForbiddenContext(body)) {
            return "invented_context";
        }
        if (addsDigits(slot.title() + " " + slot.body(), title + " " + body)) {
            return "invented_number";
        }
        return null;
    }

    private boolean containsForbiddenContext(String text) {
        String normalized = qualityGuard.normalize(text);
        for (String token : normalized.split(" ")) {
            if (token.length() < 3) {
                continue;
            }
            String stem = token.length() > 6 ? token.substring(0, 6) : token;
            if (FORBIDDEN_CONTEXT.contains(stem) || FORBIDDEN_CONTEXT.contains(token)) {
                return true;
            }
        }
        return false;
    }

    /** A digit absent from the composed copy means an invented time, amount or count. */
    private boolean addsDigits(String original, String refined) {
        Set<Character> allowed = original.chars()
                .filter(Character::isDigit)
                .mapToObj(value -> (char) value)
                .collect(java.util.stream.Collectors.toSet());
        return refined.chars().filter(Character::isDigit)
                .anyMatch(value -> !allowed.contains((char) value));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Rebuild
    // ─────────────────────────────────────────────────────────────────────────

    private DailyActionsDTO apply(DailyActionsDTO payload, Map<String, Refined> accepted) {
        DailyActionsDTO.MainTheme theme = payload.mainTheme();
        if (theme != null && accepted.containsKey(THEME)) {
            Refined refined = accepted.get(THEME);
            theme = new DailyActionsDTO.MainTheme(
                    refined.title(), refined.body(), theme.why(), theme.astrologicalBasis());
        }

        DailyActionsDTO.PrimaryAction primary = payload.primaryAction();
        if (primary != null && accepted.containsKey(PRIMARY)) {
            Refined refined = accepted.get(PRIMARY);
            primary = new DailyActionsDTO.PrimaryAction(
                    primary.id(), primary.category(), primary.categoryLabel(),
                    refined.title(), refined.body(), primary.timeWindow(), primary.why(),
                    primary.isDone(), primary.doneAt(), primary.relatedTransitIds());
        }

        List<DailyActionsDTO.LifeAreaCard> cards = payload.lifeAreaCards();
        if (cards != null) {
            List<DailyActionsDTO.LifeAreaCard> rebuilt = new ArrayList<>(cards.size());
            for (int index = 0; index < cards.size(); index++) {
                DailyActionsDTO.LifeAreaCard card = cards.get(index);
                Refined refined = accepted.get(AREA_PREFIX + index);
                rebuilt.add(refined == null ? card : new DailyActionsDTO.LifeAreaCard(
                        card.id(), card.category(), card.categoryLabel(),
                        refined.title(), refined.body(), card.why(), card.isDone(), card.doneAt()));
            }
            cards = List.copyOf(rebuilt);
        }

        DailyActionsDTO.Caution caution = payload.caution();
        if (caution != null && accepted.containsKey(CAUTION)) {
            Refined refined = accepted.get(CAUTION);
            caution = new DailyActionsDTO.Caution(
                    refined.title(), refined.body(), caution.timeWindow(), caution.why());
        }

        DailyActionsDTO.HomeTeaser teaser = payload.homeTeaser();
        if (teaser != null) {
            Refined refined = accepted.get(TEASER);
            // The headline mirrors the theme title, so it follows whichever of the two was accepted.
            String headline = theme != null ? theme.title() : teaser.headline();
            teaser = new DailyActionsDTO.HomeTeaser(
                    headline, refined == null ? teaser.body() : refined.body());
        }

        DailyActionsDTO.PlanMeta meta = payload.meta();
        if (meta != null) {
            meta = new DailyActionsDTO.PlanMeta(
                    meta.planVersion(), meta.generatedAt(), meta.generationNumber(),
                    meta.canRegenerate(), SOURCE_AI_REFINED, meta.degradedReason());
        }

        return new DailyActionsDTO(
                payload.date(),
                theme == null ? payload.header()
                        : new DailyActionsDTO.Header(theme.title(), theme.description()),
                rebuildLegacyActions(payload.actions(), primary, cards, caution),
                rebuildMiniPlan(payload.miniPlan(), primary, cards),
                teaser,
                payload.personalizationLevel(),
                payload.profileSignalsUsed(),
                theme,
                primary,
                rebuildTimeline(payload.timeline(), caution),
                cards,
                caution,
                payload.eveningReflection(),
                meta);
    }

    /** v1 clients read {@code actions}; keep it consistent with the refined v2 sections. */
    private List<DailyActionsDTO.ActionItem> rebuildLegacyActions(
            List<DailyActionsDTO.ActionItem> actions,
            DailyActionsDTO.PrimaryAction primary,
            List<DailyActionsDTO.LifeAreaCard> cards,
            DailyActionsDTO.Caution caution) {
        if (actions == null) {
            return null;
        }
        Map<String, String[]> byId = new LinkedHashMap<>();
        if (primary != null) {
            byId.put(primary.id(), new String[]{primary.title(), primary.description()});
        }
        if (cards != null) {
            cards.forEach(card -> byId.put(card.id(), new String[]{card.title(), card.description()}));
        }
        if (caution != null) {
            byId.put(CAUTION_ACTION_ID, new String[]{caution.title(), caution.description()});
        }

        return actions.stream().map(item -> {
            String[] copy = byId.get(item.id());
            return copy == null ? item : new DailyActionsDTO.ActionItem(
                    item.id(), copy[0], copy[1], item.icon(), item.tag(), item.etaMin(),
                    item.isDone(), item.doneAt(), item.relatedTransitIds());
        }).toList();
    }

    private DailyActionsDTO.MiniPlan rebuildMiniPlan(
            DailyActionsDTO.MiniPlan miniPlan,
            DailyActionsDTO.PrimaryAction primary,
            List<DailyActionsDTO.LifeAreaCard> cards) {
        if (miniPlan == null) {
            return null;
        }
        List<String> steps = new ArrayList<>();
        if (primary != null) {
            steps.add(primary.title());
        }
        if (cards != null) {
            cards.forEach(card -> steps.add(card.title()));
        }
        return steps.isEmpty() ? miniPlan : new DailyActionsDTO.MiniPlan(miniPlan.title(), List.copyOf(steps));
    }

    /** The caution timeline slot is a copy of the caution card, so it follows the refined text. */
    private List<DailyActionsDTO.TimeSlot> rebuildTimeline(
            List<DailyActionsDTO.TimeSlot> timeline, DailyActionsDTO.Caution caution) {
        if (timeline == null || caution == null) {
            return timeline;
        }
        return timeline.stream()
                .map(slot -> CAUTION_SLOT_ID.equals(slot.id())
                        ? new DailyActionsDTO.TimeSlot(slot.id(), slot.label(), slot.startTime(),
                                slot.endTime(), caution.title(), caution.description())
                        : slot)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static String firstSentence(String text) {
        return text.split("(?<=[.!?])\\s", 2)[0];
    }

    private static String ensureSentence(String text) {
        if (!notBlank(text)) {
            return text;
        }
        String trimmed = text.trim();
        return trimmed.matches(".*[.!?]$") ? trimmed : trimmed + ".";
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
