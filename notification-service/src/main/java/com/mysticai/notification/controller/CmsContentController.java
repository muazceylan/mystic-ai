package com.mysticai.notification.controller;

import com.mysticai.notification.admin.service.ExploreCategoryService;
import com.mysticai.notification.admin.service.ExploreCardService;
import com.mysticai.notification.admin.service.HomeSectionService;
import com.mysticai.notification.admin.service.PlacementBannerService;
import com.mysticai.notification.admin.service.cms.DailyHoroscopeCmsService;
import com.mysticai.notification.admin.service.cms.HoroscopeIngestService;
import com.mysticai.notification.admin.service.cms.PrayerContentService;
import com.mysticai.notification.admin.service.cms.WeeklyHoroscopeCmsService;
import com.mysticai.notification.entity.cms.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * Public CMS content endpoints consumed by the mobile app.
 * Falls back to ingesting from astrology-service if no CMS record exists.
 */
@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
@Slf4j
public class CmsContentController {

    private final DailyHoroscopeCmsService dailyService;
    private final WeeklyHoroscopeCmsService weeklyService;
    private final HoroscopeIngestService ingestService;
    private final PrayerContentService prayerService;
    private final HomeSectionService homeSectionService;
    private final ExploreCategoryService exploreCategoryService;
    private final ExploreCardService exploreCardService;
    private final PlacementBannerService placementBannerService;

    // ----- Daily Horoscope -----

