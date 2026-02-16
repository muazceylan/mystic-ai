#!/bin/bash

echo "🔮 Mystic AI Servisleri Başlatılıyor..."

# Kill existing Java processes
echo "🧹 Eski process'ler temizleniyor..."
pkill -f "service-registry" || true
pkill -f "auth-service" || true
pkill -f "ai-orchestrator" || true
pkill -f "tarot-service" || true
pkill -f "astrology-service" || true
pkill -f "numerology-service" || true
pkill -f "dream-service" || true
pkill -f "oracle-service" || true
pkill -f "notification-service" || true
pkill -f "vision-service" || true
pkill -f "api-gateway" || true

sleep 2

# Build
echo "🔨 Maven build başlatılıyor..."
mvn clean install -DskipTests -q

echo "🚀 Servisler başlatılıyor..."

# 1. Eureka
echo "📍 Eureka Service Registry..."
nohup java -jar service-registry/target/service-registry-*.jar > logs/eureka.log 2>&1 &
sleep 15

# 2. Core Services
echo "🔐 Auth Service..."
nohup java -jar auth-service/target/auth-service-*.jar > logs/auth.log 2>&1 &
sleep 5

echo "🤖 AI Orchestrator..."
nohup java -jar ai-orchestrator/target/ai-orchestrator-*.jar > logs/ai.log 2>&1 &
sleep 5

# 3. Business Services
echo "🃏 Tarot Service..."
nohup java -jar tarot-service/target/tarot-service-*.jar > logs/tarot.log 2>&1 &

echo "⭐ Astrology Service..."
nohup java -jar astrology-service/target/astrology-service-*.jar > logs/astrology.log 2>&1 &

echo "🔢 Numerology Service..."
nohup java -jar numerology-service/target/numerology-service-*.jar > logs/numerology.log 2>&1 &

echo "💭 Dream Service..."
nohup java -jar dream-service/target/dream-service-*.jar > logs/dream.log 2>&1 &

echo "🔮 Oracle Service..."
nohup java -jar oracle-service/target/oracle-service-*.jar > logs/oracle.log 2>&1 &

echo "🔔 Notification Service..."
nohup java -jar notification-service/target/notification-service-*.jar > logs/notification.log 2>&1 &

echo "👁️ Vision Service..."
nohup java -jar vision-service/target/vision-service-*.jar > logs/vision.log 2>&1 &

sleep 5

# 4. API Gateway
echo "🌐 API Gateway..."
nohup java -jar api-gateway/target/api-gateway-*.jar > logs/gateway.log 2>&1 &

echo "✅ Tüm servisler başlatıldı!"
echo ""
echo "📊 Monitoring:"
echo "  - Eureka: http://localhost:8761"
echo "  - Swagger: http://localhost:8080/swagger-ui.html"
echo "  - Zipkin: http://localhost:9411"
echo "  - RabbitMQ: http://localhost:15672"
echo ""
echo "📝 Loglar: logs/ dizininde"
