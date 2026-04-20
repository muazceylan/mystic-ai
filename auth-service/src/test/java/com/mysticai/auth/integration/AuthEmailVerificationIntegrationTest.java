package com.mysticai.auth.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.auth.service.MonetizationSignupBonusClient;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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
    private JavaMailSender mailSender;

    @MockBean
    private MonetizationSignupBonusClient monetizationSignupBonusClient;

    @Test
    void registerThenVerifyEmailThenLoginSuccess() throws Exception {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(monetizationSignupBonusClient.grantSignupBonus(anyLong(), anyString(), anyString()))
                .thenReturn(new MonetizationSignupBonusClient.SignupBonusResponse(
                        false,
                        false,
                        0,
                        0,
                        "signup_bonus_disabled",
                        "SIGNUP_BONUS",
                        "EMAIL_REGISTER"
                ));

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

        org.mockito.ArgumentCaptor<MimeMessage> mailCaptor = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mailCaptor.capture());
        MimeMessage sentMail = mailCaptor.getValue();
        assertThat(sentMail.getAllRecipients()[0].toString()).isEqualTo("new-user@example.com");

        String emailHtml = sentMail.getContent().toString();
        Matcher codeMatcher = Pattern.compile(">(\\d{6})<").matcher(emailHtml);
        assertThat(codeMatcher.find()).isTrue();
        String otpCode = codeMatcher.group(1);

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

        MvcResult verifyOtpResult = mockMvc.perform(post("/api/v1/auth/verify-email-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new-user@example.com",
                                  "code": "%s"
                                }
                                """.formatted(otpCode)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode verifyOtpJson = objectMapper.readTree(verifyOtpResult.getResponse().getContentAsString());
        assertThat(verifyOtpJson.get("accessToken").asText()).isNotBlank();
        assertThat(verifyOtpJson.get("user").get("accountStatus").asText()).isEqualTo("ACTIVE");

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
