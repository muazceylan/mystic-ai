package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.PlanetaryAspect.AspectType;
import org.springframework.stereotype.Service;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SweDate;
import de.thmac.swisseph.SwissEph;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * High-precision transit calculator using Swiss Ephemeris (Moshier ephemeris).
 * Calculates real planetary positions, retrograde status, moon phases, and transit aspects.
 */
@Service
public class TransitCalculator {

    private static final String[] PLANETS = {
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
            "Chiron", "NorthNode"
    };

    private static final int[] SE_PLANET_IDS = {
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

    private static final String[] SIGNS = {
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    };

    private final SwissEph sw = new SwissEph();

    /**
     * Calculate transit positions for all planets on a given date (noon UTC).
     */
    public List<PlanetPosition> calculateTransitPositions(LocalDate date) {
        List<PlanetPosition> positions = new ArrayList<>();
        double julDay = toJulianDayNoon(date);
        int iflag = SweConst.SEFLG_SWIEPH | SweConst.SEFLG_SPEED;

        for (int i = 0; i < PLANETS.length; i++) {
            double[] result = new double[6];
            StringBuffer errBuf = new StringBuffer();
            sw.swe_calc_ut(julDay, SE_PLANET_IDS[i], iflag, result, errBuf);

            double absLong = result[0];
            double speed = result[3];
            boolean retrograde = speed < 0;

            // North Node: always direct in traditional astrology
            if (PLANETS[i].equals("NorthNode")) retrograde = false;

            int signIndex = (int) (absLong / 30.0);
            double degInSign = absLong % 30.0;
            int deg = (int) degInSign;
            double fracDeg = degInSign - deg;
            int minutes = (int) (fracDeg * 60);
            int seconds = (int) ((fracDeg * 60 - minutes) * 60);

            // Transit house is 0 (undefined until overlaid on natal chart)
            positions.add(new PlanetPosition(
                    PLANETS[i],
                    SIGNS[signIndex],
                    deg,
                    minutes,
                    seconds,
                    retrograde,
                    0,
                    Math.round(absLong * 10000.0) / 10000.0
            ));
        }

        return positions;
    }

    /**
     * Determine which natal house a transit planet falls in.
     */
    public int getTransitHouse(PlanetPosition transit, List<HousePlacement> natalHouses) {
        double transitLong = transit.absoluteLongitude();
        // Fallback for old data without absoluteLongitude
        if (transitLong == 0.0) {
            transitLong = getAbsoluteLongitude(transit);
        }

        for (int i = 0; i < natalHouses.size(); i++) {
            int nextIndex = (i + 1) % natalHouses.size();
            double cuspStart = getHouseCuspLongitude(natalHouses.get(i));
            double cuspEnd = getHouseCuspLongitude(natalHouses.get(nextIndex));

            if (cuspEnd < cuspStart) {
                if (transitLong >= cuspStart || transitLong < cuspEnd) {
                    return natalHouses.get(i).houseNumber();
                }
            } else {
                if (transitLong >= cuspStart && transitLong < cuspEnd) {
                    return natalHouses.get(i).houseNumber();
                }
            }
        }
        return 1;
    }

    /**
     * Calculate aspects between transit planets and natal planets.
     */
    public List<PlanetaryAspect> calculateTransitAspects(
            List<PlanetPosition> transits, List<PlanetPosition> natal) {
        List<PlanetaryAspect> aspects = new ArrayList<>();

        for (PlanetPosition transit : transits) {
            for (PlanetPosition natalPlanet : natal) {
                double transitLong = transit.absoluteLongitude();
                double natalLong = natalPlanet.absoluteLongitude();

                // Fallback for old data
                if (transitLong == 0.0) transitLong = getAbsoluteLongitude(transit);
                if (natalLong == 0.0) natalLong = getAbsoluteLongitude(natalPlanet);

                double angle = Math.abs(transitLong - natalLong);
                if (angle > 180) angle = 360 - angle;

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        aspects.add(new PlanetaryAspect(
                                "T-" + transit.planet(),
                                "N-" + natalPlanet.planet(),
                                type,
                                Math.round(angle * 100.0) / 100.0,
                                Math.round(orb * 100.0) / 100.0
                        ));
                        break;
                    }
                }
            }
        }

