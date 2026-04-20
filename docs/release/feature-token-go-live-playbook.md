# Feature-Token Monetization Go-Live Playbook

Bu runbook, feature-token monetization release'i icin deploy oncesi kontrol, deploy sirasi komutlari, smoke test ve rollback adimlarini toplar.

## Deploy Oncesi Checklist

### Auth migration

- `auth-service` Flyway ile aciliyor ve `spring.flyway.enabled=true`.
- Signup bonus retry migration'i additive olarak `auth-service/src/main/resources/db/migration/V9__Add_Signup_Bonus_Sync_Fields.sql` icinde.
- Deploy oncesi tavsiye:
  - `cd auth-service && mvn -q -DskipTests flyway:info`
  - V9 pending gorunmeli ya da daha once applied ise `Success` olmali.

### Notification seed / admin config

- `notification-service` tarafinda yeni tablo migration'i yok; startup'ta `DatabaseMigrationRunner` kolonlari genisletiyor ve `MonetizationBootstrapService` eksik monetization ayarlarini seed ediyor.
- Seed edilen default feature action kayitlari:
  - `shareable_card_create`
  - `natal_chart_detail_view`
  - `compatibility_view`
  - `person_add`
  - `birth_night_poster_view`
  - `horoscope_view`
- Not:
  - Uygulama ici sabit isimler `FEATURE_ACTION_KEYS.*` tarafinda buyuk harfli sabitler olarak dursa da DB/admin `actionKey` degerleri lowercase snake_case tutulur.
  - Bootstrap seed idempotent'tir; mevcut prod datayi overwrite etmez. Prod'da daha once olusmus stale kayit varsa admin'den guncellenmesi gerekir.

### Beklenen default admin state

- `Monetization > Settings > Active Published`
  - `isEnabled=true`
  - `isAdsEnabled=true`
  - `isGuruEnabled=true`
  - `isSignupBonusEnabled=true`
  - `signupBonusTokenAmount=10`
  - `signupBonusLedgerReason=SIGNUP_BONUS`
  - `isSignupBonusOneTimeOnly=true`
- `Monetization > Actions`
  - Yukaridaki 6 action kaydi mevcut olmali.
  - Her biri icin `guruCost=1`
  - Her biri icin `rewardAmount=1`
  - Her biri icin `isRewardFallbackEnabled=true`
  - `unlockType=GURU_SPEND`

### Runtime env / secrets

- `k8s/stage/configmap.yaml` icinde auth signup bonus callback'i icin `NOTIFICATION_SERVICE_URL=http://notification-service:8088` mevcut olmali.
- `k8s/stage/secret.yaml` placeholder'lari doldurulmus olmali:
  - `JWT_SECRET`
  - `INTERNAL_GATEWAY_KEY`
  - `VERIFICATION_TOKEN_PEPPER`
  - `PASSWORD_RESET_TOKEN_PEPPER`
  - `ADMIN_JWT_SECRET`
- Native mobile release icin EAS/CI ortaminda su env'ler set edilmeli:
  - `EXPO_PUBLIC_APP_ENV=prod`
  - `EXPO_PUBLIC_API_BASE_URL_PROD=https://<public-app-host>`

### Observability

- Auth actuator artik `health,info,metrics,prometheus` expose eder.
- Notification actuator `health,info,metrics,prometheus` expose eder.
- Kontrol edilecek log patternleri:
  - Auth: `Signup bonus sync granted|failed|skipped`
  - Notification: `Feature token consumed|Feature access insufficient balance|Duplicate ... blocked|Signup bonus processed`

## Hızlı SQL / Admin Kontrolleri

### Feature actions

```sql
SELECT action_key, module_key, guru_cost, reward_amount, is_reward_fallback_enabled, is_enabled
FROM monetization_actions
WHERE action_key IN (
  'shareable_card_create',
  'natal_chart_detail_view',
  'compatibility_view',
  'person_add',
  'birth_night_poster_view',
  'horoscope_view'
)
ORDER BY module_key, action_key;
```

### Signup bonus ayari

```sql
SELECT settings_key, is_signup_bonus_enabled, signup_bonus_token_amount, signup_bonus_ledger_reason,
       is_signup_bonus_one_time_only, status, config_version
FROM monetization_settings
ORDER BY config_version DESC
LIMIT 3;
```

### Wallet / ledger consistency

```sql
SELECT w.user_id,
       w.current_balance,
       COALESCE(SUM(l.amount), 0) AS ledger_balance
FROM guru_wallet w
LEFT JOIN guru_ledger l ON l.user_id = w.user_id
GROUP BY w.user_id, w.current_balance
HAVING w.current_balance <> COALESCE(SUM(l.amount), 0);
```

Beklenen sonuc: `0 rows`.

## Build / Push Komutlari

Ornek:

```bash
export REGISTRY=registry.example.com/mystic
export TAG=feature-token-$(date +%Y%m%d-%H%M)
```

### Java servis image'lari

```bash
mvn -f pom.xml -pl service-registry,auth-service,notification-service,api-gateway -am -DskipTests install
mvn -f pom.xml -pl service-registry -DskipTests com.google.cloud.tools:jib-maven-plugin:3.4.3:build -Dimage=$REGISTRY/service-registry:$TAG
mvn -f pom.xml -pl auth-service -DskipTests com.google.cloud.tools:jib-maven-plugin:3.4.3:build -Dimage=$REGISTRY/auth-service:$TAG
mvn -f pom.xml -pl notification-service -DskipTests com.google.cloud.tools:jib-maven-plugin:3.4.3:build -Dimage=$REGISTRY/notification-service:$TAG
mvn -f pom.xml -pl api-gateway -DskipTests com.google.cloud.tools:jib-maven-plugin:3.4.3:build -Dimage=$REGISTRY/api-gateway:$TAG
```

