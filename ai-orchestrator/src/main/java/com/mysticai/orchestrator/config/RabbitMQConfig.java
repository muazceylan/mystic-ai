package com.mysticai.orchestrator.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String AI_EXCHANGE = "ai.exchange";
    public static final String AI_REQUESTS_QUEUE = "ai.requests.queue";

    // Routing keys
    public static final String AI_REQUEST_ROUTING_KEY = "ai.request";
    public static final String AI_RESPONSE_ROUTING_KEY = "ai.response";

    // Legacy queue names (for backward compatibility)
    public static final String AI_INTERPRETATION_QUEUE = "ai.interpretation.queue";
    public static final String AI_ROUTING_KEY = "ai.interpret.tarot";

    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String NOTIFICATION_ROUTING_KEY = "ai.notify";

    @Bean
    public DirectExchange aiExchange() {
        return new DirectExchange(AI_EXCHANGE, true, false);
    }

    @Bean
    public Queue aiRequestsQueue() {
        return QueueBuilder.durable(AI_REQUESTS_QUEUE)
                .withArgument("x-message-ttl", 86400000) // 24 hours
                .build();
    }

    @Bean
    public Queue aiInterpretationQueue() {
        return QueueBuilder.durable(AI_INTERPRETATION_QUEUE)
                .withArgument("x-message-ttl", 3600000)
                .build();
    }

    @Bean
    public Binding aiRequestsBinding(Queue aiRequestsQueue, DirectExchange aiExchange) {
        return BindingBuilder
                .bind(aiRequestsQueue)
                .to(aiExchange)
                .with(AI_REQUEST_ROUTING_KEY);
    }

    @Bean
    public TopicExchange legacyAiExchange() {
        return new TopicExchange("mystic.ai.exchange");
    }

    @Bean
    public Binding aiInterpretationBinding(Queue aiInterpretationQueue, TopicExchange legacyAiExchange) {
        return BindingBuilder
                .bind(aiInterpretationQueue)
                .to(legacyAiExchange)
                .with("ai.interpret.#");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        return rabbitTemplate;
    }
}
