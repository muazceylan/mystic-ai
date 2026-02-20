package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "dream_symbols", indexes = {
        @Index(name = "idx_dream_symbols_user_id", columnList = "user_id"),
        @Index(name = "idx_dream_symbols_user_symbol", columnList = "user_id, symbol_name", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DreamSymbol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "symbol_name", nullable = false)
    private String symbolName;

    @Column(name = "count", nullable = false)
    private Integer count;

    @Column(name = "last_seen_date")
    private LocalDate lastSeenDate;
}
