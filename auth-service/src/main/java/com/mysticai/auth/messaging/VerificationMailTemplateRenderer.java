package com.mysticai.auth.messaging;

import com.mysticai.auth.config.properties.VerificationProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class VerificationMailTemplateRenderer {

    private final Resource templateResource =
            new org.springframework.core.io.ClassPathResource("templates/mail/email-verification.html");

    private final VerificationProperties verificationProperties;

    public String render(String verificationLink) {
        String template = loadTemplate();
        return template
                .replace("{{verificationLink}}", verificationLink)
                .replace("{{expiresHours}}", String.valueOf(verificationProperties.tokenTtl().toHours()));
    }

    private String loadTemplate() {
        try {
            byte[] bytes = templateResource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load verification mail template", e);
        }
    }
}
