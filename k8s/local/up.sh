#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT_DIR/k8s/local/bootstrap.sh"
"$ROOT_DIR/k8s/local/build-images.sh"
"$ROOT_DIR/k8s/local/deploy.sh"
"$ROOT_DIR/k8s/local/smoke-test.sh"

