#!/bin/bash

echo "🔮 Mystic AI Servisleri Başlatılıyor..."

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
  echo "✅ .env dosyası yüklendi"
else
  echo "⚠️  .env dosyası bulunamadı!"
  exit 1
fi

# Kill existing Java processes
echo "🧹 Eski process'ler temizleniyor..."
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

# Log setup
mkdir -p logs
ALL_LOG_FILE="logs/all-services.log"
: > "$ALL_LOG_FILE"

start_service() {
  local service_tag="$1"
  local service_log="$2"
  local command="$3"

  : > "$service_log"
  nohup bash -lc "$command 2>&1 | sed -u \"s/^/[$service_tag] /\" | tee -a \"$ALL_LOG_FILE\" >> \"$service_log\"" >/dev/null 2>&1 &
}

# Build
echo "🔨 Maven build başlatılıyor..."
mvn clean install -DskipTests -q

echo "🚀 Servisler başlatılıyor..."

# 1. Eureka
echo "📍 Eureka Service Registry..."
start_service "eureka" "logs/eureka.log" "java -jar service-registry/target/service-registry-*.jar"
sleep 15

# 2. Core Services
echo "🔐 Auth Service..."
start_service "auth" "logs/auth.log" "java -jar auth-service/target/auth-service-*.jar"
sleep 5

echo "🤖 AI Orchestrator..."
start_service "ai-orchestrator" "logs/ai.log" "java -jar ai-orchestrator/target/ai-orchestrator-*.jar"
sleep 5

echo "⭐ Astrology Service..."
start_service "astrology" "logs/astrology.log" "java -jar astrology-service/target/astrology-service-*.jar"

echo "🔢 Numerology Service..."
start_service "numerology" "logs/numerology.log" "java -jar numerology-service/target/numerology-service-*.jar"

echo "💭 Dream Service..."
start_service "dream" "logs/dream.log" "java -jar dream-service/target/dream-service-*.jar"

echo "🔮 Oracle Service..."
start_service "oracle" "logs/oracle.log" "java -jar oracle-service/target/oracle-service-*.jar"

echo "🔔 Notification Service..."
start_service "notification" "logs/notification.log" "java -jar notification-service/target/notification-service-*.jar"

echo "👁️ Vision Service..."
start_service "vision" "logs/vision.log" "java -jar vision-service/target/vision-service-*.jar"

echo "🕊️ Spiritual Service..."
start_service "spiritual" "logs/spiritual.log" "java -jar spiritual-service/target/spiritual-service-*.jar --spring.profiles.active=local"

sleep 5

# 4. API Gateway
echo "🌐 API Gateway..."
start_service "gateway" "logs/gateway.log" "java -jar api-gateway/target/api-gateway-*.jar --spring.profiles.active=local"

echo "✅ Tüm servisler başlatıldı!"
echo ""
echo "📊 Monitoring:"
echo "  - Eureka: http://localhost:8761"
echo "  - Swagger: http://localhost:8080/swagger-ui.html"
echo "  - Zipkin: http://localhost:9411"
echo "  - RabbitMQ: http://localhost:15672"
echo ""
echo "📝 Loglar: logs/ dizininde"
echo "  - Tüm servisler (tek dosya): logs/all-services.log"
echo "  - Spiritual Service: logs/spiritual.log"
