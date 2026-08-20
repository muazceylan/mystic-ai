package com.mysticai.notification.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SemanticVersionsTest {

    @Test
    void compare_ordersNumericallyNotLexicographically() {
        // "1.10.0" sorts before "1.9.0" as a string — it must not here.
        assertThat(SemanticVersions.compare("1.10.0", "1.9.0")).isPositive();
        assertThat(SemanticVersions.compare("1.9.0", "1.10.0")).isNegative();
    }

    @Test
    void compare_treatsMissingSegmentsAsZero() {
        assertThat(SemanticVersions.compare("1.2", "1.2.0")).isZero();
        assertThat(SemanticVersions.compare("1", "1.0.0")).isZero();
    }

    @Test
    void compare_ignoresPreReleaseSuffix() {
        assertThat(SemanticVersions.compare("1.2.0-rc1", "1.2.0")).isZero();
        assertThat(SemanticVersions.compare("1.2.0+build7", "1.2.0")).isZero();
    }

    @Test
    void compare_detectsMajorMinorPatchDifferences() {
        assertThat(SemanticVersions.compare("2.0.0", "1.99.99")).isPositive();
        assertThat(SemanticVersions.compare("1.2.5", "1.2.4")).isPositive();
        assertThat(SemanticVersions.compare("1.2.0", "1.2.0")).isZero();
    }

    @Test
    void isOlder_matchesCompareSign() {
        assertThat(SemanticVersions.isOlder("1.1.0", "1.2.0")).isTrue();
        assertThat(SemanticVersions.isOlder("1.2.0", "1.2.0")).isFalse();
        assertThat(SemanticVersions.isOlder("1.3.0", "1.2.0")).isFalse();
    }

    @Test
    void isValid_acceptsProjectVersionFormats() {
        assertThat(SemanticVersions.isValid("1.0.0")).isTrue();
        assertThat(SemanticVersions.isValid("1.2.5")).isTrue();
        assertThat(SemanticVersions.isValid("2.0.0")).isTrue();
        assertThat(SemanticVersions.isValid("1.2")).isTrue();
        assertThat(SemanticVersions.isValid("1.2.0-rc1")).isTrue();
    }

    @Test
    void isValid_rejectsMalformedInput() {
        assertThat(SemanticVersions.isValid(null)).isFalse();
        assertThat(SemanticVersions.isValid("")).isFalse();
        assertThat(SemanticVersions.isValid("v1.2.0")).isFalse();
        assertThat(SemanticVersions.isValid("1.2.3.4")).isFalse();
        assertThat(SemanticVersions.isValid("latest")).isFalse();
    }

    @Test
    void parse_doesNotThrowOnGarbageSegments() {
        assertThat(SemanticVersions.compare("1.x.0", "1.0.0")).isZero();
    }
}
