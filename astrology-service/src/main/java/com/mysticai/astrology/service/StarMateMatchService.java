package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.StarMateMatchResponse;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.StarMateMatch;
import com.mysticai.astrology.entity.StarMateProfile;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.StarMateMatchRepository;
import com.mysticai.astrology.repository.StarMateProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StarMateMatchService {

    private final StarMateMatchRepository matchRepository;
    private final StarMateProfileRepository profileRepository;
    private final NatalChartRepository natalChartRepository;
    private final StarMateSupport support;

    @Transactional(readOnly = true)
    public List<StarMateMatchResponse> listMatches(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<StarMateMatch> matches = matchRepository.findActiveByUserId(userId);
        if (matches.isEmpty()) return List.of();

        List<Long> partnerIds = matches.stream()
                .map(m -> Objects.equals(m.getUserAId(), userId) ? m.getUserBId() : m.getUserAId())
                .distinct()
                .toList();

        Map<Long, StarMateProfile> profilesByUserId = profileRepository.findAllByUserIdIn(partnerIds).stream()
                .collect(Collectors.toMap(StarMateProfile::getUserId, Function.identity(), (a, b) -> a));

        Map<Long, NatalChart> chartsByUserId = loadLatestCharts(partnerIds);

        return matches.stream()
                .map(match -> toResponse(userId, match, profilesByUserId, chartsByUserId))
                .toList();
    }

    private Map<Long, NatalChart> loadLatestCharts(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Map.of();
        List<String> idStrings = userIds.stream().map(String::valueOf).toList();
        return natalChartRepository.findLatestForUserIds(idStrings).stream()
                .collect(Collectors.toMap(c -> Long.valueOf(c.getUserId()), Function.identity(), (a, b) -> a));
    }

    private StarMateMatchResponse toResponse(
            Long currentUserId,
            StarMateMatch match,
            Map<Long, StarMateProfile> profilesByUserId,
            Map<Long, NatalChart> chartsByUserId
    ) {
        Long partnerUserId = Objects.equals(match.getUserAId(), currentUserId) ? match.getUserBId() : match.getUserAId();
        StarMateProfile partnerProfile = profilesByUserId.get(partnerUserId);
        NatalChart chart = chartsByUserId.get(partnerUserId);

        String partnerName = chart != null ? support.safeName(chart.getName()) : "Mistik Eslesme";
        Integer partnerAge = partnerProfile != null ? support.age(partnerProfile.getBirthDate()) : null;
        String partnerGender = partnerProfile != null && partnerProfile.getGender() != null ? partnerProfile.getGender().name() : null;
        List<String> photos = partnerProfile != null ? support.parsePhotos(partnerProfile.getPhotosJson()) : List.of();

        String icebreaker = buildIcebreaker(match, chart);

        return new StarMateMatchResponse(
                match.getId(),
                partnerUserId,
                partnerName,
                partnerAge,
                partnerGender,
                chart != null ? chart.getSunSign() : null,
                chart != null ? chart.getMoonSign() : null,
                chart != null ? chart.getRisingSign() : null,
                match.getCompatibilityScore(),
                match.getCompatibilitySummary(),
                photos,
                "Yeni eslesme - kozmik sohbeti baslat ✨",
                0,
                icebreaker,
                match.getCreatedAt()
        );
    }

    private String buildIcebreaker(StarMateMatch match, NatalChart chart) {
        if (chart != null && chart.getMoonSign() != null) {
            return "Moon sign'i " + chart.getMoonSign() + ". Duygusal ritmini anlamak icin haftanin en keyifli anini sor.";
        }
        if (match.getCompatibilitySummary() != null && !match.getCompatibilitySummary().isBlank()) {
            return "Kozmik ozetiniz guclu. Uyum yaratan ortak bir hobi sorusuyla baslayin.";
        }
        return "Nazik ve merakli bir acilis mesaji bu eslesmede en guvenli baslangic.";
    }
}
