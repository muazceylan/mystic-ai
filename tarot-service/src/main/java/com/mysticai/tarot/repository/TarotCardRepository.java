package com.mysticai.tarot.repository;

import com.mysticai.tarot.entity.TarotCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TarotCardRepository extends JpaRepository<TarotCard, Long> {

    Optional<TarotCard> findByName(String name);

    List<TarotCard> findByArcana(TarotCard.Arcana arcana);

    List<TarotCard> findBySuit(TarotCard.Suit suit);

    @Query(value = "SELECT * FROM tarot_cards ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<TarotCard> findRandomCards(int count);
}
