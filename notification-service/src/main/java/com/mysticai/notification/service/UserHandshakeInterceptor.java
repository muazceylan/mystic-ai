package com.mysticai.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Interceptor to extract user information during WebSocket handshake.
 * Extracts userId from query parameters or headers and adds it to session attributes.
 */
@Component
@Slf4j
public class UserHandshakeInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        
        if (request instanceof ServletServerHttpRequest servletRequest) {
            // Try to get userId from query parameter
            String userId = servletRequest.getServletRequest().getParameter("userId");
            
            // If not in query param, try header
            if (userId == null || userId.isEmpty()) {
                userId = servletRequest.getServletRequest().getHeader("X-User-Id");
            }
            
            if (userId != null && !userId.isEmpty()) {
                attributes.put("userId", userId);
                log.debug("WebSocket handshake - User connected: {}", userId);
            } else {
                log.warn("WebSocket handshake - No userId provided");
            }
        }
        
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No post-handshake action needed
    }
}
