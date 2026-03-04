package com.mysticai.astrology.dto.daily;

import java.util.List;

public record DailyActionsDTO(
        String date,
        Header header,
        List<ActionItem> actions,
        MiniPlan miniPlan
) {
    public record Header(
            String title,
            String subtitle
    ) {}

    public record ActionItem(
            String id,
            String title,
            String detail,
            String icon,
            String tag,
            Integer etaMin,
            boolean isDone,
            String doneAt,
            List<String> relatedTransitIds
    ) {}

    public record MiniPlan(
            String title,
            List<String> steps
    ) {}
}

