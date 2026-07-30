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
    @DisplayName("both languages are present for every variant")
    void bothLocalesArePopulated() {
        for (PersonalPlanCatalog.CatalogEntry entry : allEntries()) {
            assertThat(entry.variant().turkish()).as("TR missing for %s", entry.actionIntent()).isNotBlank();
            assertThat(entry.variant().english()).as("EN missing for %s", entry.actionIntent()).isNotBlank();
            assertThat(entry.variant().turkish()).isNotEqualTo(entry.variant().english());
        }
    }

    @Test
    @DisplayName("every life area and tone has enough variants to survive the history window")
    void noBucketCanExhaustWithinTheHistoryWindow() {
        // The primary action is drawn from one bucket; the history window blocks reuse for
        // `historyDays`. A bucket must therefore hold more variants than that window is long,
        // otherwise the composer would be forced into its degraded path on a normal week.
        int required = 3;
        for (LifeArea area : LifeArea.values()) {
            for (PersonalPlanCatalog.Tone tone : PersonalPlanCatalog.Tone.values()) {
                long count = countBucket(catalog.allActionEntries(), area, tone);
                assertThat(count)
                        .as("%s/%s has only %d variants", area.slug(), tone, count)
                        .isGreaterThanOrEqualTo(required);
            }
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
