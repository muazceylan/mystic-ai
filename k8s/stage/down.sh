#!/usr/bin/env bash
set -euo pipefail

NS="mystic-stage"
K8S_CONTEXT="${K8S_CONTEXT:-}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing required command: kubectl" >&2
  exit 1
fi

if [[ -z "${K8S_CONTEXT}" ]]; then
  K8S_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
fi

if [[ -z "${K8S_CONTEXT}" ]]; then
  echo "K8S_CONTEXT is empty and current kubectl context cannot be resolved." >&2
  exit 1
fi

if kubectl --context "$K8S_CONTEXT" get namespace "$NS" >/dev/null 2>&1; then
  kubectl --context "$K8S_CONTEXT" delete namespace "$NS"
  echo "Deleted namespace $NS"
else
  echo "Namespace $NS does not exist."
fi
