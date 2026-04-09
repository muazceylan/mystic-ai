package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.PlanetaryAspect.AspectType;
import org.springframework.stereotype.Service;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SweDate;
import de.thmac.swisseph.SwissEph;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * High-precision natal chart calculator using Swiss Ephemeris (Moshier ephemeris).
 * Provides sub-arcsecond precision for all major celestial bodies including Chiron and True Node.
 */
@Service
public class NatalChartCalculator {

    private static final String[] PLANETS = {
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
            "Chiron", "NorthNode"
    };

    /** Swiss Ephemeris planet IDs corresponding to PLANETS array */
    private static final int[] SE_PLANET_IDS = {
            SweConst.SE_SUN,        // 0
            SweConst.SE_MOON,       // 1
            SweConst.SE_MERCURY,    // 2
            SweConst.SE_VENUS,      // 3
            SweConst.SE_MARS,       // 4
            SweConst.SE_JUPITER,    // 5
            SweConst.SE_SATURN,     // 6
            SweConst.SE_URANUS,     // 7
            SweConst.SE_NEPTUNE,    // 8
            SweConst.SE_PLUTO,      // 9
            SweConst.SE_CHIRON,     // 15
            SweConst.SE_TRUE_NODE   // 11
    };

    private static final String[] SIGNS = {
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    };

    private static final String[] SIGN_RULERS = {
            "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
            "Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"
    };

    /**
     * Istanbul timezone — handles historical DST automatically.
     * Before 2016: UTC+2 (winter) / UTC+3 (summer).
     * After 2016: permanently UTC+3.
     */
    private static final ZoneId ISTANBUL_ZONE = ZoneId.of("Europe/Istanbul");

