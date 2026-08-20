package com.mysticai.notification.util;

/**
 * Numeric, segment-wise comparison of semantic version strings.
 *
 * <p>Versions are never compared as plain strings: "1.10.0" is newer than "1.9.0" even though
 * it sorts earlier lexicographically. Missing segments are treated as 0 ("1.2" equals "1.2.0")
 * and a pre-release / build suffix is ignored ("1.2.0-rc1" equals "1.2.0").
 */
public final class SemanticVersions {

    private SemanticVersions() {
    }

    /** Matches 1, 1.2 and 1.2.3 with an optional -suffix or +suffix. */
    private static final String VALID_PATTERN = "^\\d+(\\.\\d+){0,2}([-+][0-9A-Za-z.-]+)?$";

    public static boolean isValid(String version) {
        return version != null && version.matches(VALID_PATTERN);
    }

    /** Returns a negative value if {@code a} is older than {@code b}, 0 if equal, positive if newer. */
    public static int compare(String a, String b) {
        int[] left = parse(a);
        int[] right = parse(b);
        for (int i = 0; i < 3; i++) {
            if (left[i] != right[i]) {
                return Integer.compare(left[i], right[i]);
            }
        }
        return 0;
    }

    public static boolean isOlder(String a, String b) {
        return compare(a, b) < 0;
    }

    private static int[] parse(String version) {
        int[] parts = new int[3];
        if (version == null || version.isBlank()) {
            return parts;
        }
        String core = version.trim().split("[-+]", 2)[0];
        String[] segments = core.split("\\.");
        for (int i = 0; i < 3 && i < segments.length; i++) {
            parts[i] = parseSegment(segments[i]);
        }
        return parts;
    }

    private static int parseSegment(String segment) {
        try {
            return Math.max(0, Integer.parseInt(segment.trim()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
