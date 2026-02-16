package com.mysticai.numerology.service;

import com.mysticai.numerology.dto.NumerologyResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@Service
public class NumerologyCalculator {

    // Pythagorean numerology chart
    private static final Map<Character, Integer> PYTHAGOREAN_CHART = new HashMap<>();

    static {
        // A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9
        // J=1, K=2, L=3, M=4, N=5, O=6, P=7, Q=8, R=9
        // S=1, T=2, U=3, V=4, W=5, X=6, Y=7, Z=8
        String[] letters = {
            "ABCDEFGHI",
            "JKLMNOPQR",
            "STUVWXYZ"
        };
        for (int row = 0; row < letters.length; row++) {
            String rowLetters = letters[row];
            for (int col = 0; col < rowLetters.length(); col++) {
                char letter = rowLetters.charAt(col);
                PYTHAGOREAN_CHART.put(letter, col + 1);
            }
        }
    }

    public NumerologyResponse calculate(String name, String birthDateStr) {
        // Parse and validate birth date
        LocalDate birthDate = parseBirthDate(birthDateStr);
        
        // Calculate numbers
        int lifePathNumber = calculateLifePathNumber(birthDate);
        int destinyNumber = calculateDestinyNumber(name);
        int soulUrgeNumber = calculateSoulUrgeNumber(name);
        
        // Generate summary
        String summary = generateSummary(lifePathNumber, destinyNumber, soulUrgeNumber);
        
        return new NumerologyResponse(
                name,
                birthDateStr,
                lifePathNumber,
                destinyNumber,
                soulUrgeNumber,
                summary
        );
    }

    private LocalDate parseBirthDate(String birthDateStr) {
        try {
            return LocalDate.parse(birthDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid birth date format. Please use YYYY-MM-DD format.");
        }
    }

    /**
     * Calculates the Life Path Number from birth date.
     * This is the most important number in numerology.
     */
    private int calculateLifePathNumber(LocalDate birthDate) {
        String dateStr = String.format("%04d%02d%02d", 
                birthDate.getYear(), 
                birthDate.getMonthValue(), 
                birthDate.getDayOfMonth());
        return reduceToSingleDigit(sumDigits(dateStr));
    }

    /**
     * Calculates the Destiny Number (Expression Number) from name.
     * This reveals your life's purpose and talents.
     */
    private int calculateDestinyNumber(String name) {
        String cleanName = name.replaceAll("[^A-Za-z]", "").toUpperCase();
        int sum = 0;
        for (char c : cleanName.toCharArray()) {
            Integer value = PYTHAGOREAN_CHART.get(c);
            if (value != null) {
                sum += value;
            }
        }
        return reduceToSingleDigit(sum);
    }

    /**
     * Calculates the Soul Urge Number (Heart's Desire) from vowels in name.
     * This reveals your inner desires and motivations.
     */
    private int calculateSoulUrgeNumber(String name) {
        String cleanName = name.replaceAll("[^A-Za-z]", "").toUpperCase();
        int sum = 0;
        for (char c : cleanName.toCharArray()) {
            if (isVowel(c)) {
                Integer value = PYTHAGOREAN_CHART.get(c);
                if (value != null) {
                    sum += value;
                }
            }
        }
        return reduceToSingleDigit(sum);
    }

    private boolean isVowel(char c) {
        return c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U';
    }

    private int sumDigits(String str) {
        int sum = 0;
        for (char c : str.toCharArray()) {
            if (Character.isDigit(c)) {
                sum += Character.getNumericValue(c);
            }
        }
        return sum;
    }

    /**
     * Reduces a number to a single digit (1-9), except for master numbers 11, 22, 33.
     */
    private int reduceToSingleDigit(int number) {
        // Master numbers in numerology
        if (number == 11 || number == 22 || number == 33) {
            return number;
        }
        
        while (number > 9) {
            int sum = 0;
            while (number > 0) {
                sum += number % 10;
                number /= 10;
            }
            number = sum;
            
            // Check for master numbers during reduction
            if (number == 11 || number == 22 || number == 33) {
                break;
            }
        }
        return number;
    }

    private String generateSummary(int lifePath, int destiny, int soulUrge) {
        return String.format(
                "Your Life Path Number %d suggests your life journey and purpose. " +
                "Your Destiny Number %d indicates your natural talents and abilities. " +
                "Your Soul Urge Number %d reveals your inner desires and motivations. " +
                "Together, these numbers paint a picture of your spiritual blueprint.",
                lifePath, destiny, soulUrge
        );
    }
}
