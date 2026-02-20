package com.mysticai.astrology.dto;

import java.time.LocalDate;

public record DreamSymbolDTO(
        Long id,
        String symbolName,
        Integer count,
        LocalDate lastSeenDate,
        boolean recurring
) {}
