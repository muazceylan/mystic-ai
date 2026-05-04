package com.mysticai.auth.config.properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ReviewerAccountSeedProperties {

    private final boolean enabled;
    private final SeedAccount primaryAccount;
    private final SeedAccount deletionTestAccount;
    private final SeedProfile profile;

    public ReviewerAccountSeedProperties(
            @Value("${auth.reviewer-seed.enabled:false}") boolean enabled,
            @Value("${auth.reviewer-seed.primary.email:}") String primaryEmail,
            @Value("${auth.reviewer-seed.primary.password:}") String primaryPassword,
            @Value("${auth.reviewer-seed.deletion.email:}") String deletionEmail,
            @Value("${auth.reviewer-seed.deletion.password:}") String deletionPassword,
            @Value("${auth.reviewer-seed.profile.birth-date:1992-08-17}") String birthDate,
            @Value("${auth.reviewer-seed.profile.birth-time:}") String birthTime,
            @Value("${auth.reviewer-seed.profile.birth-time-unknown:true}") boolean birthTimeUnknown,
            @Value("${auth.reviewer-seed.profile.birth-country:TR}") String birthCountry,
            @Value("${auth.reviewer-seed.profile.birth-city:Istanbul}") String birthCity,
            @Value("${auth.reviewer-seed.profile.birth-location:Istanbul, TR}") String birthLocation,
            @Value("${auth.reviewer-seed.profile.timezone:Europe/Istanbul}") String timezone,
            @Value("${auth.reviewer-seed.profile.gender:WOMAN}") String gender,
            @Value("${auth.reviewer-seed.profile.marital-status:SINGLE}") String maritalStatus,
            @Value("${auth.reviewer-seed.profile.preferred-language:en}") String preferredLanguage
    ) {
        this.enabled = enabled;
        this.primaryAccount = new SeedAccount(primaryEmail, primaryPassword, "Play", "Reviewer");
        this.deletionTestAccount = new SeedAccount(deletionEmail, deletionPassword, "Delete", "Test");
        this.profile = new SeedProfile(
                LocalDate.parse(birthDate.trim()),
                birthTime,
                birthTimeUnknown,
                birthCountry,
                birthCity,
                birthLocation,
                timezone,
                gender,
                maritalStatus,
                preferredLanguage
        );
    }

    public boolean enabled() {
        return enabled;
    }

    public SeedAccount primaryAccount() {
        return primaryAccount;
    }

    public SeedAccount deletionTestAccount() {
        return deletionTestAccount;
    }

    public SeedProfile profile() {
        return profile;
    }

    public record SeedAccount(
            String email,
            String password,
            String firstName,
            String lastName
    ) {
    }

    public record SeedProfile(
            LocalDate birthDate,
            String birthTime,
            boolean birthTimeUnknown,
            String birthCountry,
            String birthCity,
            String birthLocation,
            String timezone,
            String gender,
            String maritalStatus,
            String preferredLanguage
    ) {
    }
}
