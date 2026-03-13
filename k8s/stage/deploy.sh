#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NS="mystic-stage"
K8S_CONTEXT="${K8S_CONTEXT:-}"
APP_HOST="${APP_HOST:-__REPLACE_APP_HOST__}"
ADMIN_HOST="${ADMIN_HOST:-__REPLACE_ADMIN_HOST__}"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require kubectl

if [[ -z "${K8S_CONTEXT}" ]]; then
  K8S_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
fi

if [[ -z "${K8S_CONTEXT}" ]]; then
  echo "K8S_CONTEXT is empty and current kubectl context cannot be resolved." >&2
  exit 1
fi

if grep -R "__REPLACE_" "$ROOT_DIR"/k8s/stage/*.yaml >/dev/null; then
  echo "Stage manifests still include __REPLACE_* placeholders. Fill them before deploy." >&2
  exit 1
fi

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
apply_file "$ROOT_DIR/k8s/stage/namespace.yaml"
apply_file "$ROOT_DIR/k8s/stage/configmap.yaml"
apply_file "$ROOT_DIR/k8s/stage/secret.yaml"

echo "Deploying service-registry..."
apply_file "$ROOT_DIR/k8s/stage/service-registry.yaml"
wait_deploy "service-registry"

echo "Deploying auth-service..."
apply_file "$ROOT_DIR/k8s/stage/auth-service.yaml"
wait_deploy "auth-service"

echo "Deploying notification-service..."
apply_file "$ROOT_DIR/k8s/stage/notification-service.yaml"
wait_deploy "notification-service"

echo "Deploying api-gateway..."
apply_file "$ROOT_DIR/k8s/stage/api-gateway.yaml"
wait_deploy "api-gateway"

echo "Applying ingress..."
apply_file "$ROOT_DIR/k8s/stage/ingress.yaml"

echo "Deploying admin-web and mobile-web..."
apply_file "$ROOT_DIR/k8s/stage/admin-web.yaml"
apply_file "$ROOT_DIR/k8s/stage/mobile-web.yaml"
wait_deploy "admin-web"
wait_deploy "mobile-web"

echo
echo "Deployment complete."
echo "Kubernetes context: $K8S_CONTEXT"
echo "App URL   : https://$APP_HOST"
echo "Admin URL : https://$ADMIN_HOST"
echo
echo "Quick checks:"
echo "  kubectl --context $K8S_CONTEXT -n $NS get pods"
echo "  kubectl --context $K8S_CONTEXT -n $NS get ingress"
