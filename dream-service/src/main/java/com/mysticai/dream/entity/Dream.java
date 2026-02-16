package com.mysticai.dream.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dreams")
public class Dream {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "dream_text", nullable = false, columnDefinition = "TEXT")
    private String dreamText;

    @Column(nullable = false)
    private String mood;

    @Column(name = "dream_date", nullable = false)
    private LocalDate dreamDate;

    @Column(name = "interpretation_status")
    @Enumerated(EnumType.STRING)
    private InterpretationStatus interpretationStatus = InterpretationStatus.PENDING;

    @Column(name = "interpretation", columnDefinition = "TEXT")
    private String interpretation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum InterpretationStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (dreamDate == null) {
            dreamDate = LocalDate.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDreamText() {
        return dreamText;
    }

    public void setDreamText(String dreamText) {
        this.dreamText = dreamText;
    }

    public String getMood() {
        return mood;
    }

    public void setMood(String mood) {
        this.mood = mood;
    }

    public LocalDate getDreamDate() {
        return dreamDate;
    }

    public void setDreamDate(LocalDate dreamDate) {
        this.dreamDate = dreamDate;
    }

    public InterpretationStatus getInterpretationStatus() {
        return interpretationStatus;
    }

    public void setInterpretationStatus(InterpretationStatus interpretationStatus) {
        this.interpretationStatus = interpretationStatus;
    }

    public String getInterpretation() {
        return interpretation;
    }

    public void setInterpretation(String interpretation) {
        this.interpretation = interpretation;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
