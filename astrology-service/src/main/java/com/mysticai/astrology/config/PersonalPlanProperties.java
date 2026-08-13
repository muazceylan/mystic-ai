package com.mysticai.astrology.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tunables for the "Bugünkü Kişisel Planım" generator. Everything that used to be a magic
 * number (dedupe threshold, history window, regeneration budget) is configurable here so
 * content quality can be tuned per environment without a code change.
 */
@Component
@ConfigurationProperties(prefix = "personal-plan")
@Getter
@Setter
public class PersonalPlanProperties {

    /** Bumped whenever the composition algorithm or catalog changes; part of the cache key. */
    private String version = "pp-v3";

    /** How many previous days are compared when suppressing repeated suggestions. */
    private int historyDays = 7;

    /** How long explicit relevance/helpfulness feedback may influence candidate weighting. */
    private int feedbackInfluenceDays = 7;

    /** Score reduction for a life area the user marked NOT_RELEVANT. */
    private int notRelevantAreaPenalty = 18;

    /** Small positive score for a life area the user marked HELPFUL; deliberately below penalties. */
    private int helpfulAreaBoost = 4;

    /** Jaccard similarity above which two suggestions count as semantic duplicates. */
    private double semanticSimilarityThreshold = 0.82;

    /** Upper bound on feedback-triggered regenerations for a single user/day. */
    private int maxRegenerationsPerDay = 2;

    /** Maximum life-area cards returned alongside the primary action. */
    private int maxLifeAreaCards = 2;

    /** Maximum timeline slots returned; slots without a real time signal are dropped. */
    private int maxTimelineSlots = 3;

    /** Bounded connect timeout for the auth-service profile lookup. */
    private int profileConnectTimeoutMs = 2000;

    /** Bounded read timeout for the auth-service profile lookup; no retry on failure. */
    private int profileReadTimeoutMs = 4000;

    /**
     * How long a fetched profile stays cached. Short on purpose: relationship status is
     * user-editable and a stale value would gate the wrong audience copy.
     */
    private int profileCacheTtlSeconds = 300;

    /** Days a generated plan is retained before the cleanup job removes it. */
    private int retentionDays = 60;

    /**
     * Optional AI rewording pass over the composed plan. Off by default: the rule-based copy is
     * the product baseline, and every refined field has to survive the same quality checks
     * before it replaces one, so enabling this can only change wording, never plan content.
     */
    private boolean aiRefinementEnabled = false;

    /** Bounded connect timeout for the ai-orchestrator refinement call. */
    private int aiConnectTimeoutMs = 2000;

    /**
     * Bounded read timeout. A plan is composed once per user per local day, so this runs at most
     * once a day per user; on timeout the rule-based copy is served unchanged.
     */
    private int aiReadTimeoutMs = 8000;
}