    /**
     * Turkish city coordinates (81 il merkezi).
     * Key is lowercase city name for case-insensitive lookup.
     */
    private static final Map<String, double[]> CITY_COORDS = Map.ofEntries(
            Map.entry("adana", new double[]{37.0000, 35.3213}),
            Map.entry("adıyaman", new double[]{37.7648, 38.2786}),
            Map.entry("afyonkarahisar", new double[]{38.7507, 30.5567}),
            Map.entry("ağrı", new double[]{39.7191, 43.0503}),
            Map.entry("aksaray", new double[]{38.3687, 34.0370}),
            Map.entry("amasya", new double[]{40.6499, 35.8353}),
            Map.entry("ankara", new double[]{39.9334, 32.8597}),
            Map.entry("antalya", new double[]{36.8969, 30.7133}),
            Map.entry("ardahan", new double[]{41.1105, 42.7022}),
            Map.entry("artvin", new double[]{41.1828, 41.8183}),
            Map.entry("aydın", new double[]{37.8560, 27.8416}),
            Map.entry("balıkesir", new double[]{39.6484, 27.8826}),
            Map.entry("bartın", new double[]{41.6344, 32.3375}),
            Map.entry("batman", new double[]{37.8812, 41.1351}),
            Map.entry("bayburt", new double[]{40.2552, 40.2249}),
            Map.entry("bilecik", new double[]{40.0567, 30.0665}),
            Map.entry("bingöl", new double[]{38.8854, 40.4966}),
            Map.entry("bitlis", new double[]{38.4010, 42.1095}),
            Map.entry("bolu", new double[]{40.7360, 31.6061}),
            Map.entry("burdur", new double[]{37.7203, 30.2908}),
            Map.entry("bursa", new double[]{40.1826, 29.0665}),
            Map.entry("çanakkale", new double[]{40.1553, 26.4142}),
            Map.entry("çankırı", new double[]{40.6013, 33.6134}),
            Map.entry("çorum", new double[]{40.5506, 34.9556}),
            Map.entry("denizli", new double[]{37.7765, 29.0864}),
            Map.entry("diyarbakır", new double[]{37.9144, 40.2306}),
            Map.entry("düzce", new double[]{40.8438, 31.1565}),
            Map.entry("edirne", new double[]{41.6818, 26.5623}),
            Map.entry("elazığ", new double[]{38.6810, 39.2264}),
            Map.entry("erzincan", new double[]{39.7500, 39.5000}),
            Map.entry("erzurum", new double[]{39.9054, 41.2658}),
            Map.entry("eskişehir", new double[]{39.7767, 30.5206}),
            Map.entry("gaziantep", new double[]{37.0662, 37.3833}),
            Map.entry("giresun", new double[]{40.9128, 38.3895}),
            Map.entry("gümüşhane", new double[]{40.4386, 39.5086}),
            Map.entry("hakkâri", new double[]{37.5833, 43.7408}),
            Map.entry("hakkari", new double[]{37.5833, 43.7408}),
            Map.entry("hatay", new double[]{36.4018, 36.3498}),
            Map.entry("ığdır", new double[]{39.9167, 44.0500}),
            Map.entry("iğdır", new double[]{39.9167, 44.0500}),
            Map.entry("isparta", new double[]{37.7648, 30.5566}),
            Map.entry("istanbul", new double[]{41.0082, 28.9784}),
            Map.entry("İstanbul", new double[]{41.0082, 28.9784}),
            Map.entry("izmir", new double[]{38.4192, 27.1287}),
            Map.entry("İzmir", new double[]{38.4192, 27.1287}),
            Map.entry("kahramanmaraş", new double[]{37.5858, 36.9371}),
            Map.entry("karabük", new double[]{41.2061, 32.6204}),
            Map.entry("karaman", new double[]{37.1759, 33.2287}),
            Map.entry("kars", new double[]{40.6167, 43.1000}),
            Map.entry("kastamonu", new double[]{41.3887, 33.7827}),
            Map.entry("kayseri", new double[]{38.7312, 35.4787}),
            Map.entry("kilis", new double[]{36.7184, 37.1212}),
            Map.entry("kırıkkale", new double[]{39.8468, 33.5153}),
            Map.entry("kırklareli", new double[]{41.7333, 27.2167}),
            Map.entry("kırşehir", new double[]{39.1425, 34.1709}),
            Map.entry("kocaeli", new double[]{40.8533, 29.8815}),
            Map.entry("konya", new double[]{37.8746, 32.4932}),
            Map.entry("kütahya", new double[]{39.4167, 29.9833}),
            Map.entry("malatya", new double[]{38.3552, 38.3095}),
            Map.entry("manisa", new double[]{38.6191, 27.4289}),
            Map.entry("mardin", new double[]{37.3212, 40.7245}),
            Map.entry("mersin", new double[]{36.8121, 34.6415}),
            Map.entry("muğla", new double[]{37.2153, 28.3636}),
            Map.entry("muş", new double[]{38.9462, 41.7539}),
            Map.entry("nevşehir", new double[]{38.6939, 34.6857}),
            Map.entry("niğde", new double[]{37.9667, 34.6833}),
            Map.entry("ordu", new double[]{40.9839, 37.8764}),
            Map.entry("osmaniye", new double[]{37.0742, 36.2464}),
            Map.entry("rize", new double[]{41.0201, 40.5234}),
            Map.entry("sakarya", new double[]{40.6940, 30.4358}),
            Map.entry("samsun", new double[]{41.2867, 36.3300}),
            Map.entry("şanlıurfa", new double[]{37.1674, 38.7955}),
            Map.entry("siirt", new double[]{37.9333, 41.9500}),
            Map.entry("sinop", new double[]{42.0231, 35.1531}),
            Map.entry("sivas", new double[]{39.7477, 37.0179}),
            Map.entry("şırnak", new double[]{37.4187, 42.4918}),
            Map.entry("tekirdağ", new double[]{41.0024, 27.5119}),
            Map.entry("tokat", new double[]{40.3167, 36.5500}),
            Map.entry("trabzon", new double[]{41.0015, 39.7178}),
            Map.entry("tunceli", new double[]{39.1079, 39.5401}),
            Map.entry("uşak", new double[]{38.6823, 29.4082}),
            Map.entry("van", new double[]{38.4891, 43.3800}),
            Map.entry("yalova", new double[]{40.6500, 29.2667}),
            Map.entry("yozgat", new double[]{39.8181, 34.8147}),
            Map.entry("zonguldak", new double[]{41.4564, 31.7987})
    );

    private final SwissEph sw = new SwissEph();

    /**
     * Calculate all planet positions for a given birth date/time/location.
     */
    public List<PlanetPosition> calculatePlanetPositions(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        return calculatePlanetPositions(birthDate, birthTime, latitude, longitude, null);
    }

