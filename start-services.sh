#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/logs"
ALL_LOG_FILE="$LOG_DIR/all-services.log"

service_icon() {
  local service="$1"
  case "$service" in
    eureka) echo "📍" ;;
    auth) echo "🔐" ;;
    ai-orchestrator) echo "🤖" ;;
    astrology) echo "⭐" ;;
    numerology) echo "🔢" ;;
    dream) echo "💭" ;;
    oracle) echo "🔮" ;;
    notification) echo "🔔" ;;
    vision) echo "👁️" ;;
    spiritual) echo "🕊️" ;;
    gateway) echo "🌐" ;;
    *) echo "🚀" ;;
  esac
}

log() {
  printf '🔹 [start-services] %s\n' "$*"
}

warn() {
  printf '⚠️  [start-services][warn] %s\n' "$*" >&2
}

error() {
  printf '❌ [start-services][error] %s\n' "$*" >&2
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "Missing required command: $cmd"
    exit 1
  fi
}

port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local timeout="$2"
  local service_name="$3"

  for ((i = 1; i <= timeout; i++)); do
    if port_listening "$port"; then
      log "$service_name is listening on :$port"
      return 0
    fi
    sleep 1
  done

  error "$service_name did not open :$port within ${timeout}s"
  return 1
}

wait_for_eureka_registration() {
  local service_name="$1"
  local timeout="$2"

  for ((i = 1; i <= timeout; i++)); do
    local status
    status="$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:8761/eureka/apps/${service_name}" || true)"
    if [[ "$status" == "200" ]]; then
      log "$service_name is registered in Eureka"
      return 0
    fi
    sleep 1
  done

  error "$service_name is not visible in Eureka within ${timeout}s"
  return 1
}

verify_gateway_auth_route() {
  local status
  status="$(curl -sS -o /tmp/mystic-start-auth-check.json -w '%{http_code}' \
    "http://localhost:8080/api/v1/auth/check-email?email=startup-check@mystic.ai" || true)"

  if [[ "$status" == "200" ]]; then
    log "Gateway -> auth-service route is healthy (/api/v1/auth/*)"
    return 0
  fi

  error "Gateway auth route check failed with HTTP $status (expected 200)."
  warn "This usually causes mobile register calls to fail with 503."
  return 1
}

dump_recent_logs() {
  local tag="$1"
  local file="$LOG_DIR/${tag}.log"
  if [[ -f "$file" ]]; then
    warn "Last 80 lines from $file:"
    tail -n 80 "$file" >&2 || true
  fi
}

print_auth_failure_hints() {
  local file="$LOG_DIR/auth.log"
  if [[ ! -f "$file" ]]; then
    return
  fi

  if grep -q "Port 8081 was already in use" "$file"; then
    warn "auth-service failed: port 8081 is busy."
    warn "Run: lsof -ti :8081 | xargs kill -9"
  fi

  if grep -q "account_status" "$file"; then
    warn "auth-service failed due to users.account_status NULL rows."
    warn "Run SQL:"
    warn "docker exec -i mystic-postgres psql -U mystic -d mystic_auth -c \"UPDATE users SET account_status='ACTIVE' WHERE account_status IS NULL;\""
  fi

  if grep -q "Unable to obtain connection from database" "$file"; then
    warn "auth-service cannot connect to PostgreSQL. Ensure make infra is running."
  fi
}

