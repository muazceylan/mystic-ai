package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.NatalChartRequest;
import com.mysticai.astrology.dto.NatalChartResponse;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.ZodiacSign;
import com.mysticai.astrology.repository.NatalChartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AstrologyService {

    private final NatalChartRepository natalChartRepository;
    private final AstrologyCalculator calculator;

    @Transactional
    public NatalChartResponse calculateAndSaveNatalChart(NatalChartRequest request) {
        log.info("Calculating natal chart for user: {}", request.userId());

        // Calculate zodiac signs
        ZodiacSign sunSign = calculator.calculateSunSign(request.birthDate());
        ZodiacSign moonSign = calculator.calculateMoonSign(
                request.birthDate(),
                request.birthLatitude(),
                request.birthLongitude()
        );
        ZodiacSign risingSign = calculator.calculateRisingSign(
                request.birthDate(),
                request.birthLatitude(),
                request.birthLongitude()
        );

        // Build and save natal chart
        NatalChart chart = NatalChart.builder()
                .userId(request.userId())
                .birthDate(request.birthDate())
                .birthPlace(request.birthPlace())
                .birthLatitude(request.birthLatitude())
                .birthLongitude(request.birthLongitude())
                .sunSign(sunSign)
                .moonSign(moonSign)
                .risingSign(risingSign)
                .sunSignTurkish(sunSign.getTurkishName())
                .moonSignTurkish(moonSign.getTurkishName())
                .risingSignTurkish(risingSign.getTurkishName())
                .build();

        NatalChart savedChart = natalChartRepository.save(chart);
        log.info("Saved natal chart with id: {} for user: {}", savedChart.getId(), request.userId());

        return NatalChartResponse.from(savedChart);
    }

    public NatalChartResponse getNatalChartById(Long id) {
        return natalChartRepository.findById(id)
                .map(NatalChartResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Natal chart not found: " + id));
    }

    public List<NatalChartResponse> getNatalChartsByUserId(Long userId) {
        return natalChartRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NatalChartResponse::from)
                .toList();
    }

    public NatalChartResponse getLatestNatalChartByUserId(Long userId) {
        return natalChartRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .map(NatalChartResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("No natal chart found for user: " + userId));
    }

    public ZodiacSign calculateSunSignOnly(int month, int day) {
        return calculator.calculateSunSign(
                java.time.LocalDateTime.of(2000, month, day, 12, 0)
        );
    }
}
