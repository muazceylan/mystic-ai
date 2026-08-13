package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Structural guarantees for the copy catalog, plus a printed coverage report so a reviewer can
 * see the distribution without reading 800 lines of Java.
 */
class PersonalPlanCatalogCoverageTest {

    private final PersonalPlanCatalog catalog = new PersonalPlanCatalog();
    private final PersonalPlanProperties properties = new PersonalPlanProperties();
    private final PlanQualityGuard guard = new PlanQualityGuard(properties);

    /** Advice bodies below this are almost certainly filler; above it, unreadable on mobile. */
    private static final int MIN_BODY_CHARS = 60;
    private static final int MAX_BODY_CHARS = 240;

    /** Card headings have to read as labels, not as the advice sentence repeated. */
    private static final int MIN_TITLE_CHARS = 12;
    private static final int MAX_TITLE_CHARS = 44;

    @Test
    @DisplayName("coverage report")
    void printCoverageReport() {
        List<PersonalPlanCatalog.CatalogEntry> actions = catalog.allActionEntries();
        List<PersonalPlanCatalog.CatalogEntry> cautions = catalog.allCautionEntries();

        StringBuilder report = new StringBuilder("\n=== PersonalPlanCatalog coverage ===\n");
        report.append("total action variants : ").append(actions.size()).append('\n');
        report.append("total caution variants: ").append(cautions.size()).append('\n');
        report.append("distinct semantic keys: ")
                .append(actions.stream().map(PersonalPlanCatalog.CatalogEntry::semanticKey).distinct().count())
                .append('\n');

        report.append("\nper life area (supportive/caution/total):\n");
        for (LifeArea area : LifeArea.values()) {
            long supportive = countBucket(actions, area, PersonalPlanCatalog.Tone.SUPPORTIVE);
            long caution = countBucket(actions, area, PersonalPlanCatalog.Tone.CAUTION);
            report.append(String.format("  %-20s %2d / %2d / %2d%n",
                    area.slug(), supportive, caution, supportive + caution));
        }

        report.append("\nper planet role:\n");
        Map<PlanetRole, Long> byRole = actions.stream()
                .collect(Collectors.groupingBy(PersonalPlanCatalog.CatalogEntry::role,
                        TreeMap::new, Collectors.counting()));
        byRole.forEach((role, count) -> report.append(String.format("  %-8s %d%n", role, count)));

        report.append("\nper audience:\n");
        Map<PlanVariant.Audience, Long> byAudience = actions.stream()
                .collect(Collectors.groupingBy(PersonalPlanCatalog.CatalogEntry::audience,
                        TreeMap::new, Collectors.counting()));
        byAudience.forEach((audience, count) -> report.append(String.format("  %-10s %d%n", audience, count)));

        report.append("\nhouse coverage (houses mapping to an area with content):\n");
        for (int house = 1; house <= 12; house++) {
            LifeArea area = LifeArea.fromHouse(String.valueOf(house));
            long total = countBucket(actions, area, PersonalPlanCatalog.Tone.SUPPORTIVE)
                    + countBucket(actions, area, PersonalPlanCatalog.Tone.CAUTION);
            report.append(String.format("  house %-2d -> %-20s %d variants%n", house, area.slug(), total));
        }

        report.append("\nworst-case days before catalog exhaustion (single life area, single tone):\n");
        report.append("  ").append(worstCaseDays(actions)).append(" days\n");
        System.out.println(report);

        assertThat(actions).isNotEmpty();
    }

