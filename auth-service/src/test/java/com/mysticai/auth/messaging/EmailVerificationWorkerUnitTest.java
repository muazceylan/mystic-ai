package com.mysticai.auth.messaging;

import com.mysticai.auth.config.AuthRabbitMQConfig;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.config.properties.VerificationProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailVerificationWorkerUnitTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private PublicUrlProperties publicUrlProperties;

    @Mock
    private VerificationMailTemplateRenderer templateRenderer;

    private EmailVerificationWorker worker;

    @BeforeEach
    void setUp() {
        VerificationProperties verificationProperties =
                new VerificationProperties("pepper", 48, 24, 60, 5, 3, 30);
        worker = new EmailVerificationWorker(
                mailSender,
                rabbitTemplate,
                publicUrlProperties,
                verificationProperties,
                templateRenderer
        );
        ReflectionTestUtils.setField(worker, "fromAddress", "no-reply@mysticai.local");

        when(publicUrlProperties.apiPublicUrl()).thenReturn("http://localhost:8080");
        when(templateRenderer.render(any())).thenReturn("<html>test</html>");
    }

    @Test
    void consume_retriesOnFailureBeforeMaxRetry() {
        EmailVerificationMessage message = new EmailVerificationMessage(1L, "user@example.com", "token", "corr-1");
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("smtp-down"));

        worker.consume(message, 1);

        verify(rabbitTemplate).convertAndSend(
                eq(AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE),
                eq(AuthRabbitMQConfig.VERIFICATION_RETRY_ROUTING_KEY),
                eq(message),
                any(MessagePostProcessor.class)
        );
    }

    @Test
    void consume_sendsToDlqAfterMaxRetry() {
        EmailVerificationMessage message = new EmailVerificationMessage(1L, "user@example.com", "token", "corr-2");
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("smtp-down"));

        worker.consume(message, 3);

        verify(rabbitTemplate).convertAndSend(
                eq(AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE),
                eq(AuthRabbitMQConfig.VERIFICATION_FAILED_ROUTING_KEY),
                eq(message),
                any(MessagePostProcessor.class)
        );
    }
}
