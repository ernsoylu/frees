package com.frees.backend.config;

import com.frees.backend.api.SolveContextCache.Session;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.JdkSerializationRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Session> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Session> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new JdkSerializationRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new JdkSerializationRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    @org.springframework.context.annotation.Profile("api")
    public org.springframework.data.redis.listener.RedisMessageListenerContainer redisContainer(
            RedisConnectionFactory connectionFactory,
            org.springframework.data.redis.listener.adapter.MessageListenerAdapter listenerAdapter) {
        org.springframework.data.redis.listener.RedisMessageListenerContainer container = new org.springframework.data.redis.listener.RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(listenerAdapter, new org.springframework.data.redis.listener.ChannelTopic("job-events"));
        return container;
    }

    @Bean
    @org.springframework.context.annotation.Profile("api")
    public org.springframework.data.redis.listener.adapter.MessageListenerAdapter listenerAdapter(com.frees.backend.api.JobController jobController) {
        return new org.springframework.data.redis.listener.adapter.MessageListenerAdapter(jobController, "onMessage");
    }
}
