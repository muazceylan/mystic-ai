package com.mysticai.notification.admin.service.cms;

import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HoroscopeContentGuardTest {

    @Test
    void detectsTurkishDirectSignMismatchForAllSigns() {
        String taurusAddress = "Sevgili Boğa burcu, bugün enerjini dengede tutman ilişkilerinde ve günlük işlerinde daha sakin ilerlemene destek olabilir.";

        for (WeeklyHoroscopeCms.ZodiacSign sign : WeeklyHoroscopeCms.ZodiacSign.values()) {
            boolean usable = HoroscopeContentGuard.isContentUsableForSign(taurusAddress, sign, "tr");

            if (sign == WeeklyHoroscopeCms.ZodiacSign.TAURUS) {
                assertThat(usable).isTrue();
            } else {
                assertThat(usable).isFalse();
                assertThat(HoroscopeContentGuard.findWrongDirectSignReference(taurusAddress, sign, "tr"))
                        .contains("Boğa");
            }
        }
    }

    @Test
    void allowsOtherSignsWhenTheyAreTransitReferences() {
        String transitReference = "Oğlak için bugün Venüs Boğa burcunda ilerlerken daha sakin ve uygulanabilir kararlar almak ilişkilerinde destekleyici olabilir.";

        assertThat(HoroscopeContentGuard.isContentUsableForSign(
                transitReference,
                WeeklyHoroscopeCms.ZodiacSign.CAPRICORN,
                "tr"
        )).isTrue();
    }

    @Test
    void detectsEnglishDirectSignMismatch() {
        String englishAddress = "Dear Taurus, today your relationships can benefit from a calmer and more practical rhythm.";

        assertThat(HoroscopeContentGuard.isContentUsableForSign(
                englishAddress,
                WeeklyHoroscopeCms.ZodiacSign.CAPRICORN,
                "en"
        )).isFalse();
        assertThat(HoroscopeContentGuard.findWrongDirectSignReference(
                englishAddress,
                WeeklyHoroscopeCms.ZodiacSign.CAPRICORN,
                "en"
        )).contains("Taurus");
    }

    @Test
    void detectsTurkishDirectSignSubjectWithoutBurcuWord() {
        String directSubject = "Boğa için bugün ilişkilerde daha sakin ve uygulanabilir bir ritim kurmak destekleyici olabilir.";

        assertThat(HoroscopeContentGuard.isContentUsableForSign(
                directSubject,
                WeeklyHoroscopeCms.ZodiacSign.CAPRICORN,
                "tr"
        )).isFalse();
        assertThat(HoroscopeContentGuard.findWrongDirectSignReference(
                directSubject,
                WeeklyHoroscopeCms.ZodiacSign.CAPRICORN,
                "tr"
        )).contains("Boğa");
    }
}
