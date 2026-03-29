package com.mysticai.astrology.dto;

import java.util.List;

public record SynastryModuleScore(
        Integer overall,
        List<SynastryDisplayMetric> metrics
) {}