    public List<PlanetPosition> calculatePlanetPositions(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude,
            String timezone
    ) {
        double julDay = toJulianDay(birthDate, birthTime, resolveZoneId(timezone));
        double[] houseCusps = new double[13];  // cusps[1..12]
        double[] ascmc = new double[10];
        sw.swe_houses(julDay, 0, latitude, longitude, (int) 'P', houseCusps, ascmc);

        List<PlanetPosition> positions = new ArrayList<>();
        int iflag = SweConst.SEFLG_SWIEPH | SweConst.SEFLG_SPEED;

        for (int i = 0; i < PLANETS.length; i++) {
            double[] result = new double[6];
            StringBuffer errBuf = new StringBuffer();
            sw.swe_calc_ut(julDay, SE_PLANET_IDS[i], iflag, result, errBuf);

            double absLong = result[0]; // ecliptic longitude 0-360
            double speed = result[3];   // negative = retrograde
            boolean retrograde = speed < 0;

            // North Node is never retrograde in the traditional sense
            if (PLANETS[i].equals("NorthNode")) retrograde = false;

            int signIndex = (int) (absLong / 30.0);
            double degInSign = absLong % 30.0;
            int deg = (int) degInSign;
            double fracDeg = degInSign - deg;
            int minutes = (int) (fracDeg * 60);
            int seconds = (int) ((fracDeg * 60 - minutes) * 60);

            int house = findHouse(absLong, houseCusps);

            positions.add(new PlanetPosition(
                    PLANETS[i],
                    SIGNS[signIndex],
                    deg,
                    minutes,
                    seconds,
                    retrograde,
                    house,
                    Math.round(absLong * 10000.0) / 10000.0
            ));
        }

        return positions;
    }

    /**
     * Calculate house cusps using Placidus system.
     */
    public List<HousePlacement> calculateHouses(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        return calculateHouses(birthDate, birthTime, latitude, longitude, null);
    }

    public List<HousePlacement> calculateHouses(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude,
            String timezone
    ) {
        double julDay = toJulianDay(birthDate, birthTime, resolveZoneId(timezone));
        double[] houseCusps = new double[13];
        double[] ascmc = new double[10];
        sw.swe_houses(julDay, 0, latitude, longitude, (int) 'P', houseCusps, ascmc);

        List<HousePlacement> houses = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            double cuspLong = houseCusps[i];
            int signIndex = (int) (cuspLong / 30.0);
            double degree = cuspLong % 30.0;

            houses.add(new HousePlacement(
                    i,
                    SIGNS[signIndex],
                    Math.round(degree * 100.0) / 100.0,
                    SIGN_RULERS[signIndex]
            ));
        }

