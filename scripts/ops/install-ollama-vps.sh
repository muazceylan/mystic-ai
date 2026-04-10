#!/usr/bin/env bash
set -euo pipefail

MODEL="${1:-gemma3:4b}"
OLLAMA_HOST_VALUE="${OLLAMA_HOST_VALUE:-127.0.0.1:11434}"
INSTALL_SCRIPT_URL="${INSTALL_SCRIPT_URL:-https://ollama.com/install.sh}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "This script must run as root (use sudo)." >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

install_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    echo "ollama already installed"
    return
  fi

  require_command curl
  curl -fsSL "${INSTALL_SCRIPT_URL}" | sh
}

configure_local_bind() {
  mkdir -p /etc/systemd/system/ollama.service.d
  cat >/etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=${OLLAMA_HOST_VALUE}"
EOF
}

start_service() {
  systemctl daemon-reload
  systemctl enable --now ollama
  systemctl restart ollama
}

pull_model() {
  ollama pull "${MODEL}"
}

verify_service() {
  require_command curl
  curl -fsS "http://${OLLAMA_HOST_VALUE}/api/tags" >/dev/null
  curl -fsS "http://${OLLAMA_HOST_VALUE}/api/generate" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"${MODEL}\",\"prompt\":\"ping\",\"stream\":false}" >/dev/null
}

main() {
  require_root
  install_ollama
  configure_local_bind
  start_service
  pull_model
  verify_service
  echo "Ollama is ready on http://${OLLAMA_HOST_VALUE} with model ${MODEL}"
}

main "$@"
