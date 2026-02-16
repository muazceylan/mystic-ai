package com.mysticai.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserDTO user,
        boolean isNewUser
) {
    public LoginResponse(String accessToken, String refreshToken, long expiresIn, UserDTO user) {
        this(accessToken, refreshToken, "Bearer", expiresIn, user, false);
    }

    public LoginResponse(String accessToken, String refreshToken, long expiresIn, UserDTO user, boolean isNewUser) {
        this(accessToken, refreshToken, "Bearer", expiresIn, user, isNewUser);
    }
}