ensure_infra_ports() {
  local missing=()
  for port in 5432 5672 6379; do
    if ! port_listening "$port"; then
      missing+=("$port")
    fi
  done

  if ((${#missing[@]} > 0)); then
    error "Infrastructure ports are not ready: ${missing[*]}"
    error "Run infrastructure first: make infra"
    exit 1
  fi

  log "Infrastructure ports are available (5432, 5672, 6379)"
}

ensure_artifact() {
  local pattern="$1"
  if ! compgen -G "$pattern" >/dev/null; then
    error "Missing build artifact: $pattern"
    error "Build step did not produce required jar files."
    exit 1
  fi
}

load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
    log ".env loaded"
  else
    warn ".env not found; defaults from service configs will be used."
  fi
}

stop_existing_processes() {
  log "Stopping existing Java processes for Mystic services..."
  pkill -f "service-registry" || true
  pkill -f "auth-service" || true
  pkill -f "ai-orchestrator" || true
  pkill -f "astrology-service" || true
  pkill -f "numerology-service" || true
  pkill -f "dream-service" || true
  pkill -f "oracle-service" || true
  pkill -f "notification-service" || true
  pkill -f "vision-service" || true
  pkill -f "spiritual-service" || true
  pkill -f "api-gateway" || true
  sleep 2
}

prepare_logs() {
  mkdir -p "$LOG_DIR"
  : >"$ALL_LOG_FILE"
}

start_service() {
  local service_tag="$1"
  local service_log="$2"
  local command="$3"
  local icon
  icon="$(service_icon "$service_tag")"

  : >"$service_log"
  nohup bash -lc "$command 2>&1 | sed -u \"s/^/[${service_tag}] /\" | tee -a \"$ALL_LOG_FILE\" >> \"$service_log\"" >/dev/null 2>&1 &
  local pid="$!"
  echo "$pid" >"$LOG_DIR/${service_tag}.pid"
  log "$icon Started $service_tag (pid=$pid)"
}

main() {
  require_command mvn
  require_command curl
  require_command lsof
  require_command sed
  require_command tee
  require_command pkill

  log "🔮 Mystic AI services are starting..."
  load_env
  ensure_infra_ports
  stop_existing_processes
  prepare_logs

  log "🔨 Running Maven build (skip tests)..."
  mvn clean install -DskipTests -q

  ensure_artifact "service-registry/target/service-registry-*.jar"
  ensure_artifact "auth-service/target/auth-service-*.jar"
  ensure_artifact "api-gateway/target/api-gateway-*.jar"

  log "📍 Starting Eureka Service Registry..."
  start_service "eureka" "$LOG_DIR/eureka.log" "java -jar service-registry/target/service-registry-*.jar"
  if ! wait_for_port 8761 60 "service-registry"; then
    dump_recent_logs "eureka"
    exit 1
  fi

  log "🔐 Starting auth-service..."
  start_service "auth" "$LOG_DIR/auth.log" "java -jar auth-service/target/auth-service-*.jar"
  if ! wait_for_port 8081 90 "auth-service"; then
    dump_recent_logs "auth"
    print_auth_failure_hints
    exit 1
  fi

  if ! wait_for_eureka_registration "AUTH-SERVICE" 60; then
    dump_recent_logs "auth"
    dump_recent_logs "eureka"
    print_auth_failure_hints
    exit 1
  fi

  log "🚀 Starting remaining services..."
  start_service "ai-orchestrator" "$LOG_DIR/ai.log" "java -jar ai-orchestrator/target/ai-orchestrator-*.jar"
  start_service "astrology" "$LOG_DIR/astrology.log" "java -jar astrology-service/target/astrology-service-*.jar"
  start_service "numerology" "$LOG_DIR/numerology.log" "java -jar numerology-service/target/numerology-service-*.jar"
  start_service "dream" "$LOG_DIR/dream.log" "java -jar dream-service/target/dream-service-*.jar"
  start_service "oracle" "$LOG_DIR/oracle.log" "java -jar oracle-service/target/oracle-service-*.jar"
  start_service "notification" "$LOG_DIR/notification.log" "java -jar notification-service/target/notification-service-*.jar"
  start_service "vision" "$LOG_DIR/vision.log" "java -jar vision-service/target/vision-service-*.jar"
  start_service "spiritual" "$LOG_DIR/spiritual.log" "java -jar spiritual-service/target/spiritual-service-*.jar --spring.profiles.active=local"

  log "🌐 Starting API Gateway..."
  start_service "gateway" "$LOG_DIR/gateway.log" "java -jar api-gateway/target/api-gateway-*.jar --spring.profiles.active=local"
  if ! wait_for_port 8080 90 "api-gateway"; then
    dump_recent_logs "gateway"
    exit 1
  fi

  if ! verify_gateway_auth_route; then
    dump_recent_logs "gateway"
    dump_recent_logs "auth"
    exit 1
  fi

  log "✅ All services started successfully."
  log "Eureka: http://localhost:8761"
  log "Gateway Swagger: http://localhost:8080/swagger-ui.html"
  log "MailHog: http://localhost:8025"
  log "RabbitMQ: http://localhost:15672"
  log "Logs: $LOG_DIR"
  log "Combined log: $ALL_LOG_FILE"
}

main "$@"
