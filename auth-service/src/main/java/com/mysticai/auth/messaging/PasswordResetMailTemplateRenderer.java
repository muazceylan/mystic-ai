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

    private final Resource templateResource =
            new org.springframework.core.io.ClassPathResource("templates/mail/password-reset.html");

    private final PasswordResetProperties passwordResetProperties;

    public String render(String resetLink) {
        String template = loadTemplate();
        return template
                .replace("{{resetLink}}", resetLink)
                .replace("{{expiresMinutes}}", String.valueOf(passwordResetProperties.tokenTtl().toMinutes()));
    }

    private String loadTemplate() {
        try {
            byte[] bytes = templateResource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load password reset mail template", e);
        }
    }
}
