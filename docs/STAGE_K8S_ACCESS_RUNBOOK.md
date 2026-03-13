# Stage Kubernetes Access Runbook (Phase-2 Prep)

Bu runbook, `k8s/local` fazindan sonra ayni erisim zincirini stage cluster'a tasimak icin hazirlandi.
Amac: domain/TLS/secret farklari disinda davranisi degistirmeden rollout yapmak.

## 1. Kullanilan Manifest Seti

- `k8s/stage/namespace.yaml`
- `k8s/stage/configmap.yaml`
- `k8s/stage/secret.yaml`
- `k8s/stage/service-registry.yaml`
- `k8s/stage/auth-service.yaml`
- `k8s/stage/notification-service.yaml`
- `k8s/stage/api-gateway.yaml`
- `k8s/stage/admin-web.yaml`
- `k8s/stage/mobile-web.yaml`
- `k8s/stage/ingress.yaml`

## 2. Placeholder Degerlerini Doldurma (Zorunlu)

`k8s/stage/*.yaml` icinde `__REPLACE_*__` tokenlari bulunur.
Deploy oncesi tum tokenlar doldurulmalidir:

- domain/TLS: `__REPLACE_APP_HOST__`, `__REPLACE_ADMIN_HOST__`, `__REPLACE_TLS_SECRET_NAME__`, `__REPLACE_CLUSTER_ISSUER__`
- image tag'leri: `__REPLACE_IMAGE_*__`
- infra host/user bilgileri: `DB/RABBITMQ/REDIS/MAIL` placeholderlari
- secrets: `JWT_SECRET`, `INTERNAL_GATEWAY_KEY`, pepper'lar, sifreler

Kontrol:

```bash
grep -R "__REPLACE_" k8s/stage/*.yaml
```

## 3. Deploy

Varsayilan context: `kubectl current-context`

```bash
K8S_CONTEXT=<stage-context> APP_HOST=<app-host> ADMIN_HOST=<admin-host> ./k8s/stage/deploy.sh
```

Not:
- `deploy.sh`, unresolved placeholder yakalarsa deploy'u bloklar.
- Ingress stage'de TLS redirect aciktir.

## 4. Stage Smoke Test

```bash
K8S_CONTEXT=<stage-context> \
APP_ORIGIN=https://<app-host> \
ADMIN_ORIGIN=https://<admin-host> \
./k8s/stage/smoke-test.sh
```

Kontroller:
- Preflight allow (`APP_ORIGIN`, `ADMIN_ORIGIN`)
- Disallowed origin preflight -> `403`
- `security.gateway.cors_blocked_preflight_attempts` metriği > 0
- App/Admin root erisimi (`200` veya admin redirect `307`)
- Gateway loglarinda allowed origin block olmamasi

## 5. Cleanup

```bash
K8S_CONTEXT=<stage-context> ./k8s/stage/down.sh
```