    @Test
    @DisplayName("every variant declares a semanticKey and an actionIntent")
    void everyVariantHasCanonicalFields() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            assertThat(entry.semanticKey())
                    .as("semanticKey missing for %s", entry.actionIntent())
                    .isNotBlank()
                    .matches("[A-Z][A-Z0-9_]*");
            assertThat(entry.actionIntent())
                    .as("actionIntent missing for %s", entry.semanticKey())
                    .isNotBlank()
                    .matches("[a-z][a-z0-9_]*");
            assertThat(entry.lifeArea()).isNotNull();
            assertThat(entry.tone()).isNotNull();
            assertThat(entry.audience()).isNotNull();
            assertThat(entry.role()).isNotNull();
        }
    }

    @Test
    @DisplayName("a semanticKey may not repeat inside one life-area/tone bucket")
    void semanticKeysAreUniqueWithinABucket() {
        Map<String, List<String>> bucketKeys = new LinkedHashMap<>();
        for (PersonalPlanCatalog.CatalogEntry entry : catalog.allActionEntries()) {
            bucketKeys.computeIfAbsent(entry.lifeArea() + "|" + entry.tone(), key -> new java.util.ArrayList<>())
                    .add(entry.semanticKey());
        }

        bucketKeys.forEach((bucket, keys) -> assertThat(keys)
                .as("bucket %s has a duplicate semanticKey — the pool would silently shrink", bucket)
                .doesNotHaveDuplicates());
    }

    @Test
    @DisplayName("actionIntent is globally unique, so plan ids never collide")
    void actionIntentsAreGloballyUnique() {
        List<String> intents = allEntries().stream()
                .map(PersonalPlanCatalog.CatalogEntry::actionIntent)
                .toList();
        assertThat(intents).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("cross-area semanticKey sharing exists — that is what makes dedupe meaningful")
    void semanticKeysAreSharedAcrossAreasWhereMeaningMatches() {
        Map<String, Long> areasPerKey = catalog.allActionEntries().stream()
                .collect(Collectors.groupingBy(
                        PersonalPlanCatalog.CatalogEntry::semanticKey,
                        Collectors.mapping(e -> e.lifeArea().slug(), Collectors.collectingAndThen(
                                Collectors.toSet(), set -> (long) set.size()))));

        long shared = areasPerKey.values().stream().filter(count -> count > 1).count();
        assertThat(shared)
                .as("no semanticKey spans two life areas; cross-area duplicates would go undetected")
                .isGreaterThan(0);
    }

    @Test
    @DisplayName("no variant contains banned filler, and lengths stay in a readable band")
    void copyQualityHolds() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            for (String text : List.of(entry.variant().turkish(), entry.variant().english())) {
                assertThat(guard.rejectionReason(text))
                        .as("%s/%s copy rejected: %s", entry.lifeArea(), entry.actionIntent(), text)
                        .isNull();
                assertThat(text.length())
                        .as("%s/%s length out of band: %s", entry.lifeArea(), entry.actionIntent(), text)
                        .isBetween(MIN_BODY_CHARS, MAX_BODY_CHARS);
            }
        }
    }

    @Test
    @DisplayName("every variant carries a short heading in both languages")
    void everyVariantHasAShortTitle() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            for (boolean english : List.of(false, true)) {
                String title = entry.title(english);
                assertThat(title)
                        .as("%s title missing for %s", english ? "EN" : "TR", entry.actionIntent())
                        .isNotBlank();
                assertThat(title.length())
                        .as("%s/%s title length out of band: %s", entry.lifeArea(), entry.actionIntent(), title)
                        .isBetween(MIN_TITLE_CHARS, MAX_TITLE_CHARS);
                assertThat(guard.rejectionReason(title, true))
                        .as("%s/%s title rejected: %s", entry.lifeArea(), entry.actionIntent(), title)
                        .isNull();
            }
            assertThat(entry.variant().titleTr())
                    .as("TR and EN titles identical for %s", entry.actionIntent())
                    .isNotEqualTo(entry.variant().titleEn());
        }
    }

    /**
     * The card renders heading and body together, so a heading that restates any sentence of the
     * body prints that sentence twice — the defect these titles exist to prevent. Checking every
     * sentence matters: a heading that duplicates the body's closing line is just as visible on
     * the card as one that duplicates its opening line.
     */
    @Test
    @DisplayName("a title never restates any sentence of its body")
    void titlesAreNotTheBodyRepeated() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            for (boolean english : List.of(false, true)) {
                String title = entry.title(english);
                String body = entry.text(english);

                for (String sentence : body.split("(?<=[.!?])\\s+")) {
                    if (sentence.isBlank()) {
                        continue;
                    }
                    assertThat(guard.normalize(title))
                            .as("%s heading repeats a body sentence: %s", entry.actionIntent(), title)
                            .isNotEqualTo(guard.normalize(sentence));
                    assertThat(guard.isDuplicate(title, sentence))
                            .as("%s heading reads as a paraphrase of a body sentence: %s",
                                    entry.actionIntent(), title)
                            .isFalse();
                }
                assertThat(title.length())
                        .as("%s heading is not shorter than its body", entry.actionIntent())
                        .isLessThan(body.length());
            }
        }
    }

    @Test
    @DisplayName("both languages are present for every variant")
    void bothLocalesArePopulated() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            assertThat(entry.variant().turkish()).as("TR missing for %s", entry.actionIntent()).isNotBlank();
            assertThat(entry.variant().english()).as("EN missing for %s", entry.actionIntent()).isNotBlank();
            assertThat(entry.variant().turkish()).isNotEqualTo(entry.variant().english());
        }
    }

    @Test
    @DisplayName("every life area has enough grounded variants to survive the history window")
    void noLifeAreaCanExhaustWithinTheHistoryWindow() {
        // The composer may alternate supportive/caution tone for the same chart-backed area.
        // Together those pools must cover the full configured history window without reuse.
        for (LifeArea area : LifeArea.values()) {
            long count = countBucket(catalog.allActionEntries(), area, PersonalPlanCatalog.Tone.SUPPORTIVE)
                    + countBucket(catalog.allActionEntries(), area, PersonalPlanCatalog.Tone.CAUTION);
            assertThat(count)
                    .as("%s has only %d variants for a %d-day history window",
                            area.slug(), count, properties.getHistoryDays())
                    .isGreaterThan(properties.getHistoryDays());
        }
    }

    @Test
    @DisplayName("every house maps to an area that actually has content")
    void everyHouseHasUsableContent() {
        for (int house = 1; house <= 12; house++) {
            LifeArea area = LifeArea.fromHouse(String.valueOf(house));
            assertThat(area).as("house %d maps to no life area", house).isNotNull();
            assertThat(countBucket(catalog.allActionEntries(), area, PersonalPlanCatalog.Tone.SUPPORTIVE))
                    .as("house %d -> %s has no supportive copy", house, area).isPositive();
            assertThat(countBucket(catalog.allActionEntries(), area, PersonalPlanCatalog.Tone.CAUTION))
                    .as("house %d -> %s has no caution copy", house, area).isPositive();
            assertThat(catalog.cautionCandidates(area))
                    .as("house %d -> %s has no caution card", house, area).isNotEmpty();
            assertThat(catalog.reflectionCandidates(area))
                    .as("house %d -> %s has no evening reflection", house, area).isNotEmpty();
            assertThat(catalog.themeCandidates(area, PersonalPlanCatalog.Tone.SUPPORTIVE))
                    .as("house %d -> %s has no theme copy", house, area).isNotEmpty();
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private List<PersonalPlanCatalog.CatalogEntry> allEntries() {
        List<PersonalPlanCatalog.CatalogEntry> all = new java.util.ArrayList<>(catalog.allActionEntries());
        all.addAll(catalog.allCautionEntries());
        return all;
    }

    private long countBucket(
            List<PersonalPlanCatalog.CatalogEntry> entries, LifeArea area, PersonalPlanCatalog.Tone tone) {
        return entries.stream()
                .filter(entry -> entry.lifeArea() == area && entry.tone() == tone)
                .count();
    }

    /** Smallest bucket size — the number of consecutive days a single area/tone can serve. */
    private long worstCaseDays(List<PersonalPlanCatalog.CatalogEntry> actions) {
        long worst = Long.MAX_VALUE;
        for (LifeArea area : LifeArea.values()) {
            for (PersonalPlanCatalog.Tone tone : PersonalPlanCatalog.Tone.values()) {
                worst = Math.min(worst, countBucket(actions, area, tone));
            }
        }
        return worst;
    }
}
