package com.mysticai.orchestrator.dto.admin;

import java.util.List;

public record AiModelConfigDto(
        boolean allowMock,
        List<String> complexChain,
        List<String> simpleChain,
        List<AiModelProviderConfigDto> providers
) {
}
