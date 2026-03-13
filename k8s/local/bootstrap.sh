#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NS="mystic-local"
INGRESS_NS="ingress-nginx"
K8S_CONTEXT="${K8S_CONTEXT:-docker-desktop}"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require kubectl
require helm

if ! kubectl --context "$K8S_CONTEXT" get nodes >/dev/null 2>&1; then
  echo "Kubernetes cluster is not reachable. Open Docker Desktop and enable Kubernetes first." >&2
  exit 1
fi

echo "Adding/updating ingress-nginx Helm repo..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo update >/dev/null

echo "Installing/upgrading ingress-nginx controller..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --kube-context "$K8S_CONTEXT" \
  --namespace "$INGRESS_NS" \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.publishService.enabled=true >/dev/null

echo "Waiting for ingress-nginx controller rollout..."
kubectl --context "$K8S_CONTEXT" -n "$INGRESS_NS" rollout status deployment/ingress-nginx-controller --timeout=300s

echo "Ensuring namespace exists: $NS"
kubectl --context "$K8S_CONTEXT" apply -f "$ROOT_DIR/k8s/local/namespace.yaml" >/dev/null

echo "Bootstrap complete."
echo "Kubernetes context: $K8S_CONTEXT"
echo "Expected hosts: http://app.localhost and http://admin.localhost"
