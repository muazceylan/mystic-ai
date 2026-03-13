#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NS="mystic-local"
K8S_CONTEXT="${K8S_CONTEXT:-docker-desktop}"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require kubectl

if ! kubectl --context "$K8S_CONTEXT" get nodes >/dev/null 2>&1; then
  echo "Kubernetes cluster is not reachable." >&2
  exit 1
fi

apply_file() {
  kubectl --context "$K8S_CONTEXT" apply -f "$1"
}

wait_deploy() {
  local name="$1"
  echo "Waiting for deployment/$name..."
  kubectl --context "$K8S_CONTEXT" -n "$NS" rollout status "deployment/$name" --timeout=420s
}

echo "Applying namespace/config/secret..."
apply_file "$ROOT_DIR/k8s/local/namespace.yaml"
apply_file "$ROOT_DIR/k8s/local/configmap.yaml"
apply_file "$ROOT_DIR/k8s/local/secret.yaml"

echo "Deploying service-registry..."
apply_file "$ROOT_DIR/k8s/local/service-registry.yaml"
wait_deploy "service-registry"

echo "Deploying auth-service..."
apply_file "$ROOT_DIR/k8s/local/auth-service.yaml"
wait_deploy "auth-service"

echo "Deploying notification-service..."
apply_file "$ROOT_DIR/k8s/local/notification-service.yaml"
wait_deploy "notification-service"

echo "Deploying api-gateway..."
apply_file "$ROOT_DIR/k8s/local/api-gateway.yaml"
wait_deploy "api-gateway"

echo "Applying ingress..."
apply_file "$ROOT_DIR/k8s/local/ingress.yaml"

echo "Deploying admin-web and mobile-web..."
apply_file "$ROOT_DIR/k8s/local/admin-web.yaml"
apply_file "$ROOT_DIR/k8s/local/mobile-web.yaml"
wait_deploy "admin-web"
wait_deploy "mobile-web"

echo
echo "Deployment complete."
echo "Kubernetes context: $K8S_CONTEXT"
echo "App URL   : http://app.localhost"
echo "Admin URL : http://admin.localhost"
echo
echo "Quick checks:"
echo "  kubectl --context $K8S_CONTEXT -n $NS get pods"
echo "  kubectl --context $K8S_CONTEXT -n $NS get ingress"
