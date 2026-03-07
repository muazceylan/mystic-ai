package com.mysticai.auth.messaging;

import com.mysticai.auth.config.AuthRabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordResetEmailPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(PasswordResetEmailMessage message) {
        rabbitTemplate.convertAndSend(
                AuthRabbitMQConfig.AUTH_EVENTS_EXCHANGE,
                AuthRabbitMQConfig.PASSWORD_RESET_SEND_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setContentType("application/json");
                    msg.getMessageProperties().setCorrelationId(message.correlationId());
                    return msg;
                }
        );
    }
}
