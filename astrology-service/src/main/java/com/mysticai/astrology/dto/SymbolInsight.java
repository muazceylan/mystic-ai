package com.mysticai.astrology.dto;

public record SymbolInsight(
        String symbolName,
        int count,
        String houseAssociation,
        String aiMeaning,        // nullable until AI generates it
        String lastSeenDate,
        boolean recurring
) {}
