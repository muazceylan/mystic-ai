package com.mysticai.dream.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange name for AI analysis requests
    public static final String AI_EXCHANGE = "ai.exchange";
    
    // Queue names
    public static final String AI_REQUESTS_QUEUE = "ai.requests.queue";
    public static final String AI_RESPONSES_QUEUE = "ai.responses.dream.queue";
    
    // Routing keys
    public static final String AI_REQUEST_ROUTING_KEY = "ai.request";
    public static final String AI_RESPONSE_ROUTING_KEY = "ai.response";

    @Bean
    public DirectExchange aiExchange() {
        return new DirectExchange(AI_EXCHANGE, true, false);
    }

    @Bean
    public Queue aiRequestsQueue() {
        return QueueBuilder.durable(AI_REQUESTS_QUEUE)
                .withArgument("x-message-ttl", 86400000) // 24 hours TTL
                .build();
    }

    @Bean
    public Queue aiResponsesQueue() {
        return QueueBuilder.durable(AI_RESPONSES_QUEUE)
                .withArgument("x-message-ttl", 86400000) // 24 hours TTL
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
    public Binding aiResponsesBinding(Queue aiResponsesQueue, DirectExchange aiExchange) {
        return BindingBuilder
                .bind(aiResponsesQueue)
                .to(aiExchange)
                .with(AI_RESPONSE_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
