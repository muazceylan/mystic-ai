# Ruhsal Pratikler Modulu - API Spec ve Backend Blueprint

Bu belge `Spring Boot + PostgreSQL + Redis` stack'i icin REST API tasarimini ve backend kod yapisi iskeletini tanimlar.

## Teknik Mimari Karari (Oneri)

### Onerilen: Yeni servis (`spiritual-service`)

Neden:
- Astroloji servisindeki riskli degisiklikleri azaltir
- Ayrı deploy / rollback imkani verir
- Dini/icerik moderasyonu tarafini ayrik tutar

Alternatif (hizli MVP):
- `astrology-service` icinde `com.mysticai.astrology.spiritual.*` alt paketi

## Proje Klasor Yapisi (Backend)

```text
spiritual-service/
  src/main/java/com/mysticai/spiritual
    config/
    controller/
    dto/
      daily/
      log/
      stats/
      common/
    entity/
    repository/
    service/
    mapper/
    exception/
    security/
    scheduler/
  src/main/resources
    application.yml
    db/migration/
      V1__Create_Spiritual_Module.sql
      V2__Seed_Spiritual_Content.sql
```

## B) API Tasarimi (REST)

### Base Path

- `/api/v1/spiritual`

### Auth

- `JWT` (API Gateway veya service resource-server)
- Kullanici kimligi body/path yerine JWT claim'den alinmali
- `userId` parametresi sadece admin/internal endpointlerde kabul edilmeli

### Headerlar (onerilen)

- `Authorization: Bearer <token>`
- `Accept-Language: tr-TR`
- `X-Timezone: Europe/Istanbul`
- `Idempotency-Key: <uuid>` (log POST icin)

## Endpointler

### 1. Gunluk Icerikler

#### `GET /daily/prayers?date=YYYY-MM-DD`

Amaç:
- Gunun dua setini dondurur (3-7 item)

Response:
- `date`
- `scope`
- `setId`
- `variant`
- `items[]`

Not:
- `date` verilmezse kullanicinin timezone'una gore `today`

#### `GET /prayers/{id}`

Amaç:
- Dua detay icerigini dondurur

Response alanlari:
- `id`, `title`, `category`
- `sourceLabel`, `sourceNote`
- `arabicText?`, `transliterationTr`, `meaningTr`
- `recommendedRepeatCount`, `estimatedReadSeconds`
- `isFavoritable`, `disclaimerText`

#### `GET /daily/asma?date=YYYY-MM-DD`

Amaç:
- Gunun esmasi

#### `GET /daily/meditation?date=YYYY-MM-DD`

Amaç:
- Gunun egzersizi (nefes/farkindalik)

### 2. Log Endpointleri

#### `POST /log/prayer`

Request:

```json
{
  "date": "2026-02-25",
  "prayerId": 101,
  "count": 33,
  "note": "Sabah rutini tamamlandi",
  "mood": "SAKIN"
}
```

Kurallar:
- `count` pozitif olmali
- Ayni gun/dua icin aggregate edilebilir
- `Idempotency-Key` varsa duplicate submit engellenmeli

#### `GET /log/prayer?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=20`

Amaç:
- Tarih araliginda dua loglarini sayfali getirir

#### `POST /log/asma`

Request:

```json
{
  "date": "2026-02-25",
  "asmaId": 12,
  "count": 33
}
```

#### `POST /log/meditation`

Request:

```json
{
  "date": "2026-02-25",
  "exerciseId": 7,
  "durationSec": 120,
  "moodBefore": "GERGIN",
  "moodAfter": "SAKIN",
  "completedCycles": 6
}
```

### 3. Istatistik

#### `GET /stats/weekly?week=YYYY-Www`

Response (ornek):

```json
{
  "week": "2026-W09",
  "totalPrayerRepeats": 420,
  "totalAsmaRepeats": 132,
  "totalMeditationSec": 840,
  "topPrayer": {
    "prayerId": 101,
    "title": "Sabah Huzur Duasi (Kisa)",
    "repeatCount": 120
  },
  "streakDays": 5,
  "activeDays": 6
}
```

## Onerilen Ek Endpointler (pratikte gerekli)

- `GET /prayers/short?limit=10`
- `POST /prayers/{id}/favorite`
- `DELETE /prayers/{id}/favorite`
- `GET /asma?search=&theme=&sort=&page=&pageSize=`
- `GET /preferences`
- `PUT /preferences`
- `POST /content/report`
- `GET /content/version`

## Validation Kurallari

- `date`: ISO date
- `count`: `1..100000`
- `durationSec`: `10..7200`
- `note`: max `1000` char
- `pageSize`: default `20`, max `100`
- `mood`: enum (`MUTLU`, `SAKIN`, `GERGIN`, `YORGUN`, `ODAKLI`, `SUKURLU`, `DIGER`)

## Rate Limit (Redis Onerisi)

- `GET /daily/*`: `60 req/min/user`
- `GET /log/*`: `120 req/min/user`
- `POST /log/*`: `60 req/min/user`
- `POST /content/report`: `10 req/day/user`

## Pagination Standarti

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 42,
  "totalPages": 3
}
```

## Error Codes / Response Kurallari

- `200 OK`: read endpoints
- `201 Created`: create log (veya `200` upsert)
- `400 Bad Request`: validation
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`: duplicate/idempotency conflict (opsiyonel)
- `429 Too Many Requests`
- `500 Internal Server Error`

Hata response formati (repo stiline uyumlu):

```json
{
  "status": 400,
  "error": "Validation Failed",
  "message": "count must be between 1 and 100000",
  "path": "/api/v1/spiritual/log/prayer",
  "timestamp": "2026-02-25T10:20:30"
}
```

