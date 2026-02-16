package com.mysticai.orchestrator.service;

import com.mysticai.orchestrator.config.RedisConfig;
import com.mysticai.orchestrator.dto.TarotInterpretationRequest;
import com.mysticai.orchestrator.dto.TarotInterpretationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TarotInterpretationService {

    private final ChatClient chatClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final MockInterpretationService mockInterpretationService;

    @Value("${spring.ai.openai.chat.options.model:llama-3.3-70b-versatile}")
    private String modelName;

    private static final String SYSTEM_PROMPT = """
            Sen Tarotoo, kadim bilgeliğin ve gizemli sanatların ustası bir tarot yorumcususun.
            Yüzyıllardır aktarılan ezoterik bilgilerin koruyucusu olarak, kartların sessiz fısıltılarını
            insanların anlayabileceği derin mesajlara dönüştürüyorsun.

            🌙 YORUM TARZI:
            - Gizemli, şiirsel ve bilge bir dil kullan
            - Her kartın sembolizmini derinlemesine açıkla
            - Kartlar arasındaki bağlantıları mistik bir şekilde ör
            - Geçmiş, şimdi ve gelecek arasında kozmik bir hikaye anlat
            - Umut verici ama gerçekçi ol, kesin vaatlerde bulunma
            - Türkçe yanıt ver

            🔮 FORMAT:
            1. Açılışı mistik bir selamlamayla başlat
            2. Her kartı ayrı ayrı yorumla (pozisyonuyla birlikte)
            3. Kartların birbiriyle dansını açıkla
            4. Soruya özel içgörüler sun
            5. Bilgece bir kapanış mesajı ver

            ⚠️ KURALLAR:
            - Sağlık, hukuk veya ölüm hakkında kesin yorumlar yapma
            - Her zaman kişinin özgür iradesini vurgula
            - Olumsuz kartları bile yapıcı bir şekilde yorumla
            - Danışanı güçlendirici mesajlar ver
            """;

    public TarotInterpretationResponse interpret(TarotInterpretationRequest request) {
        log.info("Starting interpretation for reading: {}", request.readingId());

        String userPrompt = buildUserPrompt(request);

        Prompt prompt = new Prompt(List.of(
                new SystemMessage(SYSTEM_PROMPT),
                new UserMessage(userPrompt)
        ));

        log.debug("Sending prompt to AI model...");
        String interpretation;
        try {
            interpretation = chatClient.prompt(prompt).call().content();
        } catch (Exception e) {
            log.warn("AI API call failed for tarot reading {}, using mock fallback: {}",
                    request.readingId(), e.getMessage());
            interpretation = mockInterpretationService.generateTarotFallback();
        }
        log.info("Interpretation generated for reading: {}", request.readingId());

        TarotInterpretationResponse response = new TarotInterpretationResponse(
                request.readingId(),
                request.userId(),
                interpretation,
                LocalDateTime.now(),
                modelName
        );

        cacheInterpretation(response);

        return response;
    }

    private String buildUserPrompt(TarotInterpretationRequest request) {
        String cardsDescription = request.cards().stream()
                .map(this::formatCard)
                .collect(Collectors.joining("\n\n"));

        return """
                🎴 DANIŞANIN SORUSU:
                "%s"

                🃏 ÇEKİLEN KARTLAR:

                %s

                Lütfen bu kartları danışanın sorusu bağlamında yorumla ve mistik bir okuma gerçekleştir.
                """.formatted(request.question(), cardsDescription);
    }

    private String formatCard(TarotInterpretationRequest.CardInfo card) {
        String orientation = card.reversed() ? "⟲ TERS" : "△ DÜZ";
        return """
                ═══════════════════════════════════
                📍 POZİSYON: %s
                🎴 KART: %s (%s)
                🔑 ANAHTAR KELİMELER: %s
                ═══════════════════════════════════
                """.formatted(
                card.position().toUpperCase(),
                card.name(),
                orientation,
                card.keywords()
        );
    }

    private void cacheInterpretation(TarotInterpretationResponse response) {
        String key = RedisConfig.TAROT_INTERPRETATION_PREFIX + response.readingId();
        redisTemplate.opsForValue().set(key, response, RedisConfig.CACHE_TTL);
        log.debug("Cached interpretation with key: {}", key);
    }

    public TarotInterpretationResponse getCachedInterpretation(Long readingId) {
        String key = RedisConfig.TAROT_INTERPRETATION_PREFIX + readingId;
        return (TarotInterpretationResponse) redisTemplate.opsForValue().get(key);
    }
}
