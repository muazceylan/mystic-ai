package com.mysticai.auth.exception.domain;

public class WrongPasswordException extends RuntimeException {

    public WrongPasswordException() {
        super("WRONG_CURRENT_PASSWORD");
    }
}
