package com.mysticai.auth.validation;

public final class PasswordPolicy {

    private PasswordPolicy() {
    }

    public static final String STRONG_PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$";
    public static final String WEAK_PASSWORD_CODE = "PASSWORD_WEAK";
}
