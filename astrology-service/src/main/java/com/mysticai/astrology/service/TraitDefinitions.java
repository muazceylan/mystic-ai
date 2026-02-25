package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.CrossAspect;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class TraitDefinitions {

    public record AxisDriver(
            Set<String> exactPair,
            String containsPlanet,
            int polarity,
            double strength
    ) {
        public boolean matches(CrossAspect aspect) {
            if (aspect == null) return false;
            String a = normalize(aspect.userPlanet());
            String b = normalize(aspect.partnerPlanet());

            if (containsPlanet != null) {
                String p = normalize(containsPlanet);
                return p.equals(a) || p.equals(b);
            }

            if (exactPair == null || exactPair.size() != 2) return false;
            return exactPair.contains(a) && exactPair.contains(b);
        }
    }

    public record AxisDefinition(
            String categoryId,
            String categoryTitle,
            String id,
            String leftLabel,
            String rightLabel,
            List<AxisDriver> drivers
    ) {}

    private final List<AxisDefinition> allAxes;

    public TraitDefinitions() {
        List<AxisDefinition> axes = new ArrayList<>();

        // A) Sosyallik & Enerji
        axes.add(axis("social_energy", "Sosyallik & Enerji", "social_asocial", "Sosyal", "Asosyal",
                contains("Jupiter", -1, 0.90), contains("Mercury", -1, 0.70), contains("Venus", -1, 0.55),
                pair("Moon", "Saturn", +1, 0.90), contains("Saturn", +1, 0.45), contains("Pluto", +1, 0.35)));
        axes.add(axis("social_energy", "Sosyallik & Enerji", "calm_energetic", "Sakin", "Enerjik",
                contains("Mars", +1, 0.95), contains("Uranus", +1, 0.85), contains("Jupiter", +1, 0.45),
                contains("Saturn", -1, 0.80), pair("Moon", "Moon", -1, 0.40)));

        // B) İletişim Tarzı
        axes.add(axis("communication_style", "İletişim Tarzı", "direct_indirect", "Doğrudan", "Dolaylı",
                pair("Mercury", "Mars", -1, 1.00), contains("Mars", -1, 0.50), contains("Mercury", -1, 0.55),
                contains("Neptune", +1, 0.95), pair("Mercury", "Neptune", +1, 1.00), pair("Moon", "Neptune", +1, 0.60)));
        axes.add(axis("communication_style", "İletişim Tarzı", "logic_emotion_tone", "Mantık odaklı", "Duygu odaklı",
                pair("Mercury", "Saturn", -1, 0.95), contains("Mercury", -1, 0.55), contains("Saturn", -1, 0.40),
                contains("Moon", +1, 0.95), pair("Moon", "Venus", +1, 0.80), contains("Neptune", +1, 0.45)));

        // C) Duygusal Dünya
        axes.add(axis("emotional_world", "Duygusal Dünya", "expressive_hidden_emotions", "Duygularını gösteren", "Duygularını saklayan",
                pair("Moon", "Venus", -1, 1.00), pair("Moon", "Moon", -1, 0.75), contains("Venus", -1, 0.35),
                pair("Moon", "Saturn", +1, 1.00), pair("Moon", "Pluto", +1, 0.85), contains("Saturn", +1, 0.35)));
        axes.add(axis("emotional_world", "Duygusal Dünya", "romantic_realistic", "Romantik", "Gerçekçi",
                pair("Venus", "Neptune", -1, 1.00), contains("Neptune", -1, 0.75), pair("Moon", "Venus", -1, 0.45),
                pair("Venus", "Saturn", +1, 0.95), contains("Saturn", +1, 0.55), contains("Sun", +1, 0.20)));

        // D) Karar & Risk
        axes.add(axis("decision_risk", "Karar & Risk", "spontaneous_planned", "Spontane", "Planlı",
                contains("Uranus", -1, 1.00), pair("Mars", "Uranus", -1, 0.85), contains("Mars", -1, 0.40),
                contains("Saturn", +1, 1.00), pair("Mercury", "Saturn", +1, 0.65), contains("Mercury", +1, 0.20)));
        axes.add(axis("decision_risk", "Karar & Risk", "risk_cautious", "Risk alan", "Temkinli",
                contains("Mars", -1, 0.85), contains("Jupiter", -1, 0.65), contains("Uranus", -1, 0.55),
                contains("Saturn", +1, 1.00), pair("Mars", "Saturn", +1, 0.75), pair("Sun", "Saturn", +1, 0.50)));

        // E) Yaşam Tarzı & Düzen
        axes.add(axis("lifestyle_order", "Yaşam Tarzı & Düzen", "tidy_relaxed", "Titiz", "Rahat",
                contains("Saturn", -1, 1.00), pair("Mercury", "Saturn", -1, 0.70), contains("Mercury", -1, 0.30),
                contains("Jupiter", +1, 0.80), contains("Venus", +1, 0.55), pair("Venus", "Jupiter", +1, 0.60)));
        axes.add(axis("lifestyle_order", "Yaşam Tarzı & Düzen", "routine_change", "Rutin sever", "Değişim sever",
                contains("Saturn", -1, 0.95), pair("Moon", "Saturn", -1, 0.60),
                contains("Uranus", +1, 1.00), pair("Mercury", "Uranus", +1, 0.70), contains("Jupiter", +1, 0.40)));

        // F) İlişki Dinamikleri
        axes.add(axis("relationship_dynamics", "İlişki Dinamikleri", "closeness_space", "Yakınlık arayan", "Alan isteyen",
                pair("Moon", "Venus", -1, 0.95), contains("Moon", -1, 0.65), contains("Venus", -1, 0.40),
                contains("Uranus", +1, 1.00), pair("Venus", "Uranus", +1, 0.85), pair("Moon", "Uranus", +1, 0.75)));
        axes.add(axis("relationship_dynamics", "İlişki Dinamikleri", "possessive_freedom", "Sahiplenici", "Özgürlükçü",
                contains("Pluto", -1, 0.95), pair("Venus", "Pluto", -1, 0.80), pair("Mars", "Pluto", -1, 0.70),
                contains("Uranus", +1, 1.00), pair("Venus", "Uranus", +1, 0.85), contains("Jupiter", +1, 0.25)));

        // G) Para & Sorumluluk
        axes.add(axis("money_responsibility", "Para & Sorumluluk", "frugal_spender", "Tutumlu", "Harcamacı",
                contains("Saturn", -1, 1.00), pair("Venus", "Saturn", -1, 0.65),
                contains("Venus", +1, 0.75), contains("Jupiter", +1, 0.80), pair("Venus", "Jupiter", +1, 0.95)));
        axes.add(axis("money_responsibility", "Para & Sorumluluk", "responsible_go_with_flow", "Sorumluluk alan", "Akışına bırakan",
                contains("Saturn", -1, 1.00), contains("Sun", -1, 0.35), pair("Sun", "Saturn", -1, 0.60),
                contains("Neptune", +1, 1.00), contains("Jupiter", +1, 0.40), pair("Moon", "Neptune", +1, 0.60)));

        // H) Eğlence & Macera
        axes.add(axis("fun_adventure", "Eğlence & Macera", "adventure_comfort", "Macera sever", "Konfor sever",
                contains("Uranus", -1, 0.95), contains("Mars", -1, 0.75), contains("Jupiter", -1, 0.60),
                contains("Moon", +1, 0.65), contains("Venus", +1, 0.55), contains("Saturn", +1, 0.40)));
        axes.add(axis("fun_adventure", "Eğlence & Macera", "playful_serious", "Oyunbaz", "Ciddi",
                contains("Mercury", -1, 0.65), contains("Venus", -1, 0.55), contains("Jupiter", -1, 0.70),
                contains("Saturn", +1, 1.00), contains("Pluto", +1, 0.55), pair("Mercury", "Saturn", +1, 0.55)));

        this.allAxes = List.copyOf(axes);
    }

    public List<AxisDefinition> allAxes() {
        return allAxes;
    }

    private static AxisDefinition axis(
            String categoryId,
            String categoryTitle,
            String id,
            String leftLabel,
            String rightLabel,
            AxisDriver... drivers
    ) {
        return new AxisDefinition(categoryId, categoryTitle, id, leftLabel, rightLabel, List.of(drivers));
    }

    private static AxisDriver contains(String planet, int polarity, double strength) {
        return new AxisDriver(null, planet, polarity, strength);
    }

    private static AxisDriver pair(String planet1, String planet2, int polarity, double strength) {
        LinkedHashSet<String> pair = new LinkedHashSet<>();
        pair.add(normalize(planet1));
        pair.add(normalize(planet2));
        return new AxisDriver(Set.copyOf(pair), null, polarity, strength);
    }

    private static String normalize(String planet) {
        return planet == null ? "" : planet.trim().toLowerCase(Locale.ROOT);
    }
}
