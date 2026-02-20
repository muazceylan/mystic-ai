package com.mysticai.astrology.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Calls Groq's Whisper-compatible transcription API to convert voice recordings to text.
 */
@Service
@Slf4j
public class WhisperTranscriptionService {

    private static final String WHISPER_MODEL = "whisper-large-v3-turbo";

    private final String apiKey;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public WhisperTranscriptionService(
            @Value("${groq.api-key}") String apiKey,
            @Value("${groq.base-url:https://api.groq.com/openai}") String baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;

        // RestTemplate with multipart + JSON converters
        FormHttpMessageConverter formConverter = new FormHttpMessageConverter();
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter();
        jsonConverter.setSupportedMediaTypes(List.of(MediaType.APPLICATION_JSON, MediaType.ALL));

        RestTemplate rt = new RestTemplate();
        rt.setMessageConverters(List.of(formConverter, jsonConverter));
        this.restTemplate = rt;
    }

    /**
     * Transcribes an audio file to text using Groq Whisper.
     *
     * @param audioFile multipart audio file (.m4a, .wav, .mp3, …)
     * @return transcribed text
     */
    public String transcribe(MultipartFile audioFile) throws Exception {
        log.info("Transcribing audio: name={}, size={} bytes, contentType={}",
                audioFile.getOriginalFilename(), audioFile.getSize(), audioFile.getContentType());

        String filename = audioFile.getOriginalFilename() != null
                ? audioFile.getOriginalFilename() : "recording.m4a";

        // Detect audio content type for the file part header
        String mimeType = audioFile.getContentType() != null
                ? audioFile.getContentType() : "audio/m4a";

        // Wrap bytes as a named resource
        byte[] bytes = audioFile.getBytes();
        ByteArrayResource fileResource = new ByteArrayResource(bytes) {
            @Override public String getFilename() { return filename; }
        };

        // Set per-part Content-Type for the file part
        HttpHeaders filePart = new HttpHeaders();
        filePart.setContentType(MediaType.parseMediaType(mimeType));
        HttpEntity<ByteArrayResource> filePart1 = new HttpEntity<>(fileResource, filePart);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart1);
        body.add("model", WHISPER_MODEL);
        body.add("language", "tr");
        body.add("response_format", "json");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(apiKey);

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        String url = baseUrl + "/v1/audio/transcriptions";

        log.info("Calling Groq Whisper at {}", url);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            Object text = response.getBody().get("text");
            if (text != null) {
                String result = text.toString().trim();
                log.info("Transcription success: {} chars", result.length());
                return result;
            }
        }
        throw new RuntimeException("Whisper returned empty transcription (status: " + response.getStatusCode() + ")");
    }
}
