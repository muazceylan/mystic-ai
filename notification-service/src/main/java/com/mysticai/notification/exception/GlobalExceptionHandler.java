package com.mysticai.notification.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Global exception handler for Notification Service.
 * Provides consistent error responses across the service.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(ResponseStatusException ex) {
        int statusCode = ex.getStatusCode().value();
        HttpStatus status = HttpStatus.resolve(statusCode);
        HttpStatus fallbackStatus = status != null ? status : HttpStatus.BAD_REQUEST;
        String message = ex.getReason() != null ? ex.getReason() : fallbackStatus.getReasonPhrase();

        ErrorResponse error = new ErrorResponse(
                UUID.randomUUID().toString(),
                statusCode,
                fallbackStatus.getReasonPhrase(),
                message,
                LocalDateTime.now()
        );

        return ResponseEntity.status(statusCode).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
        StringBuilder builder = new StringBuilder("Validation failed");
        if (!ex.getBindingResult().getFieldErrors().isEmpty()) {
            builder.append(": ");
            builder.append(
                    ex.getBindingResult().getFieldErrors().stream()
                            .map(FieldError::getField)
                            .distinct()
                            .limit(3)
                            .reduce((left, right) -> left + ", " + right)
                            .orElse("invalid input")
            );
        }

        ErrorResponse error = new ErrorResponse(
                UUID.randomUUID().toString(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                builder.toString(),
                LocalDateTime.now()
        );

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred: {}", ex.getMessage(), ex);
        
        ErrorResponse error = new ErrorResponse(
                UUID.randomUUID().toString(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected error occurred. Please try again later.",
                LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Invalid argument: {}", ex.getMessage());
        
        ErrorResponse error = new ErrorResponse(
                UUID.randomUUID().toString(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(SecurityException ex) {
        log.warn("Security violation: {}", ex.getMessage());
        
        ErrorResponse error = new ErrorResponse(
                UUID.randomUUID().toString(),
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage(),
                LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Error response record for consistent API error format.
     */
    public record ErrorResponse(
            String errorId,
            int status,
            String error,
            String message,
            LocalDateTime timestamp
    ) {}
}
