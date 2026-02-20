package com.mysticai.astrology.dto;

import java.util.List;

public record CollectivePulseResponse(
        List<GlobalSymbolEntry> topSymbols,
        String astroReasoning,
        String generatedAt
) {}
