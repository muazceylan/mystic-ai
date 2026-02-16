package com.mysticai.vision.config;

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
    public static final String AI_RESPONSES_QUEUE = "ai.responses.vision.queue";
    public static final String AI_RESPONSE_ROUTING_KEY = "ai.response";

    @Bean
    public DirectExchange aiExchange() {
        return new DirectExchange(AI_EXCHANGE, true, false);
    }

    @Bean
    public Queue aiResponsesQueue() {
        return QueueBuilder.durable(AI_RESPONSES_QUEUE)
                .withArgument("x-message-ttl", 86400000)
                .build();
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
