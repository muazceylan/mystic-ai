package com.mysticai.auth.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record UserDTO(
        Long id,
        String username,
        String email,
        String accountStatus,
        LocalDateTime emailVerifiedAt,
        String firstName,
        String lastName,
        String name,
        LocalDate birthDate,
        String birthTime,
        String birthLocation,
        String birthCountry,
        String birthCity,
        Boolean birthTimeUnknown,
        String timezone,
        String gender,
        String maritalStatus,
        String zodiacSign,
        String avatarUri,
        String avatarUrl,
        String preferredLanguage,
        Set<String> roles,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean hasPassword,
        String provider,
        String userType,
        boolean isAnonymous,
        boolean isAccountLinked
) {
    public UserDTO {
        roles = roles != null ? Set.copyOf(roles) : Set.of();
    }

    public static UserDTOBuilder builder() {
        return new UserDTOBuilder();
    }

    public static class UserDTOBuilder {
        private Long id;
        private String username;
        private String email;
        private String accountStatus;
        private LocalDateTime emailVerifiedAt;
        private String firstName;
        private String lastName;
        private String name;
        private LocalDate birthDate;
        private String birthTime;
        private String birthLocation;
        private String birthCountry;
        private String birthCity;
        private Boolean birthTimeUnknown;
        private String timezone;
        private String gender;
        private String maritalStatus;
        private String zodiacSign;
        private String avatarUri;
        private String avatarUrl;
        private String preferredLanguage;
        private Set<String> roles;
        private boolean enabled;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private boolean hasPassword;
        private String provider;
        private String userType;
        private boolean isAnonymous;
        private boolean isAccountLinked;

        public UserDTOBuilder id(Long id) { this.id = id; return this; }
        public UserDTOBuilder username(String username) { this.username = username; return this; }
        public UserDTOBuilder email(String email) { this.email = email; return this; }
        public UserDTOBuilder accountStatus(String accountStatus) { this.accountStatus = accountStatus; return this; }
        public UserDTOBuilder emailVerifiedAt(LocalDateTime emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; return this; }
        public UserDTOBuilder firstName(String firstName) { this.firstName = firstName; return this; }
        public UserDTOBuilder lastName(String lastName) { this.lastName = lastName; return this; }
        public UserDTOBuilder name(String name) { this.name = name; return this; }
        public UserDTOBuilder birthDate(LocalDate birthDate) { this.birthDate = birthDate; return this; }
        public UserDTOBuilder birthTime(String birthTime) { this.birthTime = birthTime; return this; }
        public UserDTOBuilder birthLocation(String birthLocation) { this.birthLocation = birthLocation; return this; }
        public UserDTOBuilder birthCountry(String birthCountry) { this.birthCountry = birthCountry; return this; }
        public UserDTOBuilder birthCity(String birthCity) { this.birthCity = birthCity; return this; }
        public UserDTOBuilder birthTimeUnknown(Boolean birthTimeUnknown) { this.birthTimeUnknown = birthTimeUnknown; return this; }
        public UserDTOBuilder timezone(String timezone) { this.timezone = timezone; return this; }
        public UserDTOBuilder gender(String gender) { this.gender = gender; return this; }
        public UserDTOBuilder maritalStatus(String maritalStatus) { this.maritalStatus = maritalStatus; return this; }
        public UserDTOBuilder zodiacSign(String zodiacSign) { this.zodiacSign = zodiacSign; return this; }
        public UserDTOBuilder avatarUri(String avatarUri) { this.avatarUri = avatarUri; return this; }
        public UserDTOBuilder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public UserDTOBuilder preferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; return this; }
        public UserDTOBuilder roles(Set<String> roles) { this.roles = roles; return this; }
        public UserDTOBuilder enabled(boolean enabled) { this.enabled = enabled; return this; }
        public UserDTOBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public UserDTOBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public UserDTOBuilder hasPassword(boolean hasPassword) { this.hasPassword = hasPassword; return this; }
        public UserDTOBuilder provider(String provider) { this.provider = provider; return this; }
        public UserDTOBuilder userType(String userType) { this.userType = userType; return this; }
        public UserDTOBuilder isAnonymous(boolean isAnonymous) { this.isAnonymous = isAnonymous; return this; }
        public UserDTOBuilder isAccountLinked(boolean isAccountLinked) { this.isAccountLinked = isAccountLinked; return this; }

        public UserDTO build() {
            return new UserDTO(id, username, email, accountStatus, emailVerifiedAt, firstName, lastName, name,
                    birthDate, birthTime, birthLocation,
                    birthCountry, birthCity, birthTimeUnknown, timezone, gender, maritalStatus,
                    zodiacSign, avatarUri, avatarUrl, preferredLanguage,
                    roles, enabled, createdAt, updatedAt, hasPassword, provider,
                    userType, isAnonymous, isAccountLinked);
        }
    }
}