### Admin web image

```bash
docker build \
  --build-arg BACKEND_URL=http://api-gateway:8080 \
  --build-arg AUTH_SERVICE_URL=http://api-gateway:8080 \
  --build-arg NUMEROLOGY_SERVICE_URL=http://api-gateway:8080/api/numerology \
  -t $REGISTRY/admin-web:$TAG \
  mystic-admin
docker push $REGISTRY/admin-web:$TAG
```

### Mobile web image

Stage:

```bash
docker build \
  --build-arg EXPO_PUBLIC_APP_ENV=stage \
  --build-arg EXPO_PUBLIC_API_BASE_URL_STAGE=https://<stage-app-host> \
  --build-arg EXPO_PUBLIC_API_BASE_URL_PROD=https://<prod-app-host> \
  -t $REGISTRY/mobile-web:$TAG \
  mysticai-mobile
docker push $REGISTRY/mobile-web:$TAG
```

Prod web build'te `EXPO_PUBLIC_APP_ENV=prod` kullan.

## Manifest Hazirlama ve Deploy

1. `k8s/stage/*.yaml` altindaki tum `__REPLACE_*` placeholder'larini doldur.
2. Image tag'lerini yeni release ile guncelle.
3. Deploy:

```bash
K8S_CONTEXT=<cluster-context> APP_HOST=<app-host> ADMIN_HOST=<admin-host> ./k8s/stage/deploy.sh
```

4. Gateway + ingress smoke:

```bash
K8S_CONTEXT=<cluster-context> \
APP_ORIGIN=https://<app-host> \
ADMIN_ORIGIN=https://<admin-host> \
./k8s/stage/smoke-test.sh
```

## Post-Deploy Smoke Test

### 1. Signup bonus

- Yeni kullanici olustur.
- Admin `Monetization > Wallets` ekranindan userId ile ara.
- Beklenen:
  - wallet balance `10`
  - ledger'da `WELCOME_BONUS` veya `SIGNUP_BONUS` reason'li tek kayit
  - auth log: `Signup bonus sync granted`

### 2. 1 token ile feature acma

- Bakiye 10 iken feature'a tikla.
- Beklenen:
  - access granted
  - ledger'da `GURU_SPENT`
  - `moduleKey` / `actionKey` dogru dolu
  - bakiye `9`

### 3. Insufficient balance + rewarded fallback

- Test kullanicisinin bakiyesini `0` yap.
- Ayni feature'a tekrar gir.
- Beklenen:
  - unlock sheet icinde rewarded fallback CTA gorunur
  - notification log: `Feature access insufficient balance`

### 4. Reward tamamlanmasi

- Rewarded flow'u tamamla.
- Beklenen:
  - ledger'da `REWARD_EARNED`
  - reward amount `1`
  - wallet balance artar
  - duplicate callback'te ikinci ledger olusmaz

### 5. Double tap korunumu

- Feature CTA'ya hizli cift tikla.
- Beklenen:
  - tek `GURU_SPENT` kaydi
  - bakiye bir kez azalir
  - log: duplicate consume blocked benzeri satir gorulebilir

### 6. Admin kapatma testi

- Admin > Monetization > Actions altinda ilgili action'i `disabled` yap.
- Mobile'da ekrani refresh et veya uygulamayi cold start ile ac.
- Beklenen:
  - feature gate kapanir
  - access response `allowed=false`

## Operasyonel Gozlem Komutlari

```bash
kubectl --context "$K8S_CONTEXT" -n mystic-stage logs deployment/auth-service --since=15m | rg "Signup bonus sync"
kubectl --context "$K8S_CONTEXT" -n mystic-stage logs deployment/notification-service --since=15m | rg "Feature token consumed|insufficient balance|Signup bonus processed|Duplicate"
kubectl --context "$K8S_CONTEXT" -n mystic-stage port-forward svc/auth-service 18081:8081
curl -s http://127.0.0.1:18081/actuator/metrics/auth.signup_bonus.sync.granted
kubectl --context "$K8S_CONTEXT" -n mystic-stage port-forward svc/notification-service 18088:8088
curl -s http://127.0.0.1:18088/actuator/metrics/notification.monetization.token_consumed
```

## Rollback Plan

### Uygulama rollback

```bash
kubectl --context "$K8S_CONTEXT" -n mystic-stage rollout undo deployment/auth-service
kubectl --context "$K8S_CONTEXT" -n mystic-stage rollout undo deployment/notification-service
kubectl --context "$K8S_CONTEXT" -n mystic-stage rollout undo deployment/api-gateway
kubectl --context "$K8S_CONTEXT" -n mystic-stage rollout undo deployment/admin-web
kubectl --context "$K8S_CONTEXT" -n mystic-stage rollout undo deployment/mobile-web
```

### Admin config rollback

- `Monetization > Settings` ekraninda onceki `PUBLISHED` config'i yeniden publish et.
- Gerekirse action kayitlarini onceki degerlerine admin panelden don.

### DB notu

- Auth `V9` migration'i additive'dir. Rollback icin kolonu geri silmek gerekmiyor.
- Sorun config kaynakliysa once admin publish rollback yap, schema rollback yapma.
