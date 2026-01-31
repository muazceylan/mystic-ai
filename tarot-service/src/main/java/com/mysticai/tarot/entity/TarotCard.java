package com.mysticai.tarot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tarot_cards")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarotCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Arcana arcana;

    @Enumerated(EnumType.STRING)
    private Suit suit;

    @Column(name = "card_number")
    private Integer number;

    @Column(name = "upright_keywords")
    private String uprightKeywords;

    @Column(name = "reversed_keywords")
    private String reversedKeywords;

    @Column(name = "image_url")
    private String imageUrl;

    public enum Arcana {
        MAJOR, MINOR
    }

    public enum Suit {
        WANDS, CUPS, SWORDS, PENTACLES
    }
}
