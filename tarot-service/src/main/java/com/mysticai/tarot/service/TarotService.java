package com.mysticai.tarot.service;

import com.mysticai.tarot.dto.*;
import com.mysticai.tarot.entity.TarotCard;
import com.mysticai.tarot.entity.TarotReading;
import com.mysticai.tarot.repository.TarotCardRepository;
import com.mysticai.tarot.repository.TarotReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class TarotService {

    private final TarotCardRepository cardRepository;
    private final TarotReadingRepository readingRepository;
    private final Random random = new Random();

    public List<TarotCardDTO> getAllCards() {
        return cardRepository.findAll().stream()
                .map(TarotCardDTO::from)
                .toList();
    }

    public TarotCardDTO getCardById(Long id) {
        return cardRepository.findById(id)
                .map(TarotCardDTO::from)
                .orElseThrow(() -> new IllegalArgumentException("Card not found: " + id));
    }

    public List<TarotCardDTO> getCardsByArcana(String arcana) {
        TarotCard.Arcana arcanaEnum = TarotCard.Arcana.valueOf(arcana.toUpperCase());
        return cardRepository.findByArcana(arcanaEnum).stream()
                .map(TarotCardDTO::from)
                .toList();
    }

    @Transactional
    public TarotReadingResponse createThreeCardReading(String userId, TarotReadingRequest request) {
        List<TarotCard> randomCards = cardRepository.findRandomCards(3);

        if (randomCards.size() < 3) {
            throw new IllegalStateException("Not enough cards in database. Please ensure cards are loaded.");
        }

        TarotCard pastCard = randomCards.get(0);
        TarotCard presentCard = randomCards.get(1);
        TarotCard futureCard = randomCards.get(2);

        boolean pastReversed = random.nextBoolean();
        boolean presentReversed = random.nextBoolean();
        boolean futureReversed = random.nextBoolean();

        TarotReading reading = TarotReading.builder()
                .userId(userId)
                .question(request.question())
                .spreadType(TarotReading.SpreadType.THREE_CARD)
                .pastCardId(pastCard.getId())
                .pastReversed(pastReversed)
                .presentCardId(presentCard.getId())
                .presentReversed(presentReversed)
                .futureCardId(futureCard.getId())
                .futureReversed(futureReversed)
                .status(TarotReading.ReadingStatus.PENDING)
                .build();

        TarotReading savedReading = readingRepository.save(reading);
        log.info("Created three-card reading with ID: {} for user: {}", savedReading.getId(), userId);

        return buildReadingResponse(savedReading, pastCard, presentCard, futureCard);
    }

    public TarotReadingResponse getReadingById(Long id) {
        TarotReading reading = readingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found: " + id));

        TarotCard pastCard = cardRepository.findById(reading.getPastCardId()).orElse(null);
        TarotCard presentCard = cardRepository.findById(reading.getPresentCardId()).orElse(null);
        TarotCard futureCard = cardRepository.findById(reading.getFutureCardId()).orElse(null);

        return buildReadingResponse(reading, pastCard, presentCard, futureCard);
    }

    public List<TarotReadingResponse> getUserReadings(String userId) {
        return readingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(reading -> {
                    TarotCard pastCard = cardRepository.findById(reading.getPastCardId()).orElse(null);
                    TarotCard presentCard = cardRepository.findById(reading.getPresentCardId()).orElse(null);
                    TarotCard futureCard = cardRepository.findById(reading.getFutureCardId()).orElse(null);
                    return buildReadingResponse(reading, pastCard, presentCard, futureCard);
                })
                .toList();
    }

    public AiInterpretationRequest prepareForAiInterpretation(Long readingId) {
        TarotReading reading = readingRepository.findById(readingId)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found: " + readingId));

        TarotCard pastCard = cardRepository.findById(reading.getPastCardId())
                .orElseThrow(() -> new IllegalStateException("Past card not found"));
        TarotCard presentCard = cardRepository.findById(reading.getPresentCardId())
                .orElseThrow(() -> new IllegalStateException("Present card not found"));
        TarotCard futureCard = cardRepository.findById(reading.getFutureCardId())
                .orElseThrow(() -> new IllegalStateException("Future card not found"));

        List<AiInterpretationRequest.CardForInterpretation> cards = List.of(
                new AiInterpretationRequest.CardForInterpretation(
                        pastCard.getName(),
                        "Past",
                        reading.getPastReversed(),
                        reading.getPastReversed() ? pastCard.getReversedKeywords() : pastCard.getUprightKeywords()
                ),
                new AiInterpretationRequest.CardForInterpretation(
                        presentCard.getName(),
                        "Present",
                        reading.getPresentReversed(),
                        reading.getPresentReversed() ? presentCard.getReversedKeywords() : presentCard.getUprightKeywords()
                ),
                new AiInterpretationRequest.CardForInterpretation(
                        futureCard.getName(),
                        "Future",
                        reading.getFutureReversed(),
                        reading.getFutureReversed() ? futureCard.getReversedKeywords() : futureCard.getUprightKeywords()
                )
        );

        log.info("Prepared reading {} for AI interpretation", readingId);
        return new AiInterpretationRequest(readingId, reading.getQuestion(), cards);
    }

    @Transactional
    public void updateReadingInterpretation(Long readingId, String interpretation) {
        TarotReading reading = readingRepository.findById(readingId)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found: " + readingId));

        reading.setInterpretation(interpretation);
        reading.setStatus(TarotReading.ReadingStatus.COMPLETED);
        readingRepository.save(reading);

        log.info("Updated reading {} with AI interpretation", readingId);
    }

    @Transactional
    public void markReadingAsProcessing(Long readingId) {
        TarotReading reading = readingRepository.findById(readingId)
                .orElseThrow(() -> new IllegalArgumentException("Reading not found: " + readingId));

        reading.setStatus(TarotReading.ReadingStatus.PROCESSING);
        readingRepository.save(reading);
    }

    private TarotReadingResponse buildReadingResponse(
            TarotReading reading,
            TarotCard pastCard,
            TarotCard presentCard,
            TarotCard futureCard
    ) {
        return TarotReadingResponse.builder()
                .id(reading.getId())
                .question(reading.getQuestion())
                .spreadType(reading.getSpreadType().name())
                .pastCard(pastCard != null ? new DrawnCardDTO(
                        TarotCardDTO.from(pastCard),
                        "Past",
                        reading.getPastReversed()
                ) : null)
                .presentCard(presentCard != null ? new DrawnCardDTO(
                        TarotCardDTO.from(presentCard),
                        "Present",
                        reading.getPresentReversed()
                ) : null)
                .futureCard(futureCard != null ? new DrawnCardDTO(
                        TarotCardDTO.from(futureCard),
                        "Future",
                        reading.getFutureReversed()
                ) : null)
                .interpretation(reading.getInterpretation())
                .status(reading.getStatus().name())
                .createdAt(reading.getCreatedAt())
                .build();
    }
}
