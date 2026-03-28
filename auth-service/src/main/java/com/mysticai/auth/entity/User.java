package com.mysticai.auth.entity;

import com.mysticai.auth.entity.enums.AccountStatus;
import com.mysticai.auth.entity.enums.UserType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider", "social_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "provider", length = 20)
    private String provider;

    @Column(name = "social_id", length = 255)
    private String socialId;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "birth_time", length = 10)
    private String birthTime;

    @Column(name = "birth_location", length = 200)
    private String birthLocation;

    @Column(name = "birth_country", length = 10)
    private String birthCountry;

    @Column(name = "birth_city", length = 100)
    private String birthCity;

    @Column(name = "birth_time_unknown")
    private Boolean birthTimeUnknown;

    @Column(name = "timezone", length = 50)
    private String timezone;

    @Column(name = "gender", length = 30)
    private String gender;

    @Column(name = "marital_status", length = 30)
    private String maritalStatus;

    @Column(name = "zodiac_sign", length = 50)
    private String zodiacSign;

    @Column(name = "avatar_path", length = 512)
    private String avatarPath;

    @Column(name = "preferred_language", length = 5)
    @Builder.Default
    private String preferredLanguage = "tr";

    @Column(name = "has_local_password")
    @Builder.Default
    private Boolean hasLocalPassword = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Builder.Default
    private Set<String> roles = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 32)
    @Builder.Default
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    @Builder.Default
    private UserType userType = UserType.REGISTERED;

    @Column(name = "is_anonymous")
    @Builder.Default
    private Boolean isAnonymous = false;

    @Column(name = "is_account_linked")
    @Builder.Default
    private Boolean isAccountLinked = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
