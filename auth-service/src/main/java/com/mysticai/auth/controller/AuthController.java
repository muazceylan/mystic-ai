package com.mysticai.auth.controller;

import com.mysticai.auth.config.properties.DeploymentEnv;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.dto.ChangePasswordRequest;
import com.mysticai.auth.dto.CheckEmailRequest;
import com.mysticai.auth.dto.LinkEmailRequest;
import com.mysticai.auth.dto.LinkEmailVerifyOtpRequest;
import com.mysticai.auth.dto.VerifyEmailOtpRequest;
import com.mysticai.auth.dto.CheckEmailResponse;
import com.mysticai.auth.dto.LoginRequest;
import com.mysticai.auth.dto.LoginResponse;
import com.mysticai.auth.dto.RegisterRequest;
import com.mysticai.auth.dto.SetPasswordRequest;
import com.mysticai.auth.dto.SocialLoginRequest;
import com.mysticai.auth.dto.UpdateProfileRequest;
import com.mysticai.auth.dto.UserDTO;
import com.mysticai.auth.dto.password.ForgotPasswordRequest;
import com.mysticai.auth.dto.password.ResetPasswordRequest;
import com.mysticai.auth.dto.password.ResetPasswordResponse;
import com.mysticai.auth.dto.verification.OkResponse;
import com.mysticai.auth.dto.verification.RegisterResponse;
import com.mysticai.auth.dto.verification.ResendVerificationRequest;
import com.mysticai.auth.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private static final String NO_STORE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, max-age=0";
    private static final String APP_BIRTH_DATE_PATH = "/birth-date";
    private static final String APP_VERIFY_RESULT_PATH = "/verify-email?result=";
    private static final String APP_BIRTH_DATE_DEEP_LINK = "mystic-ai://birth-date";
    private static final String APP_LOGIN_DEEP_LINK = "mystic-ai://welcome?passwordReset=success";
    private static final String PASSWORD_RESET_SUCCESS_PATH = "/api/v1/auth/reset-password/success";

    private final AuthService authService;
    private final PublicUrlProperties publicUrlProperties;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verification/resend")
    public ResponseEntity<OkResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        OkResponse response = authService.resendVerification(request.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<OkResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        OkResponse response = authService.requestPasswordReset(request.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ResetPasswordResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        AuthService.PasswordResetOutcome outcome = authService.resetPassword(
                request.token(),
                request.newPassword(),
                request.confirmPassword()
        );
        return ResponseEntity.ok(new ResetPasswordResponse(outcome.name()));
    }

    @GetMapping("/reset-password")
    public ResponseEntity<String> resetPasswordPage(@RequestParam("token") String token) {
        return passwordResetPage(token);
    }

    @GetMapping("/reset-password/success")
    public ResponseEntity<String> resetPasswordSuccessPage() {
        String appOpenButton = """
                <a href="%s" class="btn">Uygulamayı Aç</a>
                """.formatted(htmlEscape(APP_LOGIN_DEEP_LINK));
        String webHomeButton = publicUrlProperties.hasAppPublicUrl()
                ? """
                <a href="%s" class="btn btn-ghost">Web'e Devam Et</a>
                """.formatted(htmlEscape(publicUrlProperties.appPublicUrl()))
                : "";

        String html = """
                <!doctype html>
                <html lang="tr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Mystic AI | Şifre Güncellendi</title>
                  <style>
                    :root {
                      --bg: #070b1d;
                      --card: rgba(14, 20, 45, 0.86);
                      --card-border: rgba(157, 78, 221, 0.42);
                      --text: #edf1ff;
                      --sub: #aeb7d9;
                      --accent: #9d4edd;
                      --ok: #34d399;
                    }
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      min-height: 100vh;
                      display: grid;
                      place-items: center;
                      padding: 24px;
                      color: var(--text);
                      font-family: "Segoe UI", Arial, sans-serif;
                      background:
                        radial-gradient(circle at 15%% 10%%, rgba(157, 78, 221, 0.36), transparent 40%%),
                        radial-gradient(circle at 85%% 18%%, rgba(34, 211, 238, 0.26), transparent 36%%),
                        linear-gradient(170deg, #050915 0%%, #0b1129 56%%, #111a35 100%%);
                    }
                    .card {
                      width: min(560px, 100%%);
                      border-radius: 24px;
                      border: 1px solid var(--card-border);
                      background: var(--card);
                      backdrop-filter: blur(10px);
                      padding: 30px 26px;
                    }
                    h1 { margin: 0 0 10px; font-size: 30px; letter-spacing: .2px; }
                    p { margin: 0 0 18px; color: var(--sub); line-height: 1.65; }
                    .ok { color: var(--ok); font-weight: 700; }
                    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
                    .btn {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 44px;
                      border-radius: 12px;
                      padding: 10px 16px;
                      text-decoration: none;
                      color: #fff;
                      background: linear-gradient(135deg, #7c3aed 0%%, #9d4edd 100%%);
                      font-weight: 700;
                    }
                    .btn-ghost {
                      background: transparent;
                      border: 1px solid rgba(237, 241, 255, 0.28);
                      color: var(--text);
                    }
                  </style>
                </head>
                <body>
                  <section class="card">
                    <h1>Şifre Başarıyla Güncellendi</h1>
                    <p class="ok">Hesabınızın şifresi güvenli şekilde yenilendi.</p>
                    <p>Mystic AI uygulamasına dönerek yeni şifrenizle giriş yapabilirsiniz.</p>
                    <div class="actions">
                      %s
                      %s
                    </div>
                  </section>
                </body>
                </html>
                """.formatted(appOpenButton, webHomeButton);

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, NO_STORE_CACHE_CONTROL)
                .header("Pragma", "no-cache")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        AuthService.VerificationOutcome outcome = authService.verifyEmailToken(token);

        if (publicUrlProperties.env() == DeploymentEnv.LOCAL) {
            return htmlOutcome(outcome);
        }

        if (publicUrlProperties.env() == DeploymentEnv.STAGING) {
            if (publicUrlProperties.hasAppPublicUrl() && outcome == AuthService.VerificationOutcome.SUCCESS) {
                return redirectToApp(outcome);
            }
            return htmlOutcome(outcome);
        }

        return redirectToApp(outcome);
    }

    @PostMapping("/check-email")
    public ResponseEntity<CheckEmailResponse> checkEmail(@Valid @RequestBody CheckEmailRequest request) {
        boolean available = authService.isEmailAvailable(request.email());
        return ResponseEntity.ok(new CheckEmailResponse(available,
                available ? "Email is available" : "Email already exists"));
    }

    @GetMapping("/check-email")
    public ResponseEntity<CheckEmailResponse> checkEmailGet(@RequestParam @Email String email) {
        boolean available = authService.isEmailAvailable(email);
        return ResponseEntity.ok(new CheckEmailResponse(available,
                available ? "Email is available" : "Email already exists"));
    }

    /**
     * Step 2 of email registration: verifies the 6-digit OTP and activates the account.
     * Returns full login tokens so the client auto-logs in on success.
     */
    @PostMapping("/verify-email-otp")
    public ResponseEntity<LoginResponse> verifyEmailOtp(@Valid @RequestBody VerifyEmailOtpRequest request) {
        LoginResponse response = authService.verifyEmailOtp(request.email(), request.code());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/social-login")
    public ResponseEntity<LoginResponse> socialLogin(@Valid @RequestBody SocialLoginRequest request) {
        LoginResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Creates a temporary anonymous guest session.
     * No body or auth required — returns full JWT so the guest can use all services.
     */
    @PostMapping("/quick-start")
    public ResponseEntity<LoginResponse> quickStart() {
        LoginResponse response = authService.createQuickSession();
        return ResponseEntity.ok(response);
    }

    /**
     * Links a guest account to a social provider (Google / Apple).
     * Preserves the user's ID and all existing data.
     */
    @PostMapping("/link-account/social")
    public ResponseEntity<LoginResponse> linkAccountWithSocial(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody SocialLoginRequest request) {
        LoginResponse response = authService.linkAccountWithSocial(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Step 1: saves credentials + name, sends a 6-digit OTP to the email address.
     * The account remains GUEST until the OTP is verified.
     */
    @PostMapping("/link-account/email")
    public ResponseEntity<OkResponse> linkAccountWithEmail(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody LinkEmailRequest request) {
        OkResponse response = authService.linkAccountWithEmail(
                userId, request.email(), request.password(), request.firstName(), request.lastName());
        return ResponseEntity.ok(response);
    }

    /**
     * Step 2: verifies the OTP and upgrades the guest account to REGISTERED + ACTIVE.
     */
    @PostMapping("/link-account/email/verify-otp")
    public ResponseEntity<LoginResponse> verifyLinkAccountEmailOtp(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody LinkEmailVerifyOtpRequest request) {
        LoginResponse response = authService.verifyLinkAccountEmailOtp(userId, request.email(), request.code());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody UpdateProfileRequest request) {
        UserDTO updated = authService.updateProfile(userId, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping(value = "/profile/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDTO> uploadAvatar(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam("avatar") MultipartFile avatar) {
        UserDTO updated = authService.uploadAvatar(userId, avatar);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/profile/avatar")
    public ResponseEntity<UserDTO> removeAvatar(@RequestHeader("X-User-Id") Long userId) {
        UserDTO updated = authService.removeAvatar(userId);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/profile/avatar/{userId}")
    public ResponseEntity<Resource> getAvatar(@PathVariable Long userId) {
        Optional<AuthService.AvatarBinary> avatar = authService.getAvatar(userId);
        if (avatar.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AuthService.AvatarBinary payload = avatar.get();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .contentType(payload.mediaType())
                .contentLength(payload.contentLength())
                .body(payload.resource());
    }

    @PostMapping("/set-password")
    public ResponseEntity<UserDTO> setPassword(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody SetPasswordRequest request) {
        UserDTO updated = authService.setPassword(userId, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/change-password")
    public ResponseEntity<UserDTO> changePassword(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        UserDTO updated = authService.changePassword(userId, request);
        return ResponseEntity.ok(updated);
    }

    private ResponseEntity<Void> redirectToApp(AuthService.VerificationOutcome outcome) {
        String location;
        if (outcome == AuthService.VerificationOutcome.SUCCESS) {
            location = publicUrlProperties.appPublicUrl() + APP_BIRTH_DATE_PATH + "?verified=success";
        } else {
            String result = outcome.name().toLowerCase(Locale.ROOT);
            location = publicUrlProperties.appPublicUrl() + APP_VERIFY_RESULT_PATH + result;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(location));
        headers.set(HttpHeaders.CACHE_CONTROL, NO_STORE_CACHE_CONTROL);
        headers.set("Pragma", "no-cache");
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private ResponseEntity<String> htmlOutcome(AuthService.VerificationOutcome outcome) {
        String title;
        String message;
        String ctaHtml;
        String extraScript = "";

        switch (outcome) {
            case SUCCESS -> {
                title = "Email verified";
                message = "Your account is now active. We are opening the app now.";
                String webFallbackUrl = successWebFallbackUrl();
                if (webFallbackUrl != null) {
                    ctaHtml = """
                            <div style=\"display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;\">
                              <a href=\"%s\" style=\"display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; font-weight:700; border-radius:10px; padding:10px 14px;\">Open app</a>
                              <a href=\"%s\" style=\"display:inline-block; border:1px solid #d1d5db; color:#1f2937; text-decoration:none; font-weight:600; border-radius:10px; padding:10px 14px;\">Continue on web birth details</a>
                            </div>
                            """.formatted(htmlEscape(APP_BIRTH_DATE_DEEP_LINK), htmlEscape(webFallbackUrl));
                } else {
                    ctaHtml = """
                            <div style=\"display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;\">
                              <a href=\"%s\" style=\"display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; font-weight:700; border-radius:10px; padding:10px 14px;\">Open app</a>
                            </div>
                            <p style=\"margin:14px 0 0; line-height:1.6; color:#4b5563;\">If the app did not open automatically, open Mystic AI and continue from Birth Date.</p>
                            """.formatted(htmlEscape(APP_BIRTH_DATE_DEEP_LINK));
                }
                extraScript = successRedirectScript(APP_BIRTH_DATE_DEEP_LINK, webFallbackUrl);
            }
            case EXPIRED -> {
                title = "Verification link expired";
                message = "This link is no longer valid. Request a new verification email from the app.";
                ctaHtml = """
                        <p style=\"margin:14px 0 0; line-height:1.6; color:#4b5563;\"><strong>%s</strong></p>
                        """.formatted(htmlEscape("Go back to app and resend verification email"));
            }
            case INVALID -> {
                title = "Invalid verification link";
                message = "This verification link is invalid or has already been used.";
                ctaHtml = """
                        <p style=\"margin:14px 0 0; line-height:1.6; color:#4b5563;\"><strong>%s</strong></p>
                        """.formatted(htmlEscape("Go back to app and request a new link"));
            }
            default -> {
                title = "Verification failed";
                message = "Please request a new verification email.";
                ctaHtml = """
                        <p style=\"margin:14px 0 0; line-height:1.6; color:#4b5563;\"><strong>%s</strong></p>
                        """.formatted(htmlEscape("Go back to app"));
            }
        }

        String html = """
                <!doctype html>
                <html lang=\"en\">
                <head>
                  <meta charset=\"UTF-8\" />
                  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
                  <title>%s</title>
                </head>
                <body style=\"font-family: Arial, sans-serif; background:#f7fafc; padding:24px; color:#1f2937;\">
                  <div style=\"max-width:560px; margin:32px auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:28px;\">
                    <h1 style=\"margin:0 0 12px; font-size:26px;\">%s</h1>
                    <p style=\"margin:0; line-height:1.6; color:#374151;\">%s</p>
                    %s
                  </div>
                  %s
                </body>
                </html>
                """.formatted(
                htmlEscape(title),
                htmlEscape(title),
                htmlEscape(message),
                ctaHtml,
                extraScript
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, NO_STORE_CACHE_CONTROL)
                .header("Pragma", "no-cache")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    private String successWebFallbackUrl() {
        if (!publicUrlProperties.hasAppPublicUrl()) {
            return null;
        }
        return publicUrlProperties.appPublicUrl() + APP_BIRTH_DATE_PATH + "?verified=success";
    }

    private String successRedirectScript(String deepLinkUrl, String fallbackUrl) {
        String safeFallbackUrl = jsStringEscape(fallbackUrl);
        if (fallbackUrl == null || fallbackUrl.isBlank()) {
            return """
                    <script>
                      (function () {
                        var appUrl = '%s';
                        window.location.href = appUrl;
                      })();
                    </script>
                    """.formatted(jsStringEscape(deepLinkUrl));
        }
        return """
                <script>
                  (function () {
                    var appUrl = '%s';
                    var webUrl = '%s';
                    var redirected = false;

                    var timer = window.setTimeout(function () {
                      if (!redirected) {
                        window.location.replace(webUrl);
                      }
                    }, 1500);

                    document.addEventListener('visibilitychange', function () {
                      if (document.hidden) {
                        redirected = true;
                        window.clearTimeout(timer);
                      }
                    });

                    window.location.href = appUrl;
                  })();
                </script>
                """.formatted(jsStringEscape(deepLinkUrl), safeFallbackUrl);
    }

    private ResponseEntity<String> passwordResetPage(String token) {
        String escapedToken = htmlEscape(token);
        String jsToken = jsStringEscape(token);
        String endpoint = jsStringEscape(publicUrlProperties.apiPublicUrl() + "/api/v1/auth/password/reset");
        String webSuccessUrl = jsStringEscape(resolvePasswordResetWebSuccessUrl());

        String html = """
                <!doctype html>
                <html lang="tr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Mystic AI | Şifre Sıfırla</title>
                  <style>
                    :root {
                      --bg: #070b1d;
                      --card: rgba(14, 20, 45, 0.84);
                      --card-border: rgba(157, 78, 221, 0.42);
                      --text: #edf1ff;
                      --sub: #aeb7d9;
                      --accent: #9d4edd;
                      --accent-2: #6d28d9;
                      --field: rgba(9, 14, 34, 0.76);
                      --field-border: rgba(165, 180, 252, 0.33);
                      --ok: #34d399;
                      --err: #fda4af;
                    }
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      min-height: 100vh;
                      display: grid;
                      place-items: center;
                      padding: 24px;
                      color: var(--text);
                      font-family: "Segoe UI", Arial, sans-serif;
                      background:
                        radial-gradient(circle at 15%% 10%%, rgba(157, 78, 221, 0.36), transparent 40%%),
                        radial-gradient(circle at 85%% 18%%, rgba(34, 211, 238, 0.26), transparent 36%%),
                        linear-gradient(170deg, #050915 0%%, #0b1129 56%%, #111a35 100%%);
                    }
                    .card {
                      width: min(560px, 100%%);
                      border-radius: 24px;
                      border: 1px solid var(--card-border);
                      background: var(--card);
                      backdrop-filter: blur(10px);
                      padding: 30px 26px;
                      box-shadow: 0 22px 64px rgba(4, 10, 30, 0.52);
                    }
                    .eyebrow {
                      display: inline-flex;
                      border: 1px solid rgba(237, 241, 255, 0.25);
                      border-radius: 999px;
                      padding: 5px 12px;
                      margin-bottom: 14px;
                      font-size: 12px;
                      letter-spacing: .5px;
                      color: #cfd7ff;
                    }
                    h1 { margin: 0 0 10px; font-size: 30px; letter-spacing: .2px; }
                    p { margin: 0 0 18px; color: var(--sub); line-height: 1.65; }
                    .field { margin-bottom: 14px; }
                    label { display: block; margin-bottom: 8px; font-size: 14px; color: #d7def8; }
                    input {
                      width: 100%%;
                      min-height: 46px;
                      border-radius: 12px;
                      border: 1px solid var(--field-border);
                      background: var(--field);
                      color: var(--text);
                      font-size: 15px;
                      padding: 12px 14px;
                      outline: none;
                    }
                    input:focus {
                      border-color: rgba(157, 78, 221, 0.8);
                      box-shadow: 0 0 0 3px rgba(157, 78, 221, 0.2);
                    }
                    button {
                      width: 100%%;
                      min-height: 48px;
                      border: 0;
                      border-radius: 12px;
                      background: linear-gradient(135deg, var(--accent-2) 0%%, var(--accent) 100%%);
                      color: #fff;
                      font-weight: 700;
                      font-size: 15px;
                      letter-spacing: .15px;
                      cursor: pointer;
                    }
                    button:disabled { opacity: .62; cursor: wait; }
                    .status { margin-top: 12px; font-size: 14px; line-height: 1.55; min-height: 22px; }
                    .ok { color: var(--ok); }
                    .err { color: var(--err); }
                    .hint { margin-top: 12px; font-size: 13px; color: #8ea1d2; }
                    .success-actions { margin-top: 10px; display: none; gap: 10px; flex-wrap: wrap; }
                    .success-actions.visible { display: flex; }
                    .link-btn {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 40px;
                      border-radius: 10px;
                      border: 1px solid rgba(237, 241, 255, 0.24);
                      color: var(--text);
                      text-decoration: none;
                      padding: 8px 12px;
                      font-weight: 600;
                    }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <span class="eyebrow">MYSTIC AI ACCOUNT</span>
                    <h1>Şifreni Yenile</h1>
                    <p>Yeni şifreni belirle. İşlem tamamlandığında uygulama otomatik açılacak, açılamazsa web sayfasına yönlendirileceksin.</p>
                    <form id="reset-form">
                      <input type="hidden" id="token" value="%s" />
                      <div class="field">
                      <label for="newPassword">Yeni Şifre</label>
                      <input id="newPassword" type="password" minlength="8" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}" title="En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 özel karakter" required />
                      </div>
                      <div class="field">
                      <label for="confirmPassword">Yeni Şifre (Tekrar)</label>
                      <input id="confirmPassword" type="password" minlength="8" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}" title="En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 özel karakter" required />
                      </div>
                      <button id="submitBtn" type="submit">Şifreyi Güncelle</button>
                    </form>
                    <p class="hint">En az 8 karakter, en az 1 büyük, 1 küçük ve 1 özel karakter kullan.</p>
                    <div id="status" class="status"></div>
                    <div id="successActions" class="success-actions">
                      <a class="link-btn" href="%s">Uygulamayı Aç</a>
                      <a class="link-btn" id="webContinue" href="%s">Web'e Devam Et</a>
                    </div>
                  </div>
                  <script>
                    (function () {
                      var form = document.getElementById('reset-form');
                      var submitBtn = document.getElementById('submitBtn');
                      var status = document.getElementById('status');
                      var successActions = document.getElementById('successActions');
                      var webContinue = document.getElementById('webContinue');
                      var token = '%s';
                      var endpoint = '%s';
                      var appDeepLink = '%s';
                      var webSuccessUrl = '%s';
                      var strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

                      function startPostSuccessRedirect() {
                        if (successActions) successActions.classList.add('visible');
                        if (!appDeepLink || !webSuccessUrl) return;

                        var redirected = false;
                        var timer = window.setTimeout(function () {
                          if (!redirected) {
                            window.location.replace(webSuccessUrl);
                          }
                        }, 1600);

                        document.addEventListener('visibilitychange', function () {
                          if (document.hidden) {
                            redirected = true;
                            window.clearTimeout(timer);
                          }
                        }, { once: true });

                        window.location.href = appDeepLink;
                      }

                      form.addEventListener('submit', async function (event) {
                        event.preventDefault();
                        status.className = 'status';
                        status.textContent = '';
                        submitBtn.disabled = true;
                        try {
                          var newPasswordValue = document.getElementById('newPassword').value;
                          var confirmPasswordValue = document.getElementById('confirmPassword').value;
                          if (!strongPasswordRegex.test(newPasswordValue)) {
                            status.className = 'status err';
                            status.textContent = 'Şifre kuralı: en az 8 karakter, 1 büyük, 1 küçük, 1 özel karakter.';
                            return;
                          }

                          var payload = {
                            token: token,
                            newPassword: newPasswordValue,
                            confirmPassword: confirmPasswordValue
                          };
                          var response = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          });
                          var data = await response.json().catch(function () { return {}; });
                          if (!response.ok) {
                            var backendMessage = data.message || '';
                            if (backendMessage.indexOf('PASSWORD_WEAK') !== -1) {
                              throw new Error('Şifre kuralı: en az 8 karakter, 1 büyük, 1 küçük, 1 özel karakter.');
                            }
                            if (backendMessage.indexOf('PASSWORDS_DO_NOT_MATCH') !== -1) {
                              throw new Error('Şifreler eşleşmiyor.');
                            }
                            throw new Error(backendMessage || 'Şifre güncellenemedi.');
                          }
                          if (data.status === 'SUCCESS') {
                            status.className = 'status ok';
                            status.textContent = 'Şifre güncellendi. Uygulamaya yönlendiriliyorsun...';
                            startPostSuccessRedirect();
                          } else if (data.status === 'EXPIRED') {
                            status.className = 'status err';
                            status.textContent = 'Bu linkin süresi dolmuş. Uygulamadan yeni bir link iste.';
                          } else {
                            status.className = 'status err';
                            status.textContent = 'Bu şifre sıfırlama linki geçersiz.';
                          }
                        } catch (error) {
                          status.className = 'status err';
                          status.textContent = error.message || 'Şifre güncellenemedi.';
                        } finally {
                          submitBtn.disabled = false;
                        }
                      });

                      if (webContinue && !webSuccessUrl) {
                        webContinue.style.display = 'none';
                      }
                    })();
                  </script>
                </body>
                </html>
                """.formatted(
                escapedToken,
                htmlEscape(APP_LOGIN_DEEP_LINK),
                htmlEscape(resolvePasswordResetWebSuccessUrl()),
                jsToken,
                endpoint,
                jsStringEscape(APP_LOGIN_DEEP_LINK),
                webSuccessUrl
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, NO_STORE_CACHE_CONTROL)
                .header("Pragma", "no-cache")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    private String resolvePasswordResetWebSuccessUrl() {
        if (publicUrlProperties.hasAppPublicUrl()) {
            return publicUrlProperties.appPublicUrl();
        }
        return publicUrlProperties.apiPublicUrl() + PASSWORD_RESET_SUCCESS_PATH;
    }

    private static String htmlEscape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static String jsStringEscape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("'", "\\'");
    }
}
