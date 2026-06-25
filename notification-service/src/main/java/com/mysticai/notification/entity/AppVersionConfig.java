package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

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

    @Builder.Default
    private boolean forceUpdate = false;

    @Column(columnDefinition = "TEXT")
    private String iosStoreUrl;

    @Column(columnDefinition = "TEXT")
    private String androidStoreUrl;

    @Column(columnDefinition = "TEXT")
    private String androidWebStoreUrl;

    @Column(columnDefinition = "TEXT")
    private String message;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
