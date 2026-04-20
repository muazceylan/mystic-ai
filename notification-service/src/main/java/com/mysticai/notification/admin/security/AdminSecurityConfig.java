package com.mysticai.notification.admin.security;

import com.mysticai.notification.security.UserJwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class AdminSecurityConfig {

    private final AdminJwtFilter adminJwtFilter;

    /**
     * WHY: UserJwtFilter validates the user Bearer token for rewarded-ads endpoints,
     * independently of the API gateway's X-User-Id injection. This closes the trust
     * gap when notification-service is called directly (bypassing the gateway).
     */
    private final UserJwtFilter userJwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)  // CORS handled exclusively by API Gateway
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/admin/v1/auth/login").permitAll()
                        .requestMatchers("/api/v1/notifications/health").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        // Audit log: SUPER_ADMIN + PRODUCT_ADMIN only
                        .requestMatchers("/api/admin/v1/audit-logs/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Route registry: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/routes/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Notifications: SUPER_ADMIN + NOTIFICATION_MANAGER
                        .requestMatchers("/api/admin/v1/notifications/**")
                                .hasAnyRole("SUPER_ADMIN", "NOTIFICATION_MANAGER")
                        // Dashboard: all admin roles
                        .requestMatchers("/api/admin/v1/dashboard/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN", "NOTIFICATION_MANAGER")
                        // Product analytics: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/product-analytics/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Auth me
                        .requestMatchers("/api/admin/v1/auth/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN", "NOTIFICATION_MANAGER")
                        // Admin user management: SUPER_ADMIN only
                        .requestMatchers("/api/admin/v1/admin-users/**")
                                .hasRole("SUPER_ADMIN")
                        // Module management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/modules/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Navigation management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/navigation/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // CMS content management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/weekly-horoscopes/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        .requestMatchers("/api/admin/v1/daily-horoscopes/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        .requestMatchers("/api/admin/v1/prayers/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // CMS home/explore/banner management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/home-sections/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        .requestMatchers("/api/admin/v1/explore-categories/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        .requestMatchers("/api/admin/v1/explore-cards/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        .requestMatchers("/api/admin/v1/banners/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Tutorial config management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/tutorial-configs/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Monetization management: SUPER_ADMIN + PRODUCT_ADMIN
                        .requestMatchers("/api/admin/v1/monetization/**")
                                .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
                        // Public CMS content endpoints — no auth required
                        .requestMatchers("/api/v1/content/**").permitAll()
                        // Public monetization config — anonymous access allowed
                        .requestMatchers("/api/v1/monetization/config").permitAll()
                        .requestMatchers("/api/v1/monetization/modules/**").permitAll()
                        // Authenticated monetization endpoints — protected by gateway JWT
                        // (X-User-Id injected by gateway; no admin JWT required here)
                        .requestMatchers("/api/v1/monetization/**").permitAll()
                        // Rewarded ads endpoints — protected by gateway JWT (X-User-Id required)
                        .requestMatchers("/api/v1/monetization/rewarded-ads/**").permitAll()
                        // Public app config — no auth required
                        .requestMatchers("/api/v1/app-config").permitAll()
                        // Public tutorial config endpoint — no auth required
                        .requestMatchers("/api/v1/tutorial-configs", "/api/v1/tutorial-configs/**").permitAll()
                        // Public lightweight analytics ingestion for screen tracking
                        .requestMatchers("/api/v1/analytics/**").permitAll()
                        // User-facing notification endpoints are protected by gateway trust filter
                        .requestMatchers("/api/v1/notifications/**").permitAll()
                        .anyRequest().denyAll()
                )
                // AdminJwtFilter handles /api/admin/v1/** paths.
                // UserJwtFilter handles /api/v1/monetization/rewarded-ads/** paths.
                // Both run before Spring's UsernamePasswordAuthenticationFilter.
                // UserJwtFilter is registered first so its SecurityContext set takes effect
                // before AdminJwtFilter potentially overwrites it on overlapping paths (none exist).
                .addFilterBefore(userJwtFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminJwtFilter, UserJwtFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


}
