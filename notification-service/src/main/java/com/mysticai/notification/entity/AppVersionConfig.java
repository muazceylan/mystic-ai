package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Admin-managed update policy for one mobile platform ("ios" / "android").
 *
 * <p>This row never stores the version a user currently has installed — the app reads that from
 * its own native package metadata and sends it with the check. Only the policy lives here.
 */
@Entity
@Table(name = "app_version_config")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppVersionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String platform;

    @Column(nullable = false, length = 20)
    private String minSupportedVersion;

    @Column(nullable = false, length = 20)
    private String latestVersion;

    /** Store build number of {@link #latestVersion} (Android versionCode / iOS CFBundleVersion). */
    @Builder.Default
    @Column(nullable = false)
    private Integer latestBuild = 0;

    /** Oldest build still allowed to run. Installed builds below this are force-updated. */
    @Builder.Default
    @Column(nullable = false)
    private Integer minSupportedBuild = 0;

    /** Master switch for enforcing {@link #minSupportedBuild} / {@link #minSupportedVersion}. */
    @Builder.Default
    private boolean forceUpdate = false;

    /** When false, users below the latest build are left alone instead of being nudged. */
    @Builder.Default
    @Column(nullable = false)
    private boolean optionalUpdateEnabled = true;

    @Column(columnDefinition = "TEXT")
    private String iosStoreUrl;

    @Column(columnDefinition = "TEXT")
    private String androidStoreUrl;

    @Column(columnDefinition = "TEXT")
    private String androidWebStoreUrl;

    /** Legacy single-locale message. Kept so app builds older than the localized policy still work. */
    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 200)
    private String titleTr;

    @Column(columnDefinition = "TEXT")
    private String messageTr;

    @Column(length = 200)
    private String titleEn;

    @Column(columnDefinition = "TEXT")
    private String messageEn;

    private Long updatedBy;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
