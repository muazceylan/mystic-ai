#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require mvn
require docker

detect_platform() {
  local raw
  raw="$(docker info --format '{{.OSType}}/{{.Architecture}}')"
  case "$raw" in
    linux/aarch64) echo "linux/arm64" ;;
    linux/x86_64) echo "linux/amd64" ;;
    *) echo "$raw" ;;
  esac
}

JIB_PLATFORM="${JIB_PLATFORM:-$(detect_platform)}"
JAVA_MODULES="service-registry,auth-service,notification-service,api-gateway"

echo "Pre-building Java modules and required dependencies..."
mvn -f "$ROOT_DIR/pom.xml" \
  -pl "$JAVA_MODULES" \
  -am \
  -DskipTests \
  install

build_java_image() {
  local module="$1"
  local image="$2"
  echo "Building $image from module $module (Jib -> local Docker daemon, platform=$JIB_PLATFORM)..."
  mvn -f "$ROOT_DIR/pom.xml" \
    -pl "$module" \
    -DskipTests \
    -Djib.from.platforms="$JIB_PLATFORM" \
    com.google.cloud.tools:jib-maven-plugin:3.4.3:dockerBuild \
    -Dimage="$image"
}

build_java_image "service-registry" "mystic/service-registry:local"
build_java_image "auth-service" "mystic/auth-service:local"
build_java_image "notification-service" "mystic/notification-service:local"
build_java_image "api-gateway" "mystic/api-gateway:local"

echo "Building admin-web image..."
docker build \
  --build-arg BACKEND_URL=http://api-gateway:8080 \
  --build-arg AUTH_SERVICE_URL=http://api-gateway:8080 \
  --build-arg NUMEROLOGY_SERVICE_URL=http://api-gateway:8080/api/numerology \
  -t mystic/admin-web:local \
  "$ROOT_DIR/mystic-admin"

echo "Building mobile-web image..."
docker build \
  --build-arg EXPO_PUBLIC_APP_ENV=stage \
  --build-arg EXPO_PUBLIC_API_BASE_URL_STAGE=http://app.localhost \
  --build-arg EXPO_PUBLIC_API_BASE_URL_PROD=http://app.localhost \
  -t mystic/mobile-web:local \
  "$ROOT_DIR/mysticai-mobile"

echo "All local images are ready."
