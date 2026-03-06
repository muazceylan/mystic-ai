package com.mysticai.auth.exception.domain;

public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException() {
        super("EMAIL_NOT_VERIFIED");
    }
}
