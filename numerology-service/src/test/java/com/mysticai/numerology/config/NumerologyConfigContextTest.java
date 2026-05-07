package com.mysticai.numerology.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NumerologyConfigContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(NumerologyConfig.class)
            .withPropertyValues(
                    "numerology.premium-enabled=true",
                    "services.ai-orchestrator.guidance-connect-timeout-ms=350",
                    "services.ai-orchestrator.guidance-timeout-ms=900"
            );

    @Test
    void contextLoadsNumerologyConfigAndRestTemplateBean() {
        contextRunner.run(context -> {
            assertTrue(context.isRunning());

            NumerologyConfig config = context.getBean(NumerologyConfig.class);
            RestTemplate restTemplate = context.getBean("numerologyRestTemplate", RestTemplate.class);

            assertTrue(config.isPremiumEnabled());
            assertTrue(restTemplate.getRequestFactory() instanceof SimpleClientHttpRequestFactory);

            SimpleClientHttpRequestFactory requestFactory =
                    (SimpleClientHttpRequestFactory) restTemplate.getRequestFactory();

            assertEquals(350, ReflectionTestUtils.getField(requestFactory, "connectTimeout"));
            assertEquals(900, ReflectionTestUtils.getField(requestFactory, "readTimeout"));
        });
    }
}
