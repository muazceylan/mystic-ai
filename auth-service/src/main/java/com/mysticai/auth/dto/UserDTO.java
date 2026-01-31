package com.mysticai.auth.dto;

import java.time.LocalDateTime;
import java.util.Set;

public record UserDTO(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        Set<String> roles,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
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
        private String firstName;
        private String lastName;
        private Set<String> roles;
        private boolean enabled;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public UserDTOBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public UserDTOBuilder username(String username) {
            this.username = username;
            return this;
        }

        public UserDTOBuilder email(String email) {
            this.email = email;
            return this;
        }

        public UserDTOBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        public UserDTOBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        public UserDTOBuilder roles(Set<String> roles) {
            this.roles = roles;
            return this;
        }

        public UserDTOBuilder enabled(boolean enabled) {
            this.enabled = enabled;
            return this;
        }

        public UserDTOBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public UserDTOBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public UserDTO build() {
            return new UserDTO(id, username, email, firstName, lastName, roles, enabled, createdAt, updatedAt);
        }
    }
}
