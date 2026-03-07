package com.mysticai.auth.exception.domain;

public class PasswordAlreadySetException extends RuntimeException {

    public PasswordAlreadySetException() {
        super("PASSWORD_ALREADY_SET");
    }
}
