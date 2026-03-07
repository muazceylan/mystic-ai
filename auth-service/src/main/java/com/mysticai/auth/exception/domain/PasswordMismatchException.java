package com.mysticai.auth.exception.domain;

public class PasswordMismatchException extends RuntimeException {

    public PasswordMismatchException() {
        super("PASSWORDS_DO_NOT_MATCH");
    }
}
