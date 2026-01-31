package com.mysticai.tarot.dto;

public record DrawnCardDTO(
        TarotCardDTO card,
        String position,
        boolean reversed
) {
    public enum Position {
        PAST("Past"),
        PRESENT("Present"),
        FUTURE("Future");

        private final String displayName;

        Position(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
