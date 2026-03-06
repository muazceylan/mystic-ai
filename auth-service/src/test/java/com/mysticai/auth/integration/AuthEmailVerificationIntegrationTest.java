package com.mysticai.auth.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.auth.messaging.EmailVerificationMessage;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthEmailVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    void registerThenVerifyEmailThenLoginSuccess() throws Exception {
        String registerPayload = """
                {
                  "username": "new-user",
                  "email": "new-user@example.com",
                  "password": "Password123!",
                  "firstName": "New",
                  "lastName": "User"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));

        org.mockito.ArgumentCaptor<Object> payloadCaptor = org.mockito.ArgumentCaptor.forClass(Object.class);
        verify(rabbitTemplate, atLeastOnce()).convertAndSend(
                eq("auth.events"),
                eq("auth.email.verification.send"),
                payloadCaptor.capture(),
                any(MessagePostProcessor.class)
        );

        Object payload = payloadCaptor.getValue();
        assertThat(payload).isInstanceOf(EmailVerificationMessage.class);
        EmailVerificationMessage message = (EmailVerificationMessage) payload;
        assertThat(message.email()).isEqualTo("new-user@example.com");
        assertThat(message.rawToken()).isNotBlank();

        String loginPayload = """
                {
                  "username": "new-user",
                  "password": "Password123!"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("EMAIL_NOT_VERIFIED"));

        mockMvc.perform(get("/api/v1/auth/verify-email")
                        .param("token", message.rawToken()))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0"));

        mockMvc.perform(get("/api/v1/auth/verify-email")
                        .param("token", message.rawToken()))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("Invalid verification link")));

        MvcResult successLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode loginJson = objectMapper.readTree(successLogin.getResponse().getContentAsString());
        assertThat(loginJson.get("accessToken").asText()).isNotBlank();
        assertThat(loginJson.get("user").get("accountStatus").asText()).isEqualTo("ACTIVE");
    }
}
