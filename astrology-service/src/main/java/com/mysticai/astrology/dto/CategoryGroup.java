package com.mysticai.astrology.dto;

import java.util.List;

public record CategoryGroup(
        String id,
        String title,
        List<TraitAxis> items
) {}
