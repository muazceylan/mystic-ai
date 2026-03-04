package com.mysticai.astrology.dto.cosmicplanner;

import java.time.LocalDate;
import java.util.List;

public record CosmicPlannerDayCategoriesDTO(
        LocalDate date,
        List<DockCategoryDTO> categories,
        String generatedAt
) {}
