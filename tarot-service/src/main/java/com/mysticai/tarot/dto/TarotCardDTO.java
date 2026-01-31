package com.mysticai.tarot.dto;

import com.mysticai.tarot.entity.TarotCard;

public record TarotCardDTO(
        Long id,
        String name,
        String arcana,
        String suit,
        Integer number,
        String uprightKeywords,
        String reversedKeywords,
        String imageUrl
) {
    public static TarotCardDTO from(TarotCard card) {
        return new TarotCardDTO(
                card.getId(),
                card.getName(),
                card.getArcana().name(),
                card.getSuit() != null ? card.getSuit().name() : null,
                card.getNumber(),
                card.getUprightKeywords(),
                card.getReversedKeywords(),
                card.getImageUrl()
        );
    }
}