        return aspects;
    }

    /**
     * Check if a planet is retrograde on a given date using SwissEph.
     */
    public boolean isRetrograde(int planetIndex, long daysSinceEpoch) {
        // Sun (0) and Moon (1) are never retrograde
        if (planetIndex < 2) return false;
        if (planetIndex >= SE_PLANET_IDS.length) return false;

        LocalDate date = LocalDate.ofEpochDay(daysSinceEpoch);
        double julDay = toJulianDayNoon(date);
        double[] result = new double[6];
        StringBuffer errBuf = new StringBuffer();
        sw.swe_calc_ut(julDay, SE_PLANET_IDS[planetIndex], SweConst.SEFLG_SWIEPH | SweConst.SEFLG_SPEED, result, errBuf);
        return result[3] < 0;
    }

    /**
     * Calculate Moon phase using real Sun-Moon elongation.
     * Returns a Turkish description of the phase.
     */
    public String getMoonPhase(LocalDate date) {
        double julDay = toJulianDayNoon(date);
        int iflag = SweConst.SEFLG_SWIEPH;

        double[] sunResult = new double[6];
        double[] moonResult = new double[6];
        StringBuffer errBuf = new StringBuffer();

        sw.swe_calc_ut(julDay, SweConst.SE_SUN, iflag, sunResult, errBuf);
        sw.swe_calc_ut(julDay, SweConst.SE_MOON, iflag, moonResult, errBuf);

        double elongation = moonResult[0] - sunResult[0];
        if (elongation < 0) elongation += 360.0;

        // 8 phases, each 45 degrees
        int phaseIndex = (int) (elongation / 45.0);
        if (phaseIndex > 7) phaseIndex = 0;

        return switch (phaseIndex) {
            case 0 -> "Yeni Ay";
            case 1 -> "Hilal (Büyüyen)";
            case 2 -> "İlk Dördün";
            case 3 -> "Şişkin Ay (Büyüyen)";
            case 4 -> "Dolunay";
            case 5 -> "Şişkin Ay (Küçülen)";
            case 6 -> "Son Dördün";
            case 7 -> "Hilal (Küçülen)";
            default -> "Yeni Ay";
        };
    }

    /**
     * Convert a date to Julian Day at noon UTC (for transit calculations).
     */
    private double toJulianDayNoon(LocalDate date) {
        return toJulianDay(date, 12.0);
    }

    private double toJulianDay(LocalDate date, double hourUtc) {
        return SweDate.getJulDay(
                date.getYear(), date.getMonthValue(), date.getDayOfMonth(),
                hourUtc, SweDate.SE_GREG_CAL);
    }

    /**
     * The moment at which the Moon's tightest aspect to a natal point is closest to exact,
     * searched across the user's LOCAL calendar day.
     *
     * The Moon travels ~13 degrees a day, so unlike the slower bodies its contacts have a
     * genuine intraday peak. This is the only real time-of-day signal available, and it is what
     * the daily plan's timeline is allowed to anchor on — everything else stays label-only
     * rather than inventing a clock time.
     *
     * The window is the local day converted to UTC instants, so a user in Auckland and a user
     * in Los Angeles asking at the same moment each get their own day scanned, and DST
     * transitions (23- or 25-hour days) are handled by walking instants rather than hours.
     *
     * @return empty when no natal contact falls inside orb at any point in the local day
     */
    public java.util.Optional<MoonAspectPeak> findMoonAspectPeak(
            LocalDate localDate, ZoneId zone, List<PlanetPosition> natalPositions) {
        if (localDate == null || zone == null || natalPositions == null || natalPositions.isEmpty()) {
            return java.util.Optional.empty();
        }

        Instant dayStart = localDate.atStartOfDay(zone).toInstant();
        Instant dayEnd = localDate.plusDays(1).atStartOfDay(zone).toInstant();

        int iflag = SweConst.SEFLG_SWIEPH | SweConst.SEFLG_SPEED;
        MoonAspectPeak best = null;

        for (Instant sample = dayStart; sample.isBefore(dayEnd); sample = sample.plus(1, ChronoUnit.HOURS)) {
            double[] result = new double[6];
            StringBuffer errBuf = new StringBuffer();
            int rc = sw.swe_calc_ut(toJulianDay(sample), SweConst.SE_MOON, iflag, result, errBuf);
            if (rc < 0) {
                continue;
            }
            double moonLong = result[0];

            for (PlanetPosition natalPlanet : natalPositions) {
                double natalLong = natalPlanet.absoluteLongitude();
                if (natalLong == 0.0) {
                    natalLong = getAbsoluteLongitude(natalPlanet);
                }

                double angle = Math.abs(moonLong - natalLong);
                if (angle > 180) angle = 360 - angle;

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb > type.getOrbAllowance()) {
                        continue;
                    }
                    if (best == null || orb < best.orb()) {
                        best = new MoonAspectPeak(
                                sample,
                                natalPlanet.planet(),
                                type,
                                Math.round(orb * 100.0) / 100.0
                        );
                    }
                    break;
                }
            }
        }

        return java.util.Optional.ofNullable(best);
    }

    private double toJulianDay(Instant instant) {
        java.time.ZonedDateTime utc = instant.atZone(java.time.ZoneOffset.UTC);
        double hour = utc.getHour() + utc.getMinute() / 60.0 + utc.getSecond() / 3600.0;
        return SweDate.getJulDay(
                utc.getYear(), utc.getMonthValue(), utc.getDayOfMonth(), hour, SweDate.SE_GREG_CAL);
    }

    /**
     * @param peakInstant the UTC instant at which the aspect is tightest
     */
    public record MoonAspectPeak(
            Instant peakInstant,
            String natalPlanet,
            AspectType aspectType,
            double orb
    ) {}

    /** Fallback: reconstruct absolute longitude from sign + degree (for old data compatibility) */
    private double getAbsoluteLongitude(PlanetPosition planet) {
        int signIndex = getSignIndex(planet.sign());
        return signIndex * 30.0 + planet.degree() + planet.minutes() / 60.0 + planet.seconds() / 3600.0;
    }

    private double getHouseCuspLongitude(HousePlacement house) {
        int signIndex = getSignIndex(house.sign());
        return signIndex * 30.0 + house.degree();
    }

    private int getSignIndex(String sign) {
        for (int i = 0; i < SIGNS.length; i++) {
            if (SIGNS[i].equalsIgnoreCase(sign)) return i;
        }
        return 0;
    }
}
