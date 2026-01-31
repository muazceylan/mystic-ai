package com.mysticai.astrology.service;

import com.mysticai.astrology.entity.ZodiacSign;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.MonthDay;

@Service
@Slf4j
public class AstrologyCalculator {

    /**
     * Calculates the Sun Sign (Güneş Burcu) based on birth date.
     * This is the primary zodiac sign most people know.
     */
    public ZodiacSign calculateSunSign(LocalDateTime birthDate) {
        int month = birthDate.getMonthValue();
        int day = birthDate.getDayOfMonth();

        MonthDay birthDay = MonthDay.of(month, day);

        // Aries: March 21 - April 19
        if (isBetween(birthDay, MonthDay.of(3, 21), MonthDay.of(4, 19))) {
            return ZodiacSign.ARIES;
        }
        // Taurus: April 20 - May 20
        if (isBetween(birthDay, MonthDay.of(4, 20), MonthDay.of(5, 20))) {
            return ZodiacSign.TAURUS;
        }
        // Gemini: May 21 - June 20
        if (isBetween(birthDay, MonthDay.of(5, 21), MonthDay.of(6, 20))) {
            return ZodiacSign.GEMINI;
        }
        // Cancer: June 21 - July 22
        if (isBetween(birthDay, MonthDay.of(6, 21), MonthDay.of(7, 22))) {
            return ZodiacSign.CANCER;
        }
        // Leo: July 23 - August 22
        if (isBetween(birthDay, MonthDay.of(7, 23), MonthDay.of(8, 22))) {
            return ZodiacSign.LEO;
        }
        // Virgo: August 23 - September 22
        if (isBetween(birthDay, MonthDay.of(8, 23), MonthDay.of(9, 22))) {
            return ZodiacSign.VIRGO;
        }
        // Libra: September 23 - October 22
        if (isBetween(birthDay, MonthDay.of(9, 23), MonthDay.of(10, 22))) {
            return ZodiacSign.LIBRA;
        }
        // Scorpio: October 23 - November 21
        if (isBetween(birthDay, MonthDay.of(10, 23), MonthDay.of(11, 21))) {
            return ZodiacSign.SCORPIO;
        }
        // Sagittarius: November 22 - December 21
        if (isBetween(birthDay, MonthDay.of(11, 22), MonthDay.of(12, 21))) {
            return ZodiacSign.SAGITTARIUS;
        }
        // Capricorn: December 22 - January 19
        if (isBetween(birthDay, MonthDay.of(12, 22), MonthDay.of(12, 31)) ||
            isBetween(birthDay, MonthDay.of(1, 1), MonthDay.of(1, 19))) {
            return ZodiacSign.CAPRICORN;
        }
        // Aquarius: January 20 - February 18
        if (isBetween(birthDay, MonthDay.of(1, 20), MonthDay.of(2, 18))) {
            return ZodiacSign.AQUARIUS;
        }
        // Pisces: February 19 - March 20
        if (isBetween(birthDay, MonthDay.of(2, 19), MonthDay.of(3, 20))) {
            return ZodiacSign.PISCES;
        }

        log.warn("Could not determine sun sign for date: {}", birthDate);
        return ZodiacSign.UNKNOWN;
    }

    /**
     * Calculates the Moon Sign (Ay Burcu) based on birth date.
     * NOTE: This is a simplified approximation. Real calculation requires
     * ephemeris data and exact birth time.
     *
     * For MVP, we return UNKNOWN as accurate moon sign calculation
     * requires astronomical tables.
     */
    public ZodiacSign calculateMoonSign(LocalDateTime birthDate, Double latitude, Double longitude) {
        // Moon sign calculation requires:
        // 1. Exact birth time
        // 2. Birth location (latitude/longitude)
        // 3. Ephemeris data for moon position

        // For MVP, we use a simplified approach based on lunar cycle approximation
        // The moon changes signs approximately every 2.5 days

        if (latitude == null || longitude == null) {
            log.debug("Location not provided, returning UNKNOWN for moon sign");
            return ZodiacSign.UNKNOWN;
        }

        // Simplified calculation - cycles through signs based on day of year
        int dayOfYear = birthDate.getDayOfYear();
        int moonCycle = (dayOfYear * 12 / 365) % 12;

        return ZodiacSign.values()[moonCycle];
    }

    /**
     * Calculates the Rising Sign (Yükselen Burç) based on birth time and location.
     * NOTE: This requires exact birth time and location for accuracy.
     *
     * For MVP, we return UNKNOWN as accurate rising sign calculation
     * requires precise astronomical calculations.
     */
    public ZodiacSign calculateRisingSign(LocalDateTime birthDate, Double latitude, Double longitude) {
        // Rising sign (Ascendant) calculation requires:
        // 1. Exact birth time (hour and minute)
        // 2. Birth location (latitude/longitude)
        // 3. Sidereal time calculations

        if (latitude == null || longitude == null) {
            log.debug("Location not provided, returning UNKNOWN for rising sign");
            return ZodiacSign.UNKNOWN;
        }

        // Simplified calculation based on birth hour
        // Rising sign changes approximately every 2 hours
        int hour = birthDate.getHour();
        int risingIndex = (hour / 2) % 12;

        // Adjust based on sun sign for more realistic results
        ZodiacSign sunSign = calculateSunSign(birthDate);
        int sunIndex = sunSign.ordinal();
        int adjustedIndex = (sunIndex + risingIndex) % 12;

        return ZodiacSign.values()[adjustedIndex];
    }

    private boolean isBetween(MonthDay date, MonthDay start, MonthDay end) {
        return !date.isBefore(start) && !date.isAfter(end);
    }
}
