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

    private final VerificationProperties verificationProperties;

    public String render(String verificationLink, String locale) {
        String template = loadTemplate(locale);
        return template
                .replace("{{verificationLink}}", verificationLink)
                .replace("{{expiresHours}}", String.valueOf(verificationProperties.tokenTtl().toHours()));
    }

    private String loadTemplate(String locale) {
        String templateName = "en".equalsIgnoreCase(locale)
                ? "templates/mail/email-verification-en.html"
                : "templates/mail/email-verification.html";
        org.springframework.core.io.Resource resource =
                new org.springframework.core.io.ClassPathResource(templateName);
        try {
            byte[] bytes = resource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load verification mail template: " + templateName, e);
        }
    }
}