## Spring Boot Kod Iskeleti (Ornek)

### Controller (ornek)

```java
@RestController
@RequestMapping("/api/v1/spiritual")
@RequiredArgsConstructor
public class SpiritualController {

    private final SpiritualDailyService dailyService;
    private final SpiritualLogService logService;

    @GetMapping("/daily/prayers")
    public ResponseEntity<DailyPrayerSetResponse> getDailyPrayers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage,
            @RequestHeader(value = "X-Timezone", required = false) String timezone
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ResponseEntity.ok(dailyService.getDailyPrayerSet(userId, date, acceptLanguage, timezone));
    }

    @PostMapping("/log/prayer")
    public ResponseEntity<DhikrLogResponse> logPrayer(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePrayerLogRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idemKey
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ResponseEntity.ok(logService.logPrayer(userId, request, idemKey));
    }
}
```

### DTO (record) ornegi

```java
public record CreatePrayerLogRequest(
        @NotNull LocalDate date,
        @NotNull Long prayerId,
        @Min(1) @Max(100000) Integer count,
        @Size(max = 1000) String note,
        @Pattern(regexp = "MUTLU|SAKIN|GERGIN|YORGUN|ODAKLI|SUKURLU|DIGER") String mood
) {}
```

### Service (ornek)

```java
@Service
@RequiredArgsConstructor
public class SpiritualLogService {

    private final PrayerRepository prayerRepository;
    private final DhikrEntryRepository dhikrEntryRepository;
    private final IdempotencyService idempotencyService;

    @Transactional
    public DhikrLogResponse logPrayer(Long userId, CreatePrayerLogRequest req, String idemKey) {
        idempotencyService.assertNotDuplicate(userId, "log-prayer", idemKey);

        Prayer prayer = prayerRepository.findByIdAndActiveTrue(req.prayerId())
                .orElseThrow(() -> new IllegalArgumentException("Prayer not found"));

        DhikrEntry entry = dhikrEntryRepository
                .findByUserIdAndEntryDateAndPrayerId(userId, req.date(), prayer.getId())
                .orElseGet(() -> DhikrEntry.newPrayerEntry(userId, req.date(), prayer.getId()));

        entry.setTotalRepeatCount((entry.getTotalRepeatCount() == null ? 0 : entry.getTotalRepeatCount()) + req.count());
        entry.setSessionCount((entry.getSessionCount() == null ? 0 : entry.getSessionCount()) + 1);
        if (req.note() != null && !req.note().isBlank()) entry.setNote(req.note());
        if (req.mood() != null && !req.mood().isBlank()) entry.setMood(req.mood());

        DhikrEntry saved = dhikrEntryRepository.save(entry);
        return DhikrLogResponse.from(saved, prayer.getTitle(), prayer.getRecommendedRepeatCount());
    }
}
```

### Repository (ornek)

```java
public interface DhikrEntryRepository extends JpaRepository<DhikrEntry, Long> {
    Optional<DhikrEntry> findByUserIdAndEntryDateAndPrayerId(Long userId, LocalDate date, Long prayerId);
    Optional<DhikrEntry> findByUserIdAndEntryDateAndAsmaId(Long userId, LocalDate date, Long asmaId);
    List<DhikrEntry> findAllByUserIdAndEntryDateBetweenOrderByEntryDateDesc(Long userId, LocalDate from, LocalDate to);
}
```

### Entity (kisa ornek)

```java
@Entity
@Table(name = "prayers", indexes = {
        @Index(name = "idx_prayers_category_active", columnList = "category, active")
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Prayer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 120)
    private String slug;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, length = 64)
    private String category;
    @Column(name = "source_label", nullable = false, length = 32)
    private String sourceLabel;
    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;
    @Column(name = "arabic_text", columnDefinition = "TEXT")
    private String arabicText;
    @Column(name = "transliteration_tr", columnDefinition = "TEXT", nullable = false)
    private String transliterationTr;
    @Column(name = "meaning_tr", columnDefinition = "TEXT", nullable = false)
    private String meaningTr;
    @Column(name = "recommended_repeat_count", nullable = false)
    private Integer recommendedRepeatCount;
    @Column(name = "estimated_read_seconds", nullable = false)
    private Integer estimatedReadSeconds;
    @Column(nullable = false)
    private Boolean active;
}
```

## Redis Kullanimlari (onerilen)

- Rate limiting
- Idempotency key cache (`userId + endpoint + key`, TTL)
- Daily snapshot cache (`daily:prayers:{date}:{scope}:{user?}`)
- Stats cache (`weekly:{userId}:{week}`)

## API Gateway Entegrasyon Notlari

- `/api/v1/spiritual/**` route tanimla
- JWT forwarding / auth header passthrough
- Timezone ve language headerlarini allow et
- Rate limit gateway seviyesinde de eklenebilir

## Flyway Migration Iskeleti (ornek)

```sql
-- V1__Create_Spiritual_Module.sql
CREATE TABLE IF NOT EXISTS prayers (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(64) NOT NULL,
  source_label VARCHAR(32) NOT NULL,
  source_note TEXT,
  arabic_text TEXT,
  transliteration_tr TEXT NOT NULL,
  meaning_tr TEXT NOT NULL,
  recommended_repeat_count INT NOT NULL DEFAULT 1,
  estimated_read_seconds INT NOT NULL,
  is_favoritable BOOLEAN NOT NULL DEFAULT TRUE,
  disclaimer_text TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prayers_category_active ON prayers(category, active);
```

