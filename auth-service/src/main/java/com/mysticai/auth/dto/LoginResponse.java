package com.mysticai.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserDTO user
) {
    public LoginResponse(String accessToken, String refreshToken, long expiresIn, UserDTO user) {
        this(accessToken, refreshToken, "Bearer", expiresIn, user);
    }
}
