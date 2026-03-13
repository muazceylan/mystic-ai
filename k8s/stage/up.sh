#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT_DIR/k8s/stage/deploy.sh"
"$ROOT_DIR/k8s/stage/smoke-test.sh"
