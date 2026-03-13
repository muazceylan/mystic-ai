#!/usr/bin/env bash
set -euo pipefail

NS="mystic-local"
K8S_CONTEXT="${K8S_CONTEXT:-docker-desktop}"
INGRESS_FORWARD_PORT="${INGRESS_FORWARD_PORT:-18080}"
GATEWAY_METRICS_FORWARD_PORT="${GATEWAY_METRICS_FORWARD_PORT:-18088}"
INGRESS_FORWARD_PID=""
INGRESS_FORWARD_LOG=""
METRICS_FORWARD_PID=""
METRICS_FORWARD_LOG=""

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require curl
require kubectl
require awk

if ! kubectl --context "$K8S_CONTEXT" get namespace "$NS" >/dev/null 2>&1; then
  echo "Namespace $NS is not reachable on context $K8S_CONTEXT." >&2
  exit 1
fi

fail() {
  echo "FAIL [$1]: $2" >&2
  exit 1
}

cleanup() {
  if [[ -n "$INGRESS_FORWARD_PID" ]]; then
    kill "$INGRESS_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$INGRESS_FORWARD_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$METRICS_FORWARD_PID" ]]; then
    kill "$METRICS_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$METRICS_FORWARD_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$INGRESS_FORWARD_LOG" ]]; then
    rm -f "$INGRESS_FORWARD_LOG"
  fi
  if [[ -n "$METRICS_FORWARD_LOG" ]]; then
    rm -f "$METRICS_FORWARD_LOG"
  fi
}

start_ingress_port_forward() {
  INGRESS_FORWARD_LOG="$(mktemp)"
  kubectl --context "$K8S_CONTEXT" -n ingress-nginx port-forward svc/ingress-nginx-controller "${INGRESS_FORWARD_PORT}:80" >"$INGRESS_FORWARD_LOG" 2>&1 &
  INGRESS_FORWARD_PID=$!

  local status="000"
  for _ in $(seq 1 40); do
    if ! kill -0 "$INGRESS_FORWARD_PID" >/dev/null 2>&1; then
      fail "ingress-port-forward" "process exited unexpectedly."
    fi

    status="$(curl -s --max-time 1 -o /dev/null -w '%{http_code}' \
      -H "Host: app.localhost" \
      "http://127.0.0.1:${INGRESS_FORWARD_PORT}/" || true)"
    if [[ "$status" != "000" ]]; then
      return
    fi
    sleep 0.25
  done

  fail "ingress-port-forward" "timed out waiting for readiness."
}

start_metrics_port_forward() {
  METRICS_FORWARD_LOG="$(mktemp)"
  kubectl --context "$K8S_CONTEXT" -n "$NS" port-forward svc/api-gateway "${GATEWAY_METRICS_FORWARD_PORT}:8080" >"$METRICS_FORWARD_LOG" 2>&1 &
  METRICS_FORWARD_PID=$!

  local status="000"
  for _ in $(seq 1 40); do
    if ! kill -0 "$METRICS_FORWARD_PID" >/dev/null 2>&1; then
      fail "metrics-port-forward" "process exited unexpectedly."
    fi

    status="$(curl -s --max-time 1 -o /dev/null -w '%{http_code}' \
      "http://127.0.0.1:${GATEWAY_METRICS_FORWARD_PORT}/actuator/health" || true)"
    if [[ "$status" == "200" ]]; then
      return
    fi
    sleep 0.25
  done

  fail "metrics-port-forward" "timed out waiting for gateway actuator endpoint."
}

trap cleanup EXIT
start_ingress_port_forward
start_metrics_port_forward
INGRESS_BASE_URL="http://127.0.0.1:${INGRESS_FORWARD_PORT}"
GATEWAY_METRICS_URL="http://127.0.0.1:${GATEWAY_METRICS_FORWARD_PORT}"

assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$expected" != "$actual" ]]; then
    fail "$label" "expected status $expected, got $actual"
  fi
  echo "PASS [$label]: status=$actual"
}

