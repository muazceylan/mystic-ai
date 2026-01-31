package com.mysticai.astrology.dto;

import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.ZodiacSign;

import java.time.LocalDateTime;

public record NatalChartResponse(
        Long id,
        Long userId,
        LocalDateTime birthDate,
        String birthPlace,
        ZodiacSignInfo sunSign,
        ZodiacSignInfo moonSign,
        ZodiacSignInfo risingSign,
        LocalDateTime createdAt
) {
    public record ZodiacSignInfo(
            String name,
            String turkishName,
            String symbol,
            String element,
            String dateRange
    ) {
        public static ZodiacSignInfo from(ZodiacSign sign) {
            if (sign == null) {
                return null;
            }
            return new ZodiacSignInfo(
                    sign.name(),
                    sign.getTurkishName(),
                    sign.getSymbol(),
                    sign.getElement(),
                    sign.getDateRange()
            );
        }
    }

    public static NatalChartResponse from(NatalChart chart) {
        return new NatalChartResponse(
                chart.getId(),
                chart.getUserId(),
                chart.getBirthDate(),
                chart.getBirthPlace(),
                ZodiacSignInfo.from(chart.getSunSign()),
                ZodiacSignInfo.from(chart.getMoonSign()),
                ZodiacSignInfo.from(chart.getRisingSign()),
                chart.getCreatedAt()
        );
    }
}
