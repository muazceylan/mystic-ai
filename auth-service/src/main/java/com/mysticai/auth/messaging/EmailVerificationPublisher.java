package com.mysticai.auth.messaging;

import com.mysticai.auth.config.AuthRabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailVerificationPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(EmailVerificationMessage message) {
        rabbitTemplate.convertAndSend(
                AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE,
                AuthRabbitMQConfig.VERIFICATION_SEND_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setContentType("application/json");
                    msg.getMessageProperties().setCorrelationId(message.correlationId());
                    return msg;
                }
        );
    }
}
