# ===========================================
# Mystic AI - Makefile
# ===========================================

.PHONY: help infra infra-down infra-logs build clean flyway-auth-repair flyway-astrology-repair db-create-notification db-ensure-app-databases db-shell-notification

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ===========================================
# Infrastructure
# ===========================================

infra: ## Start core infrastructure (PostgreSQL, RabbitMQ, Redis, MailHog)
	docker compose up -d postgres rabbitmq redis mailhog
	@echo ""
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@bash docker/postgres/ensure-app-databases.sh
	@docker compose ps

infra-all: ## Start all infrastructure including tools
	docker compose --profile tools up -d

infra-monitoring: ## Start infrastructure with monitoring (Prometheus, Grafana)
	docker compose --profile monitoring up -d

infra-down: ## Stop all infrastructure
	docker compose --profile tools --profile monitoring down

infra-logs: ## Show infrastructure logs
	docker compose logs -f

infra-clean: ## Stop infrastructure and remove all volumes
	docker compose --profile tools --profile monitoring down -v
	@echo "All volumes removed"

# ===========================================
# Build
# ===========================================

build: ## Build all services
	mvn clean install -DskipTests

build-test: ## Build all services with tests
	mvn clean install

compile: ## Compile without packaging
	mvn clean compile -DskipTests

# ===========================================
# Run Services (Development)
# ===========================================

run-registry: ## Run Service Registry (Eureka) - Port 8761
	cd service-registry && mvn spring-boot:run

run-gateway: ## Run API Gateway - Port 8080
	cd api-gateway && mvn spring-boot:run

run-auth: ## Run Auth Service - Port 8081
	cd auth-service && mvn spring-boot:run


run-astrology: ## Run Astrology Service - Port 8083
	cd astrology-service && mvn spring-boot:run

run-ai: ## Run AI Orchestrator - Port 8084
	cd ai-orchestrator && mvn spring-boot:run

# ===========================================
# Database Operations
# ===========================================

db-shell-auth: ## Connect to Auth database
	docker exec -it mystic-postgres psql -U mystic -d mystic_auth

db-shell-tarot: ## Connect to Tarot database
	docker exec -it mystic-postgres psql -U mystic -d mystic_tarot

db-shell-astrology: ## Connect to Astrology database
	docker exec -it mystic-postgres psql -U mystic -d mystic_astrology

db-shell-vision: ## Connect to Vision database
	docker exec -it mystic-postgres psql -U mystic -d mystic_vision

db-list: ## List all databases
	docker exec -it mystic-postgres psql -U mystic -c "\l"

db-create-notification: ## Create mystic_notification if missing (notification-service; needs mystic-postgres)
	bash docker/postgres/ensure-mystic-notification-db.sh

db-ensure-app-databases: ## Create any missing app DBs (spiritual, notification, etc.; needs mystic-postgres)
	bash docker/postgres/ensure-app-databases.sh

db-shell-notification: ## Connect to Notification database
	docker exec -it mystic-postgres psql -U mystic -d mystic_notification

flyway-auth-repair: ## Flyway repair for auth DB (checksum mismatch; needs Postgres up)
	cd auth-service && mvn flyway:repair

flyway-astrology-repair: ## Flyway repair for astrology DB (checksum mismatch; needs Postgres up)
	cd astrology-service && mvn flyway:repair

# ===========================================
# Redis Operations
# ===========================================

redis-shell: ## Connect to Redis CLI
	docker exec -it mystic-redis redis-cli -a mystic123

redis-flush: ## Flush all Redis data
	docker exec -it mystic-redis redis-cli -a mystic123 FLUSHALL

# ===========================================
# RabbitMQ Operations
# ===========================================

rabbit-ui: ## Open RabbitMQ Management UI (macOS)
	open http://localhost:15672

rabbit-list-queues: ## List all RabbitMQ queues
	docker exec -it mystic-rabbitmq rabbitmqctl list_queues -p mystic

# ===========================================
# Utilities
# ===========================================

clean: ## Clean all build artifacts
	mvn clean

status: ## Show infrastructure and service status
	@echo "=============================================="
	@echo "         MYSTIC AI - INFRASTRUCTURE          "
	@echo "=============================================="
	@echo ""
	@docker compose ps
	@echo ""
	@echo "=============================================="
	@echo "              SERVICE ENDPOINTS              "
	@echo "=============================================="
	@echo ""
	@echo "Infrastructure:"
	@echo "  PostgreSQL:      localhost:5432"
	@echo "  RabbitMQ AMQP:   localhost:5672"
	@echo "  RabbitMQ UI:     http://localhost:15672"
	@echo "  Redis:           localhost:6379"
	@echo ""
	@echo "Tools (--profile tools):"
	@echo "  pgAdmin:         http://localhost:5050"
	@echo "  Redis Commander: http://localhost:8085"
	@echo ""
	@echo "Monitoring (--profile monitoring):"
	@echo "  Prometheus:      http://localhost:9090"
	@echo "  Grafana:         http://localhost:3000"
	@echo ""
	@echo "=============================================="
	@echo "             APPLICATION SERVICES            "
	@echo "=============================================="
	@echo ""
	@echo "  Service Registry: http://localhost:8761"
	@echo "  API Gateway:      http://localhost:8080"
	@echo "  Auth Service:     http://localhost:8081"
	@echo "  Tarot Service:    http://localhost:8082"
	@echo "  Astrology Service: http://localhost:8083"
	@echo ""
	@echo "=============================================="
	@echo "                 DATABASES                   "
	@echo "=============================================="
	@echo ""
	@echo "  mystic_auth      -> Auth Service"
	@echo "  mystic_tarot     -> Tarot Service"
	@echo "  mystic_astrology -> Astrology Service"
	@echo "  mystic_vision    -> Vision Service"
	@echo ""

test-tarot: ## Test tarot service endpoints
	@echo "Getting all tarot cards..."
	@curl -s http://localhost:8082/api/tarot/cards | head -c 500
	@echo ""
	@echo ""
	@echo "Creating a three-card reading..."
	@curl -s -X POST http://localhost:8082/api/tarot/readings/three-card \
		-H "Content-Type: application/json" \
		-H "X-User-Id: test-user" \
		-d '{"question": "What does my future hold?"}' | jq .
