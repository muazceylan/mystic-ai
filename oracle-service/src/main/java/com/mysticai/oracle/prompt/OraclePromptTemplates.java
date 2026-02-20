package com.mysticai.oracle.prompt;

import com.mysticai.oracle.dto.GrandSynthesisRequest;

/**
 * Prompt templates for the Oracle Service - Grand Synthesis.
 */
public class OraclePromptTemplates {

    /**
     * Creates the Grand Synthesis prompt combining all mystical data sources.
     */
    public static String createGrandSynthesisPrompt(GrandSynthesisRequest request) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("# ORAKEL: GUNUN SIRRI - BUYUK SENTEZ\\n\\n");
        prompt.append("Sen bir mistik oraclesin. Kullanicinin tum verilerini birlestirerek ")
              .append("ona ozel, bugune dair en derin mistik sirri aciklayacaksin.\\n\\n");
        
        // Numerology Section
        prompt.append("## NUMEROLOJI VERILERI\\n");
        if (request.numerology() != null) {
            prompt.append("- Yasam Yolu Sayisi: ").append(request.numerology().lifePathNumber()).append("\\n");
            prompt.append("- Ruh Gudusu Sayisi: ").append(request.numerology().soulUrgeNumber()).append("\\n");
            prompt.append("- Kader Sayisi: ").append(request.numerology().destinyNumber()).append("\\n");
            if (request.numerology().summary() != null) {
                prompt.append("- Numeroloji Ozeti: ").append(request.numerology().summary()).append("\\n");
            }
        } else {
            prompt.append("(Numeroloji verisi mevcut degil)\\n");
        }
        prompt.append("\\n");
        
        // Natal Chart Section
        prompt.append("## DOGUM HARITASI (NATAL CHART)\\n");
        if (request.natalChart() != null) {
            prompt.append("- Gunes Burcu: ").append(request.natalChart().sunSign()).append("\\n");
            prompt.append("- Ay Burcu: ").append(request.natalChart().moonSign()).append("\\n");
            prompt.append("- Yukselen Burc: ").append(request.natalChart().risingSign()).append("\\n");
            if (request.natalChart().aiInterpretation() != null) {
                prompt.append("- Harita Yorumu: ").append(request.natalChart().aiInterpretation()).append("\\n");
            }
        } else {
            prompt.append("(Dogum haritasi verisi mevcut degil)\\n");
        }
        prompt.append("\\n");
        
        // Current Sky Data
        prompt.append("## GUNCEL GOKYUZU TRANSITLERI\\n");
        if (request.moonPhase() != null) {
            prompt.append("- Ay Evresi: ").append(request.moonPhase()).append("\\n");
        }
        if (request.moonSignToday() != null) {
            prompt.append("- Ay Burcu: ").append(request.moonSignToday()).append("\\n");
        }
        if (request.retrogradePlanets() != null && !request.retrogradePlanets().isEmpty()) {
            prompt.append("- Retrograd Gezegenler: ").append(String.join(", ", request.retrogradePlanets())).append("\\n");
        } else {
            prompt.append("(Bugun aktif retrograd gezegen yok)\\n");
        }
        prompt.append("\\n");
        
        // Dream Section
        prompt.append("## SON RUYA\\n");
        if (request.recentDream() != null && request.recentDream().dreamText() != null) {
            prompt.append("- Ruya: ").append(request.recentDream().dreamText()).append("\\n");
            prompt.append("- Duygu Durumu: ").append(request.recentDream().mood()).append("\\n");
            if (request.recentDream().aiInterpretation() != null) {
                prompt.append("- Ruya Yorumu: ").append(request.recentDream().aiInterpretation()).append("\\n");
            }
        } else {
            prompt.append("(Son 24 saatte kaydedilmis ruya bulunmamaktadir)\\n");
        }
        prompt.append("\\n");
        
        // Grand Synthesis Instructions
        prompt.append("## GOREV: BUYUK SENTEZ\\n");
        prompt.append("Yukaridaki tum mistik verileri birlestirerek:\\n");
        prompt.append("1. Kullanicinin kader sayisi ve yasam yolu uzerinden temel karakterini belirle\\n");
        prompt.append("2. Yukselen burcunun dunyaya nasil gorundugunu ve bugunki maskesini analiz et\\n");
        prompt.append("3. Guncel gezegen transitlerinin bugun onun uzerindeki etkilerini yorumla\\n");
        prompt.append("4. Varsa son ruyasinin bilincalti mesajlarini entegre et\\n");
        prompt.append("5. TUM BU VERILERI BIRLESTIREREK bugun icin OZEL, DERIN ve GIZEMLI bir sir acikla\\n\\n");
        
        prompt.append("Cevap formati:\\n");
        prompt.append("- BASLIK: Bugunun Mistik Sifresi (kisa ve etkileyici bir baslik)\\n");
        prompt.append("- ANA SIR: 3-4 cumlelik derin, mistik bir mesaj\\n");
        prompt.append("- REHBERLIK: Bugun icin 1-2 pratik oneri\\n");
        prompt.append("- TEMA: Bugunun anahtar kelimesi (1-2 kelime)\\n\\n");
        
        prompt.append("Ton: Gizemli ama umut verici, bilgece ama samimi, derin ama anlasilir.");
        
        return prompt.toString();
    }
}
