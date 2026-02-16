package com.mysticai.gateway.config;

import org.springdoc.core.properties.SwaggerUiConfigParameters;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Configuration to aggregate OpenAPI docs from all microservices.
 * This enables Swagger UI to show APIs from all services in one place.
 */
@Configuration
public class AggregateOpenApiConfig {

    @Bean
    @Lazy(false)
    public Set<SwaggerUiConfigParameters.SwaggerUrl> apis(
            RouteDefinitionLocator locator,
            SwaggerUiConfigParameters swaggerUiConfigParameters) {
        
        Set<SwaggerUiConfigParameters.SwaggerUrl> urls = new HashSet<>();
        
        // Manually add service API docs
        urls.add(createSwaggerUrl("auth-service", "Auth Service"));
        urls.add(createSwaggerUrl("tarot-service", "Tarot Service"));
        urls.add(createSwaggerUrl("astrology-service", "Astrology Service"));
        urls.add(createSwaggerUrl("numerology-service", "Numerology Service"));
        urls.add(createSwaggerUrl("dream-service", "Dream Service"));
        urls.add(createSwaggerUrl("oracle-service", "Oracle Service"));
        
        swaggerUiConfigParameters.setUrls(urls);
        return urls;
    }
    
    private SwaggerUiConfigParameters.SwaggerUrl createSwaggerUrl(String serviceId, String name) {
        SwaggerUiConfigParameters.SwaggerUrl swaggerUrl = new SwaggerUiConfigParameters.SwaggerUrl();
        swaggerUrl.setName(name);
        swaggerUrl.setUrl("/" + serviceId + "/v3/api-docs");
        return swaggerUrl;
    }
}
