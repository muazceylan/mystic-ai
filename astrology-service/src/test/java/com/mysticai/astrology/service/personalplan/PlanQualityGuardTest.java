package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PlanQualityGuardTest {

    private PlanQualityGuard guard;
    private PersonalPlanProperties properties;

    @BeforeEach
    void setUp() {
        properties = new PersonalPlanProperties();
        guard = new PlanQualityGuard(properties);
    }

    @ParameterizedTest(name = "rejects generic filler: {0}")
    @ValueSource(strings = {
            "Sezgini dinleyip küçük bir adım at.",
            "Sezgini dinleyip küçük adım at.",
            "İç sesine güvenip ufak bir adım at.",
            "Tek işe odaklanıp bitirmeden yeni iş açma.",
            "Bir işi bitirmeden yenisini açma.",
            "Acele karar verme.",
            "İletişimde dikkatli ol.",
            "Kendine zaman ayır.",
            "Enerjini koru.",
            "Akışta kal.",
            "Listen to intuition and take one small step.",
            "Do not open a new task before finishing the one in front of you.",
            "Focus on one task.",
            "Stay in the flow."
    })
    void rejectsBannedGenericAdvice(String text) {
        assertThat(guard.isAcceptable(text))
                .as("expected rejection for: %s (reason=%s)", text, guard.rejectionReason(text))
                .isFalse();
    }

    @ParameterizedTest(name = "accepts concrete advice: {0}")
    @ValueSource(strings = {
            "Akşam saatlerinde yakın olduğunuz biriyle konuşurken geçmişteki bütün sorunları açmak yerine, son günlerde sizi rahatsız eden tek davranışı açıkça ifade edin.",
            "Sizden beklenen bir sorumluluğun kapsamı belirsiz kaldıysa, kabul etmeden önce teslim zamanını ve beklenen sonucu yazılı olarak netleştirin.",
            "Öğleden sonra size sunulan ödeme koşullarına aynı konuşmada cevap vermeyin. Önce şartların yazılı halini isteyin.",
            "Read the cancellation and renewal clause of any payment or subscription term you come across today.",
            "Before you interpret a short or delayed message today, ask what was meant."
    })
    void acceptsConcreteSituationalAdvice(String text) {
        assertThat(guard.rejectionReason(text)).isNull();
    }

    @Test
    @DisplayName("a banned phrase inside a materially longer concrete sentence is allowed")
    void allowsBannedPhraseAsClauseInLongerSentence() {
        String text = "Öğleden sonra size sunulan ödeme veya sorumluluk koşullarına aynı konuşmada "
                + "cevap vermeyin ve acele karar verme baskısına rağmen önce şartların yazılı halini isteyin.";
        assertThat(guard.isAcceptable(text)).isTrue();
    }

    @Test
    void rejectsEmptyAndTooShortText() {
        assertThat(guard.rejectionReason(null)).isEqualTo("empty");
        assertThat(guard.rejectionReason("   ")).isEqualTo("empty");
        assertThat(guard.rejectionReason("Bugünü değerlendir.")).isNotNull();
    }

    @Test
    @DisplayName("reworded advice with the same meaning counts as a semantic duplicate")
    void detectsSemanticDuplicates() {
        String left = "Sezgini dinleyerek küçük bir başlangıç yap.";
        String right = "Sezgini dinleyip küçük bir adım at.";
        assertThat(guard.similarity(left, right)).isGreaterThan(0.4);

        // Diacritic folding: identical content, different spelling, must be an exact match.
        assertThat(guard.similarity(
                "İç sesine güvenip ufak bir adım at.",
                "ic sesine guvenip ufak bir adim at"))
                .isEqualTo(1.0d);
    }

    @Test
    void doesNotFlagUnrelatedSuggestionsAsDuplicates() {
        String relationship = "Yakın olduğunuz birine son günlerde takdir ettiğiniz somut bir davranışı tek bir örnekle söyleyin.";
        String money = "Bir ödeme veya abonelik koşulunun iptal ve yenileme maddesini okuyun.";
        assertThat(guard.isDuplicate(relationship, money)).isFalse();
    }

    @Test
    void duplicateThresholdComesFromConfiguration() {
        String left = "Konuşmanın kapsamını baştan belirleyin.";
        String right = "Konuşmanın kapsamını baştan netleştirin.";

        properties.setSemanticSimilarityThreshold(0.99d);
        assertThat(guard.isDuplicate(left, right)).isFalse();

        properties.setSemanticSimilarityThreshold(0.4d);
        assertThat(guard.isDuplicate(left, right)).isTrue();
    }

    @Test
    @DisplayName("fingerprints separate the semantic key from the area+intent key")
    void fingerprintsAreNamespaced() {
        assertThat(PlanFingerprints.semantic("LIMIT_TO_SINGLE_ISSUE")).isEqualTo("sk:LIMIT_TO_SINGLE_ISSUE");
        assertThat(PlanFingerprints.areaIntent(LifeArea.RELATIONSHIP, "name_single_behaviour"))
                .isEqualTo("ai:relationship:name_single_behaviour");

        assertThat(PlanFingerprints.isSemantic(PlanFingerprints.semantic("X"))).isTrue();
        assertThat(PlanFingerprints.isAreaIntent(PlanFingerprints.semantic("X"))).isFalse();
        assertThat(PlanFingerprints.isAreaIntent(PlanFingerprints.areaIntent(LifeArea.WORK, "y"))).isTrue();

        // A semantic key and an area+intent key never collide in the same set.
        assertThat(PlanFingerprints.semantic("WORK")).isNotEqualTo(PlanFingerprints.areaIntent(LifeArea.WORK, ""));
    }

    @Test
    @DisplayName("no catalog entry may ship copy the guard would reject")
    void everyCatalogVariantPassesTheGuard() {
        PersonalPlanCatalog catalog = new PersonalPlanCatalog();

        for (LifeArea area : LifeArea.values()) {
            for (PersonalPlanCatalog.Tone tone : PersonalPlanCatalog.Tone.values()) {
                for (PlanetRole role : PlanetRole.values()) {
                    for (PersonalPlanCatalog.CatalogEntry entry : catalog.actionCandidates(area, tone, role)) {
                        PlanVariant variant = entry.variant();
                        assertThat(guard.rejectionReason(variant.turkish()))
                                .as("TR copy for %s/%s/%s intent=%s", area, tone, role, variant.intent())
                                .isNull();
                        assertThat(guard.rejectionReason(variant.english()))
                                .as("EN copy for %s/%s/%s intent=%s", area, tone, role, variant.intent())
                                .isNull();
                    }
                }
            }
            for (PersonalPlanCatalog.CatalogEntry entry : catalog.cautionCandidates(area)) {
                PlanVariant variant = entry.variant();
                assertThat(guard.rejectionReason(variant.turkish()))
                        .as("TR caution for %s intent=%s", area, variant.intent()).isNull();
                assertThat(guard.rejectionReason(variant.english()))
                        .as("EN caution for %s intent=%s", area, variant.intent()).isNull();
            }
        }
    }

    @Test
    @DisplayName("catalog copy never assumes a profession, employer or workplace context")
    void catalogNeverAssumesProfession() {
        PersonalPlanCatalog catalog = new PersonalPlanCatalog();
        String[] forbidden = {
                "ekibin", "ekibiniz", "müşteri", "musteri", "yöneticin", "yoneticin", "patron",
                "toplanti", "toplantı", "kodun", "projen", "ofis", "mesai", "şirket", "sirket",
                "your team", "your client", "your manager", "your boss", "meeting", "codebase",
                "your project", "the office", "sprint", "standup"
        };

        for (LifeArea area : LifeArea.values()) {
            for (PersonalPlanCatalog.Tone tone : PersonalPlanCatalog.Tone.values()) {
                for (PersonalPlanCatalog.CatalogEntry entry : catalog.actionCandidates(area, tone, PlanetRole.BOND)) {
                    PlanVariant variant = entry.variant();
                    String tr = guard.normalize(variant.turkish());
                    String en = guard.normalize(variant.english());
                    for (String term : forbidden) {
                        String normalizedTerm = guard.normalize(term);
                        assertThat(tr).as("TR %s/%s must not assume '%s'", area, tone, term)
                                .doesNotContain(normalizedTerm);
                        assertThat(en).as("EN %s/%s must not assume '%s'", area, tone, term)
                                .doesNotContain(normalizedTerm);
                    }
                }
            }
        }
    }

    @Test
    @DisplayName("relationship-specific wording only appears on audience-gated variants")
    void partnerWordingIsAudienceGated() {
        PersonalPlanCatalog catalog = new PersonalPlanCatalog();
        String[] partnerTerms = {"esiniz", "esinizle", "partnerin", "your spouse", "your partner"};

        for (LifeArea area : LifeArea.values()) {
            for (PersonalPlanCatalog.Tone tone : PersonalPlanCatalog.Tone.values()) {
                for (PersonalPlanCatalog.CatalogEntry entry : catalog.actionCandidates(area, tone, PlanetRole.BOND)) {
                    PlanVariant variant = entry.variant();
                    if (variant.audience() != PlanVariant.Audience.ANY) {
                        continue;
                    }
                    String tr = guard.normalize(variant.turkish());
                    String en = guard.normalize(variant.english());
                    for (String term : partnerTerms) {
                        assertThat(tr).as("neutral TR copy %s/%s leaked '%s'", area, tone, term)
                                .doesNotContain(guard.normalize(term));
                        assertThat(en).as("neutral EN copy %s/%s leaked '%s'", area, tone, term)
                                .doesNotContain(guard.normalize(term));
                    }
                }
            }
        }
    }
}
