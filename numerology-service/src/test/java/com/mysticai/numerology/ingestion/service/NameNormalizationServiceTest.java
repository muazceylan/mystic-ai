package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.dto.NormalizedCandidateData;
import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.util.TurkishStringUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NameNormalizationServiceTest {

    private final NameNormalizationService service = new NameNormalizationService();

    @Test
    void normalize_handlesTurkishCharactersAndOriginStandardization() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Çağrı Işık",
                ParsedGender.UNKNOWN,
                "Arapça kökenli bir isimdir.",
                "Arapça kökenli ve erkek ismi olarak kullanılır.",
                null,
                null,
                null,
                null,
                SourceName.SFK_ISTANBUL_EDU,
                "https://example.com",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Çağrı Işık İsminin Anlamı", false);

        assertEquals("çağrı ışık", normalized.normalizedName());
        assertEquals("Çağrı Işık", normalized.displayName());
        assertEquals(ParsedGender.MALE, normalized.gender());
        assertEquals("Arapça", normalized.origin());
    }

    @Test
    void normalize_marksLowQualityForShortTexts() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Ada",
                ParsedGender.FEMALE,
                "Güzel.",
                "Kısa.",
                null,
                null,
                null,
                null,
                SourceName.ALFABETIK,
                "https://example.com",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Ada İsminin Anlamı", false);

        assertEquals(ContentQuality.LOW, normalized.contentQuality());
    }

    @Test
    void normalize_reducesConfidenceWhenDuplicateFlagTrue() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Alya",
                ParsedGender.FEMALE,
                "Uzun ve anlamlı bir açıklama metni.",
                "Bu isim için kapsamlı bir değerlendirme metni vardır ve içerik kalitesi yüksektir.",
                "Türkçe",
                "Karakter metni",
                "Harf analizi",
                false,
                SourceName.BEBEKISMI,
                "https://example.com",
                0.0
        );

        NormalizedCandidateData withoutDuplicate = service.normalize(draft, "Alya İsminin Anlamı", false);
        NormalizedCandidateData withDuplicate = service.normalize(draft, "Alya İsminin Anlamı", true);

        assertTrue(withDuplicate.sourceConfidence().doubleValue() < withoutDuplicate.sourceConfidence().doubleValue());
        assertTrue(withDuplicate.duplicateContentFlag());
    }

    @Test
    void normalizedName_appliesTrimWhitespaceAndPunctuationRules() {
        String normalized = service.normalizedName("  Abdül-Kadir /  AbDÜLKADİR.  ");
        assertEquals("abdül kadir abdülkadir", normalized);
    }

    @Test
    void normalizedName_keepsCompoundAndCompactFormsDistinct() {
        assertEquals("elif nur", service.normalizedName("Elif   Nur"));
        assertEquals("elifnur", service.normalizedName("Elifnur"));
        assertTrue(TurkishStringUtil.looksCompoundName("Elif Nur"));
        assertFalse(TurkishStringUtil.looksCompoundName("Elifnur"));
    }

    @Test
    void normalize_originFromContextWithoutReliableSignal_returnsNull() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Buket",
                ParsedGender.FEMALE,
                "Çok uzun bir anlam metni. Köken kısmı net değil ve bu cümle origin gibi görünmüyor.",
                "Bu isim için açıklama uzundur fakat belirli bir köken dili geçmemektedir.",
                null,
                null,
                null,
                null,
                SourceName.SFK_ISTANBUL_EDU,
                "https://example.com",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Buket İsminin Anlamı", false);
        assertNull(normalized.origin());
    }

    @Test
    void normalize_originFieldTooLong_isSafelyTrimmed() {
        String longOrigin = "Eski Türkçe, Farsça ve farklı kaynakların birleşiminden gelen, oldukça uzun açıklamalı bir köken ifadesi";
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Buket",
                ParsedGender.FEMALE,
                "Anlam",
                "Uzun açıklama",
                longOrigin.repeat(4),
                null,
                null,
                null,
                SourceName.SFK_ISTANBUL_EDU,
                "https://example.com",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Buket İsminin Anlamı", false);
        assertTrue(normalized.origin() == null || normalized.origin().length() <= 255);
    }

    @Test
    void cleanUfukMeaningLong_removesHeaderAndRepeatedName() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Fuat",
                ParsedGender.MALE,
                "Fuat İsminin Anlamı Nedir?,Fuat, Arapça kökenli kısa isim.",
                "Fuat İsminin Anlamı Nedir?,Fuat, Arapça kökenli, anlamı \"kalp\" olan erkek ismidir.",
                "Arapça",
                null,
                null,
                null,
                SourceName.UFUK,
                "https://example.com/fuat",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Fuat İsminin Anlamı Nedir?", false);

        assertEquals("Arapça kökenli, anlamı \"kalp\" olan erkek ismidir.", normalized.meaningLong());
        assertFalse(normalized.meaningLong().toLowerCase().contains("isminin anlamı nedir"));
    }

    @Test
    void cleanUfukCharacterTraits_removesHeaderPrefixAndNameRepeat() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Rüstem",
                ParsedGender.MALE,
                "Anlam",
                "Rüstem İsminin Anlamı Rüstem ismi, Farsça kökenli anlamlı bir erkek ismidir.",
                "Farsça",
                "Rüstem İsminin Anlamı Nedir? Rüstem ismi, güçlü, kararlı ve lider ruhlu kişiliği temsil eder.",
                null,
                null,
                SourceName.UFUK,
                "https://example.com/rustem",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Rüstem İsminin Anlamı Nedir?", false);

        assertEquals("güçlü, kararlı ve lider ruhlu kişiliği temsil eder.", normalized.characterTraitsText());
        assertFalse(normalized.characterTraitsText().toLowerCase().contains("isminin anlamı"));
    }

    @Test
    void cleanUfukLetterAnalysis_removesDisclaimerAndKeepsLetterMarkers() {
        ParsedNameCandidateDraft draft = new ParsedNameCandidateDraft(
                "Orçun",
                ParsedGender.MALE,
                "Anlam",
                "Uzun açıklama",
                "Türkçe",
                null,
                "nalizi İsimlerin harf analizleri bilimsel bir dayanağı olmasa da, isimlere atfedilen sembolik anlamları yansıtabilir: O: Duygusallık R: Kararlılık Ç: Yaratıcılık U: Sadakat N: Sezgisellik",
                null,
                SourceName.UFUK,
                "https://example.com/orcun",
                0.0
        );

        NormalizedCandidateData normalized = service.normalize(draft, "Orçun İsminin Anlamı", false);

        assertEquals("O: Duygusallık R: Kararlılık Ç: Yaratıcılık U: Sadakat N: Sezgisellik", normalized.letterAnalysisText());
        assertFalse(normalized.letterAnalysisText().toLowerCase().contains("bilimsel bir dayana"));
    }

    @Test
    void cleanUfukLetterAnalysis_removesBrokenAnalysisPrefix() {
        String cleaned = service.cleanUfukLetterAnalysis("zi B: Sorumluluk sahibi Ü: Sezgisel N: Güçlü Y: Kararlı A: Lider M: Mantıklı");
        assertEquals("B: Sorumluluk sahibi Ü: Sezgisel N: Güçlü Y: Kararlı A: Lider M: Mantıklı", cleaned);
    }
}
