package com.mysticai.astrology.entity;

import lombok.Getter;

@Getter
public enum ZodiacSign {
    ARIES("Koç", "♈", "Ateş", "21 Mart - 19 Nisan"),
    TAURUS("Boğa", "♉", "Toprak", "20 Nisan - 20 Mayıs"),
    GEMINI("İkizler", "♊", "Hava", "21 Mayıs - 20 Haziran"),
    CANCER("Yengeç", "♋", "Su", "21 Haziran - 22 Temmuz"),
    LEO("Aslan", "♌", "Ateş", "23 Temmuz - 22 Ağustos"),
    VIRGO("Başak", "♍", "Toprak", "23 Ağustos - 22 Eylül"),
    LIBRA("Terazi", "♎", "Hava", "23 Eylül - 22 Ekim"),
    SCORPIO("Akrep", "♏", "Su", "23 Ekim - 21 Kasım"),
    SAGITTARIUS("Yay", "♐", "Ateş", "22 Kasım - 21 Aralık"),
    CAPRICORN("Oğlak", "♑", "Toprak", "22 Aralık - 19 Ocak"),
    AQUARIUS("Kova", "♒", "Hava", "20 Ocak - 18 Şubat"),
    PISCES("Balık", "♓", "Su", "19 Şubat - 20 Mart"),
    UNKNOWN("Bilinmiyor", "?", "Bilinmiyor", "");

    private final String turkishName;
    private final String symbol;
    private final String element;
    private final String dateRange;

    ZodiacSign(String turkishName, String symbol, String element, String dateRange) {
        this.turkishName = turkishName;
        this.symbol = symbol;
        this.element = element;
        this.dateRange = dateRange;
    }
}