        return houses;
    }

    /**
     * Calculate the Ascendant (Rising Sign) from Swiss Ephemeris house calculation.
     */
    public String calculateAscendant(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        return calculateAscendant(birthDate, birthTime, latitude, longitude, null);
    }

    public String calculateAscendant(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude,
            String timezone
    ) {
        double julDay = toJulianDay(birthDate, birthTime, resolveZoneId(timezone));
        double[] houseCusps = new double[13];
        double[] ascmc = new double[10];
        sw.swe_houses(julDay, 0, latitude, longitude, (int) 'P', houseCusps, ascmc);

        double ascLong = ascmc[0]; // Ascendant longitude
        int signIndex = (int) (ascLong / 30.0);
        return SIGNS[signIndex];
    }

    /**
     * Get Ascendant absolute longitude.
     */
    public double getAscendantDegree(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        return getAscendantDegree(birthDate, birthTime, latitude, longitude, null);
    }

    public double getAscendantDegree(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude,
            String timezone
    ) {
        double julDay = toJulianDay(birthDate, birthTime, resolveZoneId(timezone));
        double[] houseCusps = new double[13];
        double[] ascmc = new double[10];
        sw.swe_houses(julDay, 0, latitude, longitude, (int) 'P', houseCusps, ascmc);
        return Math.round(ascmc[0] * 10000.0) / 10000.0;
    }

    /**
     * Get MC (Midheaven) absolute longitude.
     */
    public double getMcDegree(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        return getMcDegree(birthDate, birthTime, latitude, longitude, null);
    }

    public double getMcDegree(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude,
            String timezone
    ) {
        double julDay = toJulianDay(birthDate, birthTime, resolveZoneId(timezone));
        double[] houseCusps = new double[13];
        double[] ascmc = new double[10];
        sw.swe_houses(julDay, 0, latitude, longitude, (int) 'P', houseCusps, ascmc);
        return Math.round(ascmc[1] * 10000.0) / 10000.0;
    }

    /**
     * Returns the actual UTC offset in hours for Turkey local time on the given date.
     * Before Sep 2016, Turkey used UTC+2 in winter and UTC+3 in summer.
     * From Sep 2016 onward, permanently UTC+3.
     */
    public double getTurkeyUtcOffset(LocalDate date, LocalTime time) {
        return getUtcOffset(date, time, null);
    }

    /**
     * Returns the actual UTC offset in hours for the provided timezone and instant.
     * Falls back to Europe/Istanbul when timezone is null/invalid.
     */
    public double getUtcOffset(LocalDate date, LocalTime time, String timezone) {
        ZonedDateTime zdt = ZonedDateTime.of(LocalDateTime.of(date, time), resolveZoneId(timezone));
        return zdt.getOffset().getTotalSeconds() / 3600.0;
    }

    /**
     * Get Sun sign derived from SwissEph calculation (replaces date-range approach).
     */
    public String calculateSunSign(LocalDate birthDate) {
        return calculateSunSign(birthDate, null);
    }

    public String calculateSunSign(LocalDate birthDate, String timezone) {
        // Use noon UTC as default when no time is given
        double julDay = toJulianDay(birthDate, LocalTime.NOON, resolveZoneId(timezone));
        double[] result = new double[6];
        StringBuffer errBuf = new StringBuffer();
        sw.swe_calc_ut(julDay, SweConst.SE_SUN, SweConst.SEFLG_SWIEPH, result, errBuf);
        int signIndex = (int) (result[0] / 30.0);
        return SIGNS[signIndex];
    }

    /**
     * Get Moon sign derived from SwissEph calculation.
     */
    public String calculateMoonSign(LocalDate birthDate) {
        return calculateMoonSign(birthDate, null);
    }

    public String calculateMoonSign(LocalDate birthDate, String timezone) {
        double julDay = toJulianDay(birthDate, LocalTime.NOON, resolveZoneId(timezone));
        double[] result = new double[6];
        StringBuffer errBuf = new StringBuffer();
        sw.swe_calc_ut(julDay, SweConst.SE_MOON, SweConst.SEFLG_SWIEPH, result, errBuf);
        int signIndex = (int) (result[0] / 30.0);
        return SIGNS[signIndex];
    }

    /**
     * Calculate planetary aspects between all planet pairs.
     * Uses absoluteLongitude from PlanetPosition for high-precision aspect detection.
     */
    public List<PlanetaryAspect> calculateAspects(List<PlanetPosition> planets) {
        List<PlanetaryAspect> aspects = new ArrayList<>();

        for (int i = 0; i < planets.size(); i++) {
            for (int j = i + 1; j < planets.size(); j++) {
                PlanetPosition p1 = planets.get(i);
                PlanetPosition p2 = planets.get(j);

                double angle = Math.abs(p1.absoluteLongitude() - p2.absoluteLongitude());
                if (angle > 180) {
                    angle = 360 - angle;
                }

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        aspects.add(new PlanetaryAspect(
                                p1.planet(),
                                p2.planet(),
                                type,
                                Math.round(angle * 100.0) / 100.0,
                                Math.round(orb * 100.0) / 100.0
                        ));
                        break; // one aspect per planet pair
                    }
                }
            }
        }

        return aspects;
    }

    /**
     * Parse location string to latitude/longitude.
     * Uses a static map of Turkish cities with real coordinates.
     * Falls back to Istanbul for unrecognized locations.
     */
    public double[] parseLocation(String location) {
        if (location == null || location.isEmpty()) {
            return new double[]{41.0082, 28.9784}; // Istanbul default
        }

        // Try direct lookup (case-insensitive)
        String key = location.trim().toLowerCase();
        double[] coords = CITY_COORDS.get(key);
        if (coords != null) {
            return coords;
        }

        // Try partial match (city name contained in location string)
        for (Map.Entry<String, double[]> entry : CITY_COORDS.entrySet()) {
            if (key.contains(entry.getKey()) || entry.getKey().contains(key)) {
                return entry.getValue();
            }
        }

        // Default: Istanbul
        return new double[]{41.0082, 28.9784};
    }

    /**
     * Convert birth date/time (Turkey local) to Julian Day (UT/UTC).
     * Uses Europe/Istanbul zone to correctly handle historical DST:
     *   - Before 2016: UTC+2 in winter, UTC+3 in summer
     *   - From Sep 2016: permanently UTC+3
     */
    private double toJulianDay(LocalDate date, LocalTime time) {
        return toJulianDay(date, time, ISTANBUL_ZONE);
    }

    private double toJulianDay(LocalDate date, LocalTime time, ZoneId zoneId) {
        ZonedDateTime localZdt = ZonedDateTime.of(LocalDateTime.of(date, time), zoneId);
        ZonedDateTime utcZdt = localZdt.withZoneSameInstant(ZoneOffset.UTC);

        int year  = utcZdt.getYear();
        int month = utcZdt.getMonthValue();
        int day   = utcZdt.getDayOfMonth();
        double utcHour = utcZdt.getHour()
                + utcZdt.getMinute() / 60.0
                + utcZdt.getSecond() / 3600.0;

        return SweDate.getJulDay(year, month, day, utcHour, SweDate.SE_GREG_CAL);
    }

    private ZoneId resolveZoneId(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return ISTANBUL_ZONE;
        }
        try {
            return ZoneId.of(timezone);
        } catch (Exception ignored) {
            return ISTANBUL_ZONE;
        }
    }

    /**
     * Chart Ruler: the ruling planet of the Ascendant sign (modern rulership).
     * Returns null when risingSign is null (birth time unknown).
     */
    public String computeChartRuler(String risingSign) {
        if (risingSign == null) return null;
        return switch (risingSign.toUpperCase()) {
            case "ARIES"       -> "Mars";
            case "TAURUS"      -> "Venus";
            case "GEMINI"      -> "Mercury";
            case "CANCER"      -> "Moon";
            case "LEO"         -> "Sun";
            case "VIRGO"       -> "Mercury";
            case "LIBRA"       -> "Venus";
            case "SCORPIO"     -> "Pluto";
            case "SAGITTARIUS" -> "Jupiter";
            case "CAPRICORN"   -> "Saturn";
            case "AQUARIUS"    -> "Uranus";
            case "PISCES"      -> "Neptune";
            default            -> null;
        };
    }

    private static final Set<String> COUNTED_PLANETS = Set.of(
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    );

    /**
     * Element distribution across the 10 traditional planets.
     * Keys: Fire, Earth, Air, Water.
     */
    public Map<String, Integer> computeElementDistribution(List<PlanetPosition> planets) {
        Map<String, Integer> dist = new LinkedHashMap<>();
        dist.put("Fire", 0);
        dist.put("Earth", 0);
        dist.put("Air", 0);
        dist.put("Water", 0);
        if (planets == null) return dist;
        for (PlanetPosition p : planets) {
            if (!COUNTED_PLANETS.contains(p.planet())) continue;
            dist.merge(signElement(p.sign()), 1, Integer::sum);
        }
        return dist;
    }

    /**
     * Mode distribution across the 10 traditional planets.
     * Keys: Cardinal, Fixed, Mutable.
     */
    public Map<String, Integer> computeModeDistribution(List<PlanetPosition> planets) {
        Map<String, Integer> dist = new LinkedHashMap<>();
        dist.put("Cardinal", 0);
        dist.put("Fixed", 0);
        dist.put("Mutable", 0);
        if (planets == null) return dist;
        for (PlanetPosition p : planets) {
            if (!COUNTED_PLANETS.contains(p.planet())) continue;
            dist.merge(signMode(p.sign()), 1, Integer::sum);
        }
        return dist;
    }

    private String signElement(String sign) {
        if (sign == null) return "Fire";
        return switch (sign.toUpperCase()) {
            case "ARIES", "LEO", "SAGITTARIUS"          -> "Fire";
            case "TAURUS", "VIRGO", "CAPRICORN"         -> "Earth";
            case "GEMINI", "LIBRA", "AQUARIUS"           -> "Air";
            case "CANCER", "SCORPIO", "PISCES"           -> "Water";
            default                                       -> "Fire";
        };
    }

    private String signMode(String sign) {
        if (sign == null) return "Cardinal";
        return switch (sign.toUpperCase()) {
            case "ARIES", "CANCER", "LIBRA", "CAPRICORN"       -> "Cardinal";
            case "TAURUS", "LEO", "SCORPIO", "AQUARIUS"        -> "Fixed";
            case "GEMINI", "VIRGO", "SAGITTARIUS", "PISCES"    -> "Mutable";
            default                                              -> "Cardinal";
        };
    }

    /**
     * Determine which house a planet falls in based on house cusps.
     */
    private int findHouse(double longitude, double[] houseCusps) {
        for (int i = 1; i <= 12; i++) {
            int next = (i % 12) + 1;
            double start = houseCusps[i];
            double end = houseCusps[next];

            if (end < start) {
                // Wraps around 360
                if (longitude >= start || longitude < end) return i;
            } else {
                if (longitude >= start && longitude < end) return i;
            }
        }
        return 1; // default
    }
}
