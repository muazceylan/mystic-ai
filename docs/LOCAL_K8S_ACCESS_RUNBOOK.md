# Local Kubernetes Access Runbook (Phase-1)

Bu runbook, sunucuya cikmadan once localde ayni erisim zincirini kurmak icin hazirlandi:

- `service-registry`
- `auth-service`
- `notification-service`
- `api-gateway`
- `admin-web`
- `mobile-web (Expo web export)`

## 1. Prerequisites

- Docker Desktop (Kubernetes enabled)
- `kubectl`
- `helm`
- `mvn`
- `docker`

Infrastructure host'ta ayri calisir:

```bash
make infra
```

> Not: Pod'lar DB/Redis/RabbitMQ icin `host.docker.internal` kullanir.
>
> Scriptler varsayilan olarak `docker-desktop` context'ini kullanir.
> Farkli context icin: `K8S_CONTEXT=<context> ./k8s/local/<script>.sh`

## 2. Build + Deploy

```bash
# ingress + namespace bootstrap
./k8s/local/bootstrap.sh

# local images
./k8s/local/build-images.sh

# deploy resources in controlled order
./k8s/local/deploy.sh
```

Tek komut:

```bash
./k8s/local/up.sh
```

## 3. URLs

- App: `http://app.localhost`
- Admin: `http://admin.localhost`

## 4. Smoke tests

```bash
./k8s/local/smoke-test.sh
```

Testler:

- `OPTIONS /api/v1/auth/login` preflight:
  - `Host: app.localhost` + `Origin: http://app.localhost` -> `200`
  - `Host: app.localhost` + `Origin: http://admin.localhost` -> `200` (+ `Access-Control-Allow-Origin`)
- Disallowed origin preflight -> `403`
- Gateway metric assertion: `security.gateway.cors_blocked_preflight_attempts > 0`
- App homepage -> `200`
- Admin homepage -> `200` veya auth redirect nedeniyle `307`
- Gateway loglarinda allowed origin icin blocked CORS uyarisinin olmamasi

Not: Smoke script, host makinede baska prosesler `localhost:80` kullansa bile deterministic sonuc icin
`kubectl port-forward` ile ingress'e baglanir.

## 5. Rollback/Cleanup

```bash
./k8s/local/down.sh
```

## 6. K8s Resource Listesi

`k8s/local/` altinda:

- `namespace.yaml`
- `configmap.yaml`
- `secret.yaml`
- `service-registry.yaml`
- `auth-service.yaml`
- `notification-service.yaml`
- `api-gateway.yaml`
- `admin-web.yaml`
- `mobile-web.yaml`
- `ingress.yaml`
