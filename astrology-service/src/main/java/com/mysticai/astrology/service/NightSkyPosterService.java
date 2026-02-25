package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.PosterShareToken;
import com.mysticai.astrology.repository.PosterShareTokenRepository;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SweDate;
import de.thmac.swisseph.SwissEph;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NightSkyPosterService {

    private static final String POSTER_TYPE_NIGHT_SKY = "NIGHT_SKY";
    private static final String STAR_CATALOG_ID = "HIPPARCOS_BSC_BRIGHT_SUBSET_J2000_V1";
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Istanbul");
    private static final double DEFAULT_ELEVATION_METERS = 0.0;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final char[] BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final double STANDARD_PRESSURE_HPA = 1013.25;
    private static final double STANDARD_TEMPERATURE_C = 15.0;

    private static final String[] PLANET_KEYS = {
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
            "Chiron", "NorthNode"
    };

    private static final String[] PLANET_LABELS = {
            "Güneş", "Ay", "Merkür", "Venüs", "Mars",
            "Jüpiter", "Satürn", "Uranüs", "Neptün", "Plüton",
            "Kiron", "Kuzey Düğümü"
    };

    private static final String[] PLANET_GLYPHS = {
            "☉", "☽", "☿", "♀", "♂", "♃", "♄", "♅", "♆", "♇", "⚷", "☊"
    };

    private static final int[] SWISS_PLANET_IDS = {
            SweConst.SE_SUN,
            SweConst.SE_MOON,
            SweConst.SE_MERCURY,
            SweConst.SE_VENUS,
            SweConst.SE_MARS,
            SweConst.SE_JUPITER,
            SweConst.SE_SATURN,
            SweConst.SE_URANUS,
            SweConst.SE_NEPTUNE,
            SweConst.SE_PLUTO,
            SweConst.SE_CHIRON,
            SweConst.SE_TRUE_NODE
    };

    private static final List<BrightStar> BRIGHT_STAR_SUBSET = List.of(
            new BrightStar("sirius", "Sirius", "Canis Major", 32349, 2491, 6.75248, -16.71611, -1.46),
            new BrightStar("canopus", "Canopus", "Carina", 30438, 2326, 6.39920, -52.69566, -0.74),
            new BrightStar("arcturus", "Arcturus", "Bootes", 69673, 5340, 14.26102, 19.18241, -0.05),
            new BrightStar("vega", "Vega", "Lyra", 91262, 7001, 18.61565, 38.78369, 0.03),
            new BrightStar("capella", "Capella", "Auriga", 24608, 1708, 5.27815, 45.99803, 0.08),
            new BrightStar("rigel", "Rigel", "Orion", 24436, 1713, 5.24230, -8.20164, 0.13),
            new BrightStar("procyon", "Procyon", "Canis Minor", 37279, 2943, 7.65503, 5.22500, 0.38),
            new BrightStar("betelgeuse", "Betelgeuse", "Orion", 27989, 2061, 5.91953, 7.40706, 0.42),
            new BrightStar("achernar", "Achernar", "Eridanus", 7588, 472, 1.62857, -57.23675, 0.46),
            new BrightStar("hadar", "Hadar", "Centaurus", 68702, 5267, 14.06372, -60.37304, 0.61),
            new BrightStar("altair", "Altair", "Aquila", 97649, 7557, 19.84639, 8.86832, 0.77),
            new BrightStar("accrux", "Acrux", "Crux", 60718, 4730, 12.44330, -63.09909, 0.77),
            new BrightStar("aldebaran", "Aldebaran", "Taurus", 21421, 1457, 4.59868, 16.50930, 0.85),
            new BrightStar("antares", "Antares", "Scorpius", 80763, 6134, 16.49013, -26.43195, 1.06),
            new BrightStar("spica", "Spica", "Virgo", 65474, 5056, 13.41988, -11.16132, 0.97),
            new BrightStar("pollux", "Pollux", "Gemini", 37826, 2990, 7.75526, 28.02620, 1.14),
            new BrightStar("fomalhaut", "Fomalhaut", "Piscis Austrinus", 113368, 8728, 22.96085, -29.62224, 1.16),
            new BrightStar("deneb", "Deneb", "Cygnus", 102098, 7924, 20.69053, 45.28034, 1.25),
            new BrightStar("regulus", "Regulus", "Leo", 49669, 3982, 10.13953, 11.96721, 1.35),
            new BrightStar("adhara", "Adhara", "Canis Major", 33579, 2618, 6.97710, -28.97208, 1.50),
            new BrightStar("castor", "Castor", "Gemini", 36850, 2891, 7.57667, 31.88828, 1.58),
            new BrightStar("shaula", "Shaula", "Scorpius", 85927, 6527, 17.56015, -37.10382, 1.62),
            new BrightStar("bellatrix", "Bellatrix", "Orion", 25336, 1790, 5.41885, 6.34970, 1.64),
            new BrightStar("elnath", "Elnath", "Taurus", 25428, 1791, 5.43820, 28.60745, 1.65),
            new BrightStar("miaplacidus", "Miaplacidus", "Carina", 45238, 3685, 9.22000, -69.71721, 1.67),
            new BrightStar("alnilam", "Alnilam", "Orion", 26311, 1903, 5.60356, -1.20192, 1.69),
            new BrightStar("alnair", "Alnair", "Grus", 109268, 8425, 22.13722, -46.96097, 1.74),
            new BrightStar("alioth", "Alioth", "Ursa Major", 62956, 4905, 12.90049, 55.95982, 1.76),
            new BrightStar("dubhe", "Dubhe", "Ursa Major", 54061, 4301, 11.06213, 61.75084, 1.79),
            new BrightStar("mirfak", "Mirfak", "Perseus", 15863, 1017, 3.40538, 49.86118, 1.79),
            new BrightStar("alpheratz", "Alpheratz", "Andromeda", 677, 15, 0.13979, 29.09043, 2.06),
            new BrightStar("menkar", "Menkar", "Cetus", 14135, 911, 3.03799, 4.08974, 2.54),
            new BrightStar("hamal", "Hamal", "Aries", 9884, 617, 2.11956, 23.46242, 2.00),
            new BrightStar("algol", "Algol", "Perseus", 14576, 936, 3.13615, 40.95565, 2.12),
            new BrightStar("polaris", "Polaris", "Ursa Minor", 11767, 424, 2.53030, 89.26411, 1.98)
    );

    private static final List<StarLink> CONSTELLATION_LINES = List.of(
            new StarLink("betelgeuse", "bellatrix"),
            new StarLink("bellatrix", "alnilam"),
            new StarLink("alnilam", "rigel"),
            new StarLink("betelgeuse", "alnilam"),
            new StarLink("aldebaran", "elnath"),
            new StarLink("pollux", "castor"),
            new StarLink("dubhe", "alioth"),
            new StarLink("alioth", "polaris"),
            new StarLink("antares", "shaula"),
            new StarLink("vega", "deneb"),
            new StarLink("deneb", "altair"),
            new StarLink("altair", "vega"),
            new StarLink("spica", "arcturus"),
            new StarLink("sirius", "procyon"),
            new StarLink("sirius", "betelgeuse"),
            new StarLink("capella", "aldebaran"),
            new StarLink("mirfak", "algol"),
            new StarLink("hamal", "alpheratz"),
            new StarLink("fomalhaut", "alnair"),
            new StarLink("hadar", "accrux")
    );

    private record BrightStar(
            String key,
            String label,
            String constellation,
            Integer hipId,
            Integer bscId,
            double raHours,
            double decDeg,
            double magnitude
    ) {}

    private record StarLink(String fromKey, String toKey) {}

    private record ProjectedHorizontal(
            double azimuthDeg,
            double altitudeDeg,
            double apparentAltitudeDeg,
            boolean visible,
            double xNorm,
            double yNorm,
            double radialNorm
    ) {}

    private final NatalChartCalculator natalChartCalculator;
    private final PosterShareTokenRepository posterShareTokenRepository;
    private final ObjectMapper objectMapper;
    private final SwissEph sw = new SwissEph();

    @Value("${app.public-base-url:https://mysticai.app}")
    private String publicBaseUrl;

    @Value("${server.port:8080}")
    private String serverPort;

    @Transactional(readOnly = true)
    public NightSkyProjectionResponse projectNightSky(NightSkyProjectionRequest request) {
        LocalDate birthDate = request.birthDate() != null ? request.birthDate() : LocalDate.now();
        LocalTime birthTime = request.birthTime() != null ? request.birthTime() : LocalTime.NOON;
        String timezone = request.timezone();
        ZoneId zoneId = resolveZoneId(timezone);

        double[] coords = resolveCoordinates(request.birthLocation(), request.latitude(), request.longitude());
        double latitude = coords[0];
        double longitude = coords[1];
        double elevation = request.elevationMeters() != null ? request.elevationMeters() : DEFAULT_ELEVATION_METERS;

        double julDayUt = toJulianDayUt(birthDate, birthTime, zoneId);
        int iflag = SweConst.SEFLG_SWIEPH | SweConst.SEFLG_SPEED;

        List<NightSkyProjectionResponse.HorizontalPoint> planetPoints = new ArrayList<>();
        double sunLon = 0;
        double moonLon = 0;

        for (int i = 0; i < PLANET_KEYS.length; i++) {
            double[] result = new double[6];
            StringBuffer errBuf = new StringBuffer();
            sw.swe_calc_ut(julDayUt, SWISS_PLANET_IDS[i], iflag, result, errBuf);

            if (i == 0) sunLon = normalizeAngle(result[0]);
            if (i == 1) moonLon = normalizeAngle(result[0]);

            NightSkyProjectionResponse.HorizontalPoint point = toHorizontalPoint(
                    julDayUt,
                    longitude, latitude, elevation,
                    PLANET_KEYS[i],
                    PLANET_LABELS[i],
                    PLANET_GLYPHS[i],
                    result[0], result[1], result[2]
            );
            planetPoints.add(point);
        }

        double ascLon = natalChartCalculator.getAscendantDegree(birthDate, birthTime, latitude, longitude, timezone);
        double mcLon = natalChartCalculator.getMcDegree(birthDate, birthTime, latitude, longitude, timezone);

        List<NightSkyProjectionResponse.HorizontalPoint> axes = List.of(
                toHorizontalPoint(julDayUt, longitude, latitude, elevation, "mc", "MC", "MC", mcLon, 0, 1),
                toHorizontalPoint(julDayUt, longitude, latitude, elevation, "ic", "IC", "IC", normalizeAngle(mcLon + 180), 0, 1),
                toHorizontalPoint(julDayUt, longitude, latitude, elevation, "asc", "ASC", "ASC", ascLon, 0, 1),
                toHorizontalPoint(julDayUt, longitude, latitude, elevation, "dsc", "DSC", "DSC", normalizeAngle(ascLon + 180), 0, 1)
        );
        List<NightSkyProjectionResponse.StarPoint> stars = projectCatalogStars(julDayUt, longitude, latitude, elevation);
        List<NightSkyProjectionResponse.ConstellationLine> constellationLines = CONSTELLATION_LINES.stream()
                .map(line -> new NightSkyProjectionResponse.ConstellationLine(line.fromKey(), line.toKey()))
                .toList();

        NightSkyProjectionResponse.MoonPhaseInfo moonPhase = buildMoonPhase(sunLon, moonLon);

        return new NightSkyProjectionResponse(
                "AZIMUTHAL_EQUIDISTANT_ZENITH_V1",
                zoneId.getId(),
                STAR_CATALOG_ID,
                birthDate,
                birthTime.toString(),
                latitude,
                longitude,
                elevation,
                moonPhase,
                planetPoints,
                axes,
                stars,
                constellationLines,
                LocalDateTime.now(ZoneOffset.UTC)
        );
    }

    @Transactional
    public NightSkyPosterShareLinkResponse createNightSkyShareLink(NightSkyPosterShareLinkRequest request) {
        cleanupExpiredTokens();

        String variant = normalizeVariant(request.variant());
        int ttlHours = clampTtlHours(request.ttlHours());
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(ttlHours);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", blankToNull(request.name()));
        payload.put("birthDate", request.birthDate() != null ? request.birthDate().toString() : null);
        payload.put("birthTime", request.birthTime() != null ? request.birthTime().toString() : null);
        payload.put("birthLocation", blankToNull(request.birthLocation()));
        payload.put("latitude", request.latitude());
        payload.put("longitude", request.longitude());
        payload.put("timezone", blankToNull(request.timezone()));
        payload.put("chartId", request.chartId());
        payload.put("variant", variant);
        payload.put("createdForUserId", request.userId());

        String token = generateUniqueToken();
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new IllegalStateException("Poster share payload serialize edilemedi", e);
        }

        PosterShareToken saved = posterShareTokenRepository.save(PosterShareToken.builder()
                .token(token)
                .posterType(POSTER_TYPE_NIGHT_SKY)
                .userId(request.userId() != null ? String.valueOf(request.userId()) : null)
                .variant(variant)
                .payloadJson(payloadJson)
                .expiresAt(expiresAt)
                .build());

        String shareUrl = publicBaseUrl.replaceAll("/+$", "") + "/share/night-sky/" + saved.getToken();
        String apiResolveUrl = "/api/v1/astrology/posters/night-sky/share/" + saved.getToken();

        return new NightSkyPosterShareLinkResponse(saved.getToken(), variant, shareUrl, apiResolveUrl, saved.getExpiresAt());
    }

    @Transactional
    public NightSkyPosterShareTokenResolveResponse resolveNightSkyShareToken(String token) {
        PosterShareToken shareToken = posterShareTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Poster share token bulunamadı"));

        boolean expired = shareToken.getExpiresAt().isBefore(LocalDateTime.now());
        shareToken.setLastAccessedAt(LocalDateTime.now());
        posterShareTokenRepository.save(shareToken);

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(shareToken.getPayloadJson(), new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Poster share token payload parse edilemedi: {}", token, e);
            payload = Map.of("raw", shareToken.getPayloadJson());
        }

        return new NightSkyPosterShareTokenResolveResponse(
                shareToken.getToken(),
                shareToken.getPosterType(),
                shareToken.getVariant(),
                expired,
                shareToken.getExpiresAt(),
                shareToken.getCreatedAt(),
                payload
        );
    }

    private NightSkyProjectionResponse.HorizontalPoint toHorizontalPoint(
            double julDayUt,
            double longitude,
            double latitude,
            double elevationMeters,
            String key,
            String label,
            String glyph,
            double eclLon,
            double eclLat,
            double distance
    ) {
        double[] geopos = { longitude, latitude, elevationMeters };
        double[] xin = { normalizeAngle(eclLon), eclLat, distance };
        double[] xaz = new double[3];
        sw.swe_azalt(julDayUt, SweConst.SE_ECL2HOR, geopos, STANDARD_PRESSURE_HPA, STANDARD_TEMPERATURE_C, xin, xaz);
        ProjectedHorizontal projected = projectFromSwissAzAlt(xaz[0], xaz[1], xaz[2]);

        return new NightSkyProjectionResponse.HorizontalPoint(
                key,
                label,
                glyph,
                round(projected.azimuthDeg()),
                round(projected.altitudeDeg()),
                round(projected.apparentAltitudeDeg()),
                projected.visible(),
                round4(projected.xNorm()),
                round4(projected.yNorm()),
                round4(projected.radialNorm())
        );
    }

    private List<NightSkyProjectionResponse.StarPoint> projectCatalogStars(
            double julDayUt,
            double longitude,
            double latitude,
            double elevationMeters
    ) {
        List<NightSkyProjectionResponse.StarPoint> stars = new ArrayList<>(BRIGHT_STAR_SUBSET.size());
        for (BrightStar star : BRIGHT_STAR_SUBSET) {
            stars.add(toHorizontalStarPoint(julDayUt, longitude, latitude, elevationMeters, star));
        }
        return stars;
    }

    private NightSkyProjectionResponse.StarPoint toHorizontalStarPoint(
            double julDayUt,
            double longitude,
            double latitude,
            double elevationMeters,
            BrightStar star
    ) {
        double[] geopos = { longitude, latitude, elevationMeters };
        double[] xin = { normalizeAngle(star.raHours() * 15.0), star.decDeg(), 1.0 };
        double[] xaz = new double[3];
        sw.swe_azalt(julDayUt, SweConst.SE_EQU2HOR, geopos, STANDARD_PRESSURE_HPA, STANDARD_TEMPERATURE_C, xin, xaz);
        ProjectedHorizontal projected = projectFromSwissAzAlt(xaz[0], xaz[1], xaz[2]);

        return new NightSkyProjectionResponse.StarPoint(
                star.key(),
                star.label(),
                star.constellation(),
                star.hipId(),
                star.bscId(),
                round(star.magnitude()),
                round(projected.azimuthDeg()),
                round(projected.altitudeDeg()),
                round(projected.apparentAltitudeDeg()),
                projected.visible(),
                round4(projected.xNorm()),
                round4(projected.yNorm()),
                round4(projected.radialNorm())
        );
    }

    private ProjectedHorizontal projectFromSwissAzAlt(double swissAzimuthDeg, double trueAltDeg, double apparentAltDeg) {
        // SwissEph azimuth convention: south=0, west=90. Convert to north=0, east=90.
        double azNorthClockwise = normalizeAngle(swissAzimuthDeg + 180.0);
        boolean visible = apparentAltDeg >= 0;

        // Azimuthal equidistant projection centered on zenith.
        double radial = (90.0 - apparentAltDeg) / 90.0;
        radial = Math.max(0, Math.min(1.0, radial));
        double azRad = Math.toRadians(azNorthClockwise);
        double xNorm = radial * Math.sin(azRad);
        double yNorm = -radial * Math.cos(azRad);

        return new ProjectedHorizontal(
                azNorthClockwise,
                trueAltDeg,
                apparentAltDeg,
                visible,
                xNorm,
                yNorm,
                radial
        );
    }

    private NightSkyProjectionResponse.MoonPhaseInfo buildMoonPhase(double sunLon, double moonLon) {
        double elongation = normalizeAngle(moonLon - sunLon); // 0=new, 180=full
        double phaseFraction = elongation / 360.0;
        double illumination = (1.0 - Math.cos(Math.toRadians(elongation))) / 2.0;
        double ageDays = phaseFraction * 29.53058867;
        String label = phaseLabel5(phaseFraction);
        int idx = phaseSetIndex5(phaseFraction);
        return new NightSkyProjectionResponse.MoonPhaseInfo(
                round4(phaseFraction),
                round(illumination * 100.0),
                round(ageDays),
                label,
                idx
        );
    }

    private int phaseSetIndex5(double phaseFraction) {
        double normalized = phaseFraction % 1.0;
        if (normalized < 0) normalized += 1.0;
        double mirrored = normalized <= 0.5 ? normalized : 1.0 - normalized;
        double[] anchors = {0.0, 0.125, 0.25, 0.375, 0.5};
        int bestIdx = 0;
        double best = Double.MAX_VALUE;
        for (int i = 0; i < anchors.length; i++) {
            double d = Math.abs(mirrored - anchors[i]);
            if (d < best) {
                best = d;
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    private String phaseLabel5(double phaseFraction) {
        return switch (phaseSetIndex5(phaseFraction)) {
            case 0 -> "Yeniay";
            case 1 -> "Hilal";
            case 2 -> "İlkdördün";
            case 3 -> "Şişkin Ay";
            default -> "Dolunay";
        };
    }

    private String generateUniqueToken() {
        for (int i = 0; i < 8; i++) {
            String token = randomBase62(12);
            if (!posterShareTokenRepository.existsByToken(token)) {
                return token;
            }
        }
        throw new IllegalStateException("Benzersiz poster token üretilemedi");
    }

    private String randomBase62(int length) {
        char[] out = new char[length];
        for (int i = 0; i < length; i++) {
            out[i] = BASE62[SECURE_RANDOM.nextInt(BASE62.length)];
        }
        return new String(out);
    }

    @Scheduled(cron = "${astrology.poster-share.cleanup-cron:0 */30 * * * *}")
    @Transactional
    public void cleanupExpiredPosterShareTokensScheduled() {
        cleanupExpiredTokens();
    }

    private void cleanupExpiredTokens() {
        try {
            long deleted = posterShareTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(1));
            if (deleted > 0) {
                log.info("Deleted {} expired poster share tokens", deleted);
            }
        } catch (Exception e) {
            log.debug("Poster share token cleanup skipped: {}", e.getMessage());
        }
    }

    private int clampTtlHours(Integer ttlHours) {
        if (ttlHours == null) return 24 * 14; // 14 days
        return Math.max(1, Math.min(24 * 90, ttlHours));
    }

    private String normalizeVariant(String variant) {
        if (variant == null || variant.isBlank()) return "minimal";
        String v = variant.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        return switch (v) {
            case "minimal", "constellation_heavy", "gold_edition" -> v;
            default -> "minimal";
        };
    }

    private double[] resolveCoordinates(String birthLocation, Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            return new double[]{latitude, longitude};
        }
        return natalChartCalculator.parseLocation(birthLocation);
    }

    private ZoneId resolveZoneId(String timezone) {
        if (timezone == null || timezone.isBlank()) return DEFAULT_ZONE;
        try {
            return ZoneId.of(timezone.trim());
        } catch (Exception ignored) {
            return DEFAULT_ZONE;
        }
    }

    private double toJulianDayUt(LocalDate date, LocalTime time, ZoneId zoneId) {
        ZonedDateTime localZdt = ZonedDateTime.of(LocalDateTime.of(date, time), zoneId);
        ZonedDateTime utc = localZdt.withZoneSameInstant(ZoneOffset.UTC);
        double utcHour = utc.getHour() + utc.getMinute() / 60.0 + utc.getSecond() / 3600.0;
        return SweDate.getJulDay(utc.getYear(), utc.getMonthValue(), utc.getDayOfMonth(), utcHour, SweDate.SE_GREG_CAL);
    }

    private double normalizeAngle(double deg) {
        double v = deg % 360.0;
        if (v < 0) v += 360.0;
        return v;
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private double round4(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }
}
