package com.mysticai.notification.admin.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Delivers admin-facing operational emails (temp passwords, password reset links).
 *
 * Controlled by admin.email.enabled. If disabled (default in dev), the message is
 * logged at WARN level instead of sent — the caller is responsible for showing
 * the temp credential in the UI response.
 *
 * Passwords are NEVER logged in plain text; only whether the delivery succeeded.
 */
@Service
@Slf4j
public class EmailDeliveryService {

    private final JavaMailSender mailSender;

    @Value("${admin.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${admin.email.from:noreply@mysticai.com}")
    private String fromAddress;

    public EmailDeliveryService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send temp password to a newly created admin user.
     *
     * @param recipientEmail target admin email
     * @param tempPassword   plain-text temp password (NEVER log this)
     * @return true if email was sent (or simulated in dev mode)
     */
    public boolean sendTempPassword(String recipientEmail, String tempPassword) {
        String subject = "Mystic AI Admin — Geçici Şifreniz";
        String body = """
                Merhaba,

                Mystic AI Admin Paneline giriş için geçici şifreniz aşağıdadır.
                İlk girişinizin ardından şifrenizi değiştirmeniz tavsiye edilir.

                Geçici Şifre: %s

                Giriş adresi: https://admin.mysticai.com

                Bu e-postayı siz talep etmediyseniz sistem yöneticinize bildirin.

                Mystic AI Ekibi
                """.formatted(tempPassword);

        return sendEmail(recipientEmail, subject, body);
    }

    /**
     * Send password reset notification to an existing admin user.
     *
     * @param recipientEmail target admin email
     * @param newTempPassword new plain-text temp password (NEVER log this)
     * @return true if email was sent
     */
    public boolean sendPasswordReset(String recipientEmail, String newTempPassword) {
        String subject = "Mystic AI Admin — Şifre Sıfırlama";
        String body = """
                Merhaba,

                Admin Panel şifreniz sıfırlanmıştır.
                Yeni geçici şifreniz ile giriş yapabilirsiniz:

                Yeni Geçici Şifre: %s

                Giriş adresi: https://admin.mysticai.com

                Bu işlemi siz talep etmediyseniz sistem yöneticinize acilen bildirin.

                Mystic AI Ekibi
                """.formatted(newTempPassword);

        return sendEmail(recipientEmail, subject, body);
    }

    private boolean sendEmail(String to, String subject, String body) {
        if (!emailEnabled) {
            // In dev mode: email content is intentionally NOT logged for security.
            // The caller must surface the temp credential via the API response only.
            log.warn("[EMAIL-DELIVERY] Email disabled (admin.email.enabled=false). " +
                     "Recipient: {} Subject: '{}' — credential must be shared out-of-band.", to, subject);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[EMAIL-DELIVERY] Sent '{}' to {}", subject, to);
            return true;
        } catch (MailException e) {
            log.error("[EMAIL-DELIVERY] Failed to send '{}' to {}: {}", subject, to, e.getMessage());
            return false;
        }
    }
}
