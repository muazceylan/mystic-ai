package com.mysticai.auth.messaging;

import com.mysticai.auth.config.properties.PasswordResetProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class PasswordResetMailTemplateRenderer {

    private final PasswordResetProperties passwordResetProperties;

    public String render(String resetLink, String locale) {
        String template = loadTemplate(locale);
        return template
                .replace("{{resetLink}}", resetLink)
                .replace("{{expiresMinutes}}", String.valueOf(passwordResetProperties.tokenTtl().toMinutes()));
    }

    private String loadTemplate(String locale) {
        String templateName = "en".equalsIgnoreCase(locale)
                ? "templates/mail/password-reset-en.html"
                : "templates/mail/password-reset.html";
        org.springframework.core.io.Resource resource =
                new org.springframework.core.io.ClassPathResource(templateName);
        try {
            byte[] bytes = resource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load password reset mail template: " + templateName, e);
        }
    }
}