    /**
     * GET /api/v1/content/horoscope/daily?sign=ARIES&date=2026-03-08&locale=tr
     * Returns CMS record if PUBLISHED, otherwise falls back to live ingest from astrology-service.
     */
    @GetMapping("/horoscope/daily")
    public ResponseEntity<?> getDailyHoroscope(
            @RequestParam String sign,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "tr") String locale) {

        if (date == null) date = LocalDate.now();

        WeeklyHoroscopeCms.ZodiacSign zodiacSign;
        try {
            zodiacSign = WeeklyHoroscopeCms.ZodiacSign.valueOf(sign.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid zodiac sign: " + sign);
        }

        // CMS DB first — any PUBLISHED record is authoritative (including admin edits)
        var existing = dailyService.findAll(zodiacSign,
                DailyHoroscopeCms.Status.PUBLISHED, null, locale, date, date,
                org.springframework.data.domain.PageRequest.of(0, 1)).getContent();

        if (!existing.isEmpty()) {
            DailyHoroscopeCms record = existing.get(0);
            log.info("[CMS] daily {} {} {} → SOURCE: DB | id={} sourceType={} overrideActive={}",
                    zodiacSign, date, locale, record.getId(), record.getSourceType(), record.isOverrideActive());
            return ResponseEntity.ok(record);
        }

        // No published record in DB — fall back to live ingest from astrology-service
        log.info("[CMS] daily {} {} {} → no PUBLISHED record, ingesting from astrology-service", zodiacSign, date, locale);
        try {
            DailyHoroscopeCms ingested = ingestService.ingestDaily(zodiacSign, date, locale);
            if (ingested != null && ingested.getIngestError() == null) {
                log.info("[CMS] daily {} {} {} → SOURCE: ASTROLOGY-API (freshly ingested)", zodiacSign, date, locale);
                return ResponseEntity.ok(ingested);
            }
            if (ingested != null) {
                log.warn("[CMS] daily {} {} {} → ingest failed: {}", zodiacSign, date, locale, ingested.getIngestError());
            }
        } catch (Exception e) {
            log.warn("[CMS] daily {} {} {} → ingest exception: {}", zodiacSign, date, locale, e.getMessage());
        }

        return ResponseEntity.notFound().build();
    }

    // ----- Weekly Horoscope -----

    /**
     * GET /api/v1/content/horoscope/weekly?sign=ARIES&weekStart=2026-03-03&locale=tr
     * weekStart defaults to the current Monday.
     */
    @GetMapping("/horoscope/weekly")
    public ResponseEntity<?> getWeeklyHoroscope(
            @RequestParam String sign,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestParam(defaultValue = "tr") String locale) {

        if (weekStart == null) {
            weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }

        WeeklyHoroscopeCms.ZodiacSign zodiacSign;
        try {
            zodiacSign = WeeklyHoroscopeCms.ZodiacSign.valueOf(sign.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid zodiac sign: " + sign);
        }

        // CMS DB first — any PUBLISHED record is authoritative
        var existing = weeklyService.findAll(zodiacSign,
                WeeklyHoroscopeCms.Status.PUBLISHED, null, locale, weekStart, weekStart,
                org.springframework.data.domain.PageRequest.of(0, 1)).getContent();

        if (!existing.isEmpty()) {
            WeeklyHoroscopeCms record = existing.get(0);
            log.info("[CMS] weekly {} {} {} → SOURCE: DB | id={} sourceType={} overrideActive={}",
                    zodiacSign, weekStart, locale, record.getId(), record.getSourceType(), record.isOverrideActive());
            return ResponseEntity.ok(record);
        }

        // No published record in DB — fall back to live ingest
        log.info("[CMS] weekly {} {} {} → no PUBLISHED record, ingesting from astrology-service", zodiacSign, weekStart, locale);
        try {
            WeeklyHoroscopeCms ingested = ingestService.ingestWeekly(zodiacSign, weekStart, locale);
            if (ingested != null && ingested.getIngestError() == null) {
                log.info("[CMS] weekly {} {} {} → SOURCE: ASTROLOGY-API (freshly ingested)", zodiacSign, weekStart, locale);
                return ResponseEntity.ok(ingested);
            }
            if (ingested != null) {
                log.warn("[CMS] weekly {} {} {} → ingest failed: {}", zodiacSign, weekStart, locale, ingested.getIngestError());
            }
        } catch (Exception e) {
            log.warn("[CMS] weekly {} {} {} → ingest exception: {}", zodiacSign, weekStart, locale, e.getMessage());
        }

        return ResponseEntity.notFound().build();
    }

    // ----- Prayers -----

    /**
     * GET /api/v1/content/prayers?locale=tr
     * Returns all published + active prayers.
     */
    @GetMapping("/prayers")
    public ResponseEntity<List<PrayerContent>> getPrayers(
            @RequestParam(defaultValue = "tr") String locale,
            @RequestParam(required = false) PrayerContent.Category category) {

        // Use full filter if category is specified
        if (category != null) {
            return ResponseEntity.ok(
                    prayerService.findAll(PrayerContent.Status.PUBLISHED, category, null, locale, null, null,
                            org.springframework.data.domain.PageRequest.of(0, 200, org.springframework.data.domain.Sort.by("id").ascending()))
                            .getContent());
        }
        return ResponseEntity.ok(prayerService.findPublishedForLocale(locale));
    }

    /**
     * GET /api/v1/content/prayers/featured?locale=tr
     */
    @GetMapping("/prayers/featured")
    public ResponseEntity<List<PrayerContent>> getFeaturedPrayers(
            @RequestParam(defaultValue = "tr") String locale) {
        return ResponseEntity.ok(prayerService.findFeaturedForLocale(locale));
    }

    /**
     * GET /api/v1/content/prayers/{id}
     */
    @GetMapping("/prayers/{id}")
    public ResponseEntity<PrayerContent> getPrayer(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(prayerService.findById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ----- Home Sections -----

    /**
     * GET /api/v1/content/home-sections?locale=tr
     * Returns published + active + within date window, sorted by sortOrder.
     */
    @GetMapping("/home-sections")
    public ResponseEntity<List<HomeSection>> getHomeSections(
            @RequestParam(defaultValue = "tr") String locale) {
        LocalDateTime now = LocalDateTime.now();
        List<HomeSection> sections = homeSectionService
                .findPublishedActive(locale, now);
        return ResponseEntity.ok(sections);
    }

    // ----- Explore Categories -----

    /**
     * GET /api/v1/content/explore-categories?locale=tr
     */
    @GetMapping("/explore-categories")
    public ResponseEntity<List<ExploreCategory>> getExploreCategories(
            @RequestParam(defaultValue = "tr") String locale) {
        LocalDateTime now = LocalDateTime.now();
        List<ExploreCategory> categories = exploreCategoryService
                .findPublishedActive(locale, now);
        return ResponseEntity.ok(categories);
    }

    // ----- Explore Cards -----

    /**
     * GET /api/v1/content/explore-cards?locale=tr&categoryKey=spiritual
     */
    @GetMapping("/explore-cards")
    public ResponseEntity<List<ExploreCard>> getExploreCards(
            @RequestParam(defaultValue = "tr") String locale,
            @RequestParam(required = false) String categoryKey) {
        LocalDateTime now = LocalDateTime.now();
        List<ExploreCard> cards = exploreCardService
                .findPublishedActive(categoryKey, locale, now);
        return ResponseEntity.ok(cards);
    }

    // ----- Banners -----

    /**
     * GET /api/v1/content/banners?placementType=HOME_HERO&locale=tr
     */
    @GetMapping("/banners")
    public ResponseEntity<List<PlacementBanner>> getBanners(
            @RequestParam PlacementBanner.PlacementType placementType,
            @RequestParam(defaultValue = "tr") String locale) {
        LocalDateTime now = LocalDateTime.now();
        List<PlacementBanner> banners = placementBannerService
                .findPublishedActive(placementType, locale, now);
        return ResponseEntity.ok(banners);
    }
}
