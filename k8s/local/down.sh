#!/usr/bin/env bash
set -euo pipefail

NS="mystic-local"
K8S_CONTEXT="${K8S_CONTEXT:-docker-desktop}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing required command: kubectl" >&2
  exit 1
fi

if kubectl --context "$K8S_CONTEXT" get namespace "$NS" >/dev/null 2>&1; then
  kubectl --context "$K8S_CONTEXT" delete namespace "$NS"
  echo "Deleted namespace $NS"
else
  echo "Namespace $NS does not exist."
fi
