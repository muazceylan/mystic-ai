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

    public static final String AI_INTERPRETATION_QUEUE = "ai.interpretation.queue";
    public static final String AI_EXCHANGE = "mystic.ai.exchange";
    public static final String AI_ROUTING_KEY = "ai.interpret.tarot";

    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String NOTIFICATION_ROUTING_KEY = "ai.notify";

    @Bean
    public Queue aiInterpretationQueue() {
        return QueueBuilder.durable(AI_INTERPRETATION_QUEUE)
                .withArgument("x-message-ttl", 3600000)
                .build();
    }

    @Bean
    public TopicExchange aiExchange() {
        return new TopicExchange(AI_EXCHANGE);
    }

    @Bean
    public Binding aiInterpretationBinding(Queue aiInterpretationQueue, TopicExchange aiExchange) {
        return BindingBuilder
                .bind(aiInterpretationQueue)
                .to(aiExchange)
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
