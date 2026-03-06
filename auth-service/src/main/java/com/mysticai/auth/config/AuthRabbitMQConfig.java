package com.mysticai.auth.config;

import com.mysticai.auth.config.properties.VerificationProperties;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class AuthRabbitMQConfig {

    public static final String AUTH_EVENTS_EXCHANGE = "auth.events";

    public static final String VERIFICATION_QUEUE = "auth.email.verification.queue";
    public static final String VERIFICATION_RETRY_QUEUE = "auth.email.verification.retry.queue";
    public static final String VERIFICATION_DLQ = "auth.email.verification.dlq";

    public static final String VERIFICATION_SEND_ROUTING_KEY = "auth.email.verification.send";
    public static final String VERIFICATION_RETRY_ROUTING_KEY = "auth.email.verification.retry";
    public static final String VERIFICATION_FAILED_ROUTING_KEY = "auth.email.verification.failed";

    @Bean
    public TopicExchange authEventsExchange() {
        return new TopicExchange(AUTH_EVENTS_EXCHANGE, true, false);
    }

    @Bean
    public Queue verificationQueue() {
        return QueueBuilder.durable(VERIFICATION_QUEUE).build();
    }

    @Bean
    public Queue verificationRetryQueue(VerificationProperties properties) {
        return QueueBuilder.durable(VERIFICATION_RETRY_QUEUE)
                .withArgument("x-message-ttl", (int) properties.retryDelay().toMillis())
                .withArgument("x-dead-letter-exchange", AUTH_EVENTS_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", VERIFICATION_SEND_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue verificationDlq() {
        return QueueBuilder.durable(VERIFICATION_DLQ).build();
    }

    @Bean
    public Binding verificationQueueBinding(Queue verificationQueue, TopicExchange authEventsExchange) {
        return BindingBuilder.bind(verificationQueue)
                .to(authEventsExchange)
                .with(VERIFICATION_SEND_ROUTING_KEY);
    }

    @Bean
    public Binding verificationRetryQueueBinding(Queue verificationRetryQueue, TopicExchange authEventsExchange) {
        return BindingBuilder.bind(verificationRetryQueue)
                .to(authEventsExchange)
                .with(VERIFICATION_RETRY_ROUTING_KEY);
    }

    @Bean
    public Binding verificationDlqBinding(Queue verificationDlq, TopicExchange authEventsExchange) {
        return BindingBuilder.bind(verificationDlq)
                .to(authEventsExchange)
                .with(VERIFICATION_FAILED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
