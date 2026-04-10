#!/usr/bin/env bash
set -euo pipefail

ROOT=/opt/astro/app/mystic-ai
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

is_truthy() {
  case "${1,,}" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

read_timeout() {
  local var_name="$1"
  local default_value="$2"
  local raw_value="${!var_name:-$default_value}"

  if [[ "$raw_value" =~ ^[0-9]+$ ]] && (( raw_value > 0 )); then
    printf '%s\n' "$raw_value"
    return 0
  fi

  echo "$var_name must be a positive integer; using default ${default_value}s." >&2
  printf '%s\n' "$default_value"
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local timeout_seconds="${3:-120}"
  local i

  for ((i = 1; i <= timeout_seconds; i++)); do
    if timeout 1 bash -lc "</dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1; then
      echo "$name listening on :$port"
      return 0
    fi
    sleep 1
  done
  echo "Timeout waiting for $name on :$port" >&2
  return 1
}

find_jar() {
  local pattern="$1"
  local jar
  jar=$(compgen -G "$pattern" | head -n 1 || true)
  if [ -z "${jar:-}" ]; then
    echo "Jar not found: $pattern" >&2
    exit 1
  fi
  printf '%s\n' "$jar"
}

wait_for_optional_service() {
  local port="$1"
  local name="$2"
  local timeout_var="$3"
  local default_timeout="$4"
  local timeout_seconds
  timeout_seconds="$(read_timeout "$timeout_var" "$default_timeout")"

  if wait_for_port "$port" "$name" "$timeout_seconds"; then
    return 0
  fi

  echo "$name is still not listening on :$port after ${timeout_seconds}s. Continuing so auth/gateway can still come up." >&2
  return 1
}

verify_gateway_auth_route() {
  local attempts="${GATEWAY_AUTH_ROUTE_VERIFY_ATTEMPTS:-8}"
  local sleep_seconds="${GATEWAY_AUTH_ROUTE_VERIFY_SLEEP_SECONDS:-2}"
  local status attempt

  if [[ ! "$attempts" =~ ^[0-9]+$ ]] || (( attempts < 1 )); then
    echo "GATEWAY_AUTH_ROUTE_VERIFY_ATTEMPTS must be a positive integer; defaulting to 8." >&2
    attempts=8
  fi

  if [[ ! "$sleep_seconds" =~ ^[0-9]+$ ]] || (( sleep_seconds < 1 )); then
    echo "GATEWAY_AUTH_ROUTE_VERIFY_SLEEP_SECONDS must be a positive integer; defaulting to 2." >&2
    sleep_seconds=2
  fi

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    status="$(curl -sS -o /tmp/mystic-prod-auth-check.json -w '%{http_code}' \
      "http://localhost:8080/api/v1/auth/check-email?email=startup-check@mystic.ai" || true)"

    if [[ "$status" == "200" ]]; then
      echo "Gateway -> auth-service route is healthy (/api/v1/auth/*)"
      return 0
    fi

    if (( attempt < attempts )); then
      echo "Gateway auth route check attempt ${attempt}/${attempts} returned HTTP ${status:-000}; retrying in ${sleep_seconds}s..." >&2
      sleep "$sleep_seconds"
    fi
  done

  echo "Gateway auth route check failed with HTTP ${status:-000} after ${attempts} attempts (expected 200)." >&2
  echo "This usually causes register and quick-start calls to fail with 502/503." >&2
  return 1
}

pids=()

cleanup() {
  echo "Stopping backend stack..."
  if [ "${#pids[@]}" -gt 0 ]; then
    kill "${pids[@]}" 2>/dev/null || true
    wait || true
  fi
}
trap cleanup TERM INT EXIT

start_bg() {
  local name="$1"
  shift
  echo "Starting $name..."
  nohup "$@" > "$LOG_DIR/${name}.log" 2>&1 &
  pids+=($!)
}

start_bg eureka java -jar "$(find_jar "$ROOT/service-registry/target/service-registry-*.jar")"
wait_for_port 8761 eureka

start_bg auth java -jar "$(find_jar "$ROOT/auth-service/target/auth-service-*.jar")"
wait_for_port 8081 auth

start_bg ai-orchestrator java -jar "$(find_jar "$ROOT/ai-orchestrator/target/ai-orchestrator-*.jar")"
wait_for_port 8084 ai-orchestrator || true

start_bg astrology java -jar "$(find_jar "$ROOT/astrology-service/target/astrology-service-*.jar")"
start_bg numerology java -jar "$(find_jar "$ROOT/numerology-service/target/numerology-service-*.jar")"
start_bg dream java -jar "$(find_jar "$ROOT/dream-service/target/dream-service-*.jar")"
start_bg oracle java -jar "$(find_jar "$ROOT/oracle-service/target/oracle-service-*.jar")"
start_bg notification java -jar "$(find_jar "$ROOT/notification-service/target/notification-service-*.jar")"
start_bg vision java -jar "$(find_jar "$ROOT/vision-service/target/vision-service-*.jar")"
start_bg spiritual env SPRING_PROFILES_ACTIVE=local java -jar "$(find_jar "$ROOT/spiritual-service/target/spiritual-service-*.jar")"

wait_optional_before_gateway="${WAIT_FOR_OPTIONAL_SERVICES_BEFORE_GATEWAY:-false}"

if is_truthy "$wait_optional_before_gateway"; then
  echo "Waiting for optional domain services before starting gateway..."
  wait_for_optional_service 8083 astrology ASTROLOGY_STARTUP_TIMEOUT_SECONDS 180 || true
  wait_for_optional_service 8085 numerology NUMEROLOGY_STARTUP_TIMEOUT_SECONDS 120 || true
  wait_for_optional_service 8086 dream DREAM_STARTUP_TIMEOUT_SECONDS 120 || true
  wait_for_optional_service 8087 oracle ORACLE_STARTUP_TIMEOUT_SECONDS 120 || true
  wait_for_optional_service 8088 notification NOTIFICATION_STARTUP_TIMEOUT_SECONDS 120 || true
  wait_for_optional_service 8089 vision VISION_STARTUP_TIMEOUT_SECONDS 120 || true
  wait_for_optional_service 8091 spiritual SPIRITUAL_STARTUP_TIMEOUT_SECONDS 120 || true
else
  echo "Skipping blocking waits for optional domain services; set WAIT_FOR_OPTIONAL_SERVICES_BEFORE_GATEWAY=true for strict startup ordering."
fi

start_bg gateway env SPRING_PROFILES_ACTIVE=local java -jar "$(find_jar "$ROOT/api-gateway/target/api-gateway-*.jar")"
wait_for_port 8080 gateway
verify_gateway_auth_route

echo "Mystic backend stack is up."
wait
