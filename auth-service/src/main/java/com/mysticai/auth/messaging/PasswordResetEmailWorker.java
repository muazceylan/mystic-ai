package com.mysticai.auth.messaging;

import com.mysticai.auth.config.AuthRabbitMQConfig;
import com.mysticai.auth.config.properties.PasswordResetProperties;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class PasswordResetEmailWorker {

    private final JavaMailSender mailSender;
    private final RabbitTemplate rabbitTemplate;
    private final PublicUrlProperties publicUrlProperties;
    private final PasswordResetProperties passwordResetProperties;
    private final PasswordResetMailTemplateRenderer templateRenderer;

    @Value("${auth.mail.from:no-reply@mysticai.local}")
    private String fromAddress;

    @RabbitListener(queues = AuthRabbitMQConfig.PASSWORD_RESET_QUEUE)
    public void consume(
            PasswordResetEmailMessage message,
            @Header(name = "x-retry-count", required = false) Integer retryCount
    ) {
        int currentRetry = retryCount == null ? 0 : retryCount;
        try {
            sendPasswordResetEmail(message);
            log.info("Password reset email sent successfully. userId={}, correlationId={}",
                    message.userId(), message.correlationId());
        } catch (Exception ex) {
            if (currentRetry < passwordResetProperties.maxRetryCount()) {
                int nextRetry = currentRetry + 1;
                log.warn("Password reset email send failed. Retrying. userId={}, correlationId={}, retry={}",
                        message.userId(), message.correlationId(), nextRetry, ex);
                rabbitTemplate.convertAndSend(
                        AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE,
                        AuthRabbitMQConfig.PASSWORD_RESET_RETRY_ROUTING_KEY,
                        message,
                        amqpMessage -> {
                            amqpMessage.getMessageProperties().setHeader("x-retry-count", nextRetry);
                            amqpMessage.getMessageProperties().setCorrelationId(message.correlationId());
                            return amqpMessage;
                        }
                );
                return;
            }

            log.error("Password reset email moved to DLQ. userId={}, correlationId={}, retry={}",
                    message.userId(), message.correlationId(), currentRetry, ex);
            rabbitTemplate.convertAndSend(
                    AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE,
                    AuthRabbitMQConfig.PASSWORD_RESET_FAILED_ROUTING_KEY,
                    message,
                    amqpMessage -> {
                        amqpMessage.getMessageProperties().setHeader("x-retry-count", currentRetry);
                        amqpMessage.getMessageProperties().setHeader("x-error", ex.getClass().getSimpleName());
                        amqpMessage.getMessageProperties().setCorrelationId(message.correlationId());
                        return amqpMessage;
                    }
            );
        }
    }

    private void sendPasswordResetEmail(PasswordResetEmailMessage message) throws Exception {
        String token = URLEncoder.encode(message.rawToken(), StandardCharsets.UTF_8);
        String resetLink = publicUrlProperties.apiPublicUrl() + "/api/v1/auth/reset-password?token=" + token;
        String locale = message.locale() != null ? message.locale() : "tr";
        String html = templateRenderer.render(resetLink, locale);

        String subject = "en".equalsIgnoreCase(locale)
                ? "Astro Guru — Reset Your Password"
                : "Astro Guru — Şifreni Sıfırla";

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());

        helper.setFrom(new jakarta.mail.internet.InternetAddress(fromAddress, "Astro Guru"));
        helper.setTo(message.email());
        helper.setSubject(subject);
        helper.setText(html, true);

        mailSender.send(mimeMessage);
    }
}
