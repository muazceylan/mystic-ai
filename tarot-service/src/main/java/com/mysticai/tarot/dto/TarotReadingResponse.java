package com.mysticai.tarot.dto;

import com.mysticai.tarot.entity.TarotReading;

import java.time.LocalDateTime;

public record TarotReadingResponse(
        Long id,
        String question,
        String spreadType,
        DrawnCardDTO pastCard,
        DrawnCardDTO presentCard,
        DrawnCardDTO futureCard,
        String interpretation,
        String status,
        LocalDateTime createdAt
) {
    public static TarotReadingResponseBuilder builder() {
        return new TarotReadingResponseBuilder();
    }

    public static class TarotReadingResponseBuilder {
        private Long id;
        private String question;
        private String spreadType;
        private DrawnCardDTO pastCard;
        private DrawnCardDTO presentCard;
        private DrawnCardDTO futureCard;
        private String interpretation;
        private String status;
        private LocalDateTime createdAt;

        public TarotReadingResponseBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public TarotReadingResponseBuilder question(String question) {
            this.question = question;
            return this;
        }

        public TarotReadingResponseBuilder spreadType(String spreadType) {
            this.spreadType = spreadType;
            return this;
        }

        public TarotReadingResponseBuilder pastCard(DrawnCardDTO pastCard) {
            this.pastCard = pastCard;
            return this;
        }

        public TarotReadingResponseBuilder presentCard(DrawnCardDTO presentCard) {
            this.presentCard = presentCard;
            return this;
        }

        public TarotReadingResponseBuilder futureCard(DrawnCardDTO futureCard) {
            this.futureCard = futureCard;
            return this;
        }

        public TarotReadingResponseBuilder interpretation(String interpretation) {
            this.interpretation = interpretation;
            return this;
        }

        public TarotReadingResponseBuilder status(String status) {
            this.status = status;
            return this;
        }

        public TarotReadingResponseBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public TarotReadingResponse build() {
            return new TarotReadingResponse(id, question, spreadType, pastCard, presentCard, futureCard, interpretation, status, createdAt);
        }
    }
}