assert_status_one_of() {
  local label="$1"
  local actual="$2"
  shift 2
  for expected in "$@"; do
    if [[ "$actual" == "$expected" ]]; then
      echo "PASS [$label]: status=$actual"
      return
    fi
  done

  fail "$label" "expected one of [$*], got $actual"
}

assert_header_contains() {
  local label="$1"
  local file="$2"
  local expected="$3"
  if ! grep -qi "$expected" "$file"; then
    fail "$label" "missing header containing '$expected'"
  fi
  echo "PASS [$label]: header contains '$expected'"
}

preflight() {
  local label="$1"
  local url="$2"
  local host_header="$3"
  local origin="$4"
  local expected_status="$5"
  local expected_origin_header="${6:-}"
  local header_file
  header_file="$(mktemp)"
  local status

  status="$(curl -sS -o /dev/null -D "$header_file" -w '%{http_code}' \
    -X OPTIONS "$url" \
    -H "Host: $host_header" \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type")"

  assert_status "$label" "$expected_status" "$status"
  if [[ "$expected_status" == "200" && -n "$expected_origin_header" ]]; then
    assert_header_contains "$label" "$header_file" "Access-Control-Allow-Origin: $expected_origin_header"
  fi

  rm -f "$header_file"
}

assert_cors_blocked_metric_positive() {
  local metric_json
  metric_json="$(curl -fsS "$GATEWAY_METRICS_URL/actuator/metrics/security.gateway.cors_blocked_preflight_attempts" || true)"
  if [[ -z "$metric_json" ]]; then
    fail "gateway-metric" "cannot read security.gateway.cors_blocked_preflight_attempts. Ensure MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE contains metrics."
  fi

  local metric_value
  metric_value="$(printf '%s' "$metric_json" | grep -o '"value":[0-9.]*' | head -n 1 | cut -d: -f2 || true)"
  if [[ -z "$metric_value" ]]; then
    fail "gateway-metric" "metric value parse failed."
  fi

  if ! awk "BEGIN { exit !($metric_value > 0) }"; then
    fail "gateway-metric" "expected metric > 0 after disallowed preflight, got $metric_value"
  fi

  echo "PASS [gateway-metric]: security.gateway.cors_blocked_preflight_attempts=$metric_value"
}

echo "Running same-origin preflight checks..."
preflight "app-origin-login" "$INGRESS_BASE_URL/api/v1/auth/login" "app.localhost" "http://app.localhost" "200"
preflight "admin-origin-login" "$INGRESS_BASE_URL/api/v1/auth/login" "app.localhost" "http://admin.localhost" "200" "http://admin.localhost"

echo "Running negative preflight check (disallowed origin)..."
preflight "disallowed-origin" "$INGRESS_BASE_URL/api/v1/auth/login" "app.localhost" "http://evil.localhost" "403"

echo "Checking gateway security metric..."
assert_cors_blocked_metric_positive

echo "Checking app/admin HTTP reachability..."
app_status="$(curl -sS -o /dev/null -w '%{http_code}' -H "Host: app.localhost" "$INGRESS_BASE_URL/")"
admin_status="$(curl -sS -o /dev/null -w '%{http_code}' -H "Host: admin.localhost" "$INGRESS_BASE_URL/")"
assert_status "app-home" "200" "$app_status"
assert_status_one_of "admin-home" "$admin_status" "200" "307"

echo "Checking gateway logs for blocked allowed origins..."
if kubectl --context "$K8S_CONTEXT" -n "$NS" logs deployment/api-gateway --since=10m 2>/dev/null | grep -q "Blocked CORS preflight request from disallowed origin:.*app.localhost\\|Blocked CORS preflight request from disallowed origin:.*admin.localhost"; then
  fail "gateway-logs" "allowed origins were blocked."
fi
echo "PASS [gateway-logs]: no blocked preflight logs for allowed origins."

echo "Smoke test complete."
