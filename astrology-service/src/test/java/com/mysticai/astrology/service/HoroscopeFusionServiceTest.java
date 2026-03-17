package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.HoroscopeResponse;
import com.mysticai.astrology.dto.UpstreamSource;
import com.mysticai.astrology.service.upstream.FreeHoroscopeApiClient;
import com.mysticai.astrology.service.upstream.OhmandaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HoroscopeFusionServiceTest {

    private final StaticFreeHoroscopeApiClient freeHoroscopeApiClient = new StaticFreeHoroscopeApiClient();
    private final StaticOhmandaClient ohmandaClient = new StaticOhmandaClient();

    private HoroscopeFusionService service;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        service = new HoroscopeFusionService(
                freeHoroscopeApiClient,
                ohmandaClient,
                new RedisTemplate<>(),
                new ObjectMapper()
        );
        ReflectionTestUtils.setField(service, "orchestratorUrl", "http://orchestrator.test");
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(service, "aiRestTemplate");
        mockServer = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build();
    }

    @Test
    void shouldSkipLocalizationWhenRawTextAlreadyTurkish() {
        String turkishText = "Bugün enerjini dengeleyerek ilerlemen günün ritmini güçlendirebilir.";
        ohmandaClient.next = source("ohmanda", turkishText);

        HoroscopeResponse response = service.getHoroscope("aries", "daily", "tr");

        assertEquals(turkishText, response.getSections().getGeneral());
        mockServer.verify();
    }

    @Test
    void shouldFallbackToLegacyWhenEditorialOutputFailsQualityGate() {
        String rawEnglish = "Today your focus can drift if you take on too many tasks at once.";
        ohmandaClient.next = source("ohmanda", rawEnglish);

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/translate-editorial"))
                .andExpect(method(POST))
                .andRespond(withSuccess("As an AI translator, this is your translation.", MediaType.TEXT_PLAIN));

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/fuse"))
                .andExpect(method(POST))
                .andRespond(withSuccess("\"Bugün odağını sadeleştirmen verimini artırabilir.\"", MediaType.APPLICATION_JSON));

        HoroscopeResponse response = service.getHoroscope("aries", "daily", "tr");

        assertEquals("Bugün odağını sadeleştirmen verimini artırabilir.", response.getSections().getGeneral());
        mockServer.verify();
    }

    @Test
    void shouldFallbackToRawTextWhenAllLocalizationAttemptsFail() {
        String rawEnglish = "Today your focus can drift if you take on too many tasks at once.";
        ohmandaClient.next = source("ohmanda", rawEnglish);

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/translate-editorial"))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/fuse"))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        HoroscopeResponse response = service.getHoroscope("aries", "daily", "tr");

        assertEquals(rawEnglish, response.getSections().getGeneral());
        mockServer.verify();
    }

    @Test
    void shouldNotSkipEditorialForMixedLanguageTurkishLikeText() {
        String mixedText = "Libra'lı sevgili, Luna ve Kheiron birleşirken unique mizahını göster.";
        ohmandaClient.next = source("ohmanda", mixedText);

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/translate-editorial"))
                .andExpect(method(POST))
                .andRespond(withSuccess(
                        "Terazi enerjisinde bugün samimi mizahın seni rahatlatabilir.",
                        new MediaType("text", "plain", StandardCharsets.UTF_8)
                ));

        HoroscopeResponse response = service.getHoroscope("libra", "daily", "tr");

        assertEquals("Terazi enerjisinde bugün samimi mizahın seni rahatlatabilir.", response.getSections().getGeneral());
        mockServer.verify();
    }

    @Test
    void shouldNormalizeRawMixedTermsWhenLocalizationFallbacksFail() {
        String mixedText = "Libra'lı sevgili, Akrep Ayı ve Kheiron etkisinde unique mizahın bu akşam Luna ile görünür.";
        ohmandaClient.next = source("ohmanda", mixedText);

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/translate-editorial"))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        mockServer.expect(requestTo("http://orchestrator.test/api/ai/horoscope/fuse"))
                .andExpect(method(POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        HoroscopeResponse response = service.getHoroscope("libra", "daily", "tr");
        String general = response.getSections().getGeneral().toLowerCase(Locale.ROOT);

        assertFalse(general.contains("libra"));
        assertFalse(general.contains("kheiron"));
        assertFalse(general.contains("unique"));
        assertFalse(general.contains("luna"));
        mockServer.verify();
    }

    private static UpstreamSource source(String name, String text) {
        return UpstreamSource.builder()
                .name(name)
                .text(text)
                .build();
    }

    private static final class StaticOhmandaClient extends OhmandaClient {
        private UpstreamSource next;

        @Override
        public UpstreamSource fetch(String sign) {
            return next;
        }
    }

    private static final class StaticFreeHoroscopeApiClient extends FreeHoroscopeApiClient {
        private UpstreamSource next;

        @Override
        public UpstreamSource fetch(String sign, String period) {
            return next;
        }
    }
}
