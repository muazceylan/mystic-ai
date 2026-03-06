package com.mysticai.auth.controller;

import com.mysticai.auth.config.properties.DeploymentEnv;
import com.mysticai.auth.config.properties.PublicUrlProperties;
import com.mysticai.auth.dto.CheckEmailRequest;
import com.mysticai.auth.dto.CheckEmailResponse;
import com.mysticai.auth.dto.LoginRequest;
import com.mysticai.auth.dto.LoginResponse;
import com.mysticai.auth.dto.RegisterRequest;
import com.mysticai.auth.dto.SocialLoginRequest;
import com.mysticai.auth.dto.UpdateProfileRequest;
import com.mysticai.auth.dto.UserDTO;
import com.mysticai.auth.dto.verification.OkResponse;
import com.mysticai.auth.dto.verification.RegisterResponse;
import com.mysticai.auth.dto.verification.ResendVerificationRequest;
import com.mysticai.auth.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Locale;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private static final String NO_STORE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, max-age=0";
    private static final String APP_BIRTH_DATE_PATH = "/birth-date";
    private static final String APP_VERIFY_RESULT_PATH = "/verify-email?result=";
    private static final String APP_BIRTH_DATE_DEEP_LINK = "mystic-ai://birth-date";

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

    @PostMapping("/social-login")
    public ResponseEntity<LoginResponse> socialLogin(@Valid @RequestBody SocialLoginRequest request) {
        LoginResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody UpdateProfileRequest request) {
        UserDTO updated = authService.updateProfile(userId, request);
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
