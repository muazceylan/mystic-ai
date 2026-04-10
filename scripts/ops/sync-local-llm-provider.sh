#!/usr/bin/env bash
set -euo pipefail

CONFIG_URL="${AI_MODEL_CONFIG_URL:-http://127.0.0.1:8084/api/admin/v1/ai-model-config}"
PROVIDER_KEY="${AI_LOCAL_LLM_PROVIDER_KEY:-localLlm}"
DISPLAY_NAME="${AI_LOCAL_LLM_DISPLAY_NAME:-Ollama Local}"
MODEL="${AI_LOCAL_LLM_MODEL:-gemma3:4b}"
BASE_URL="${AI_LOCAL_LLM_BASE_URL:-http://127.0.0.1:11434}"
CHAT_ENDPOINT="${AI_LOCAL_LLM_CHAT_ENDPOINT:-/api/generate}"
TIMEOUT_MS="${AI_LOCAL_LLM_TIMEOUT_MS:-15000}"
TEMPERATURE="${AI_LOCAL_LLM_TEMPERATURE:-0.7}"
MAX_OUTPUT_TOKENS="${AI_LOCAL_LLM_MAX_OUTPUT_TOKENS:-1024}"
AUTH_HEADER="${AI_MODEL_CONFIG_AUTH_HEADER:-}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  if [[ -n "${AUTH_HEADER}" ]]; then
    if [[ -n "${body}" ]]; then
      curl -fsS -X "${method}" "${url}" -H "${AUTH_HEADER}" -H 'Content-Type: application/json' -d "${body}"
    else
      curl -fsS -X "${method}" "${url}" -H "${AUTH_HEADER}"
    fi
    return
  fi

  if [[ -n "${body}" ]]; then
    curl -fsS -X "${method}" "${url}" -H 'Content-Type: application/json' -d "${body}"
  else
    curl -fsS -X "${method}" "${url}"
  fi
}

main() {
  require_command curl
  require_command node

  local current
  current="$(curl_json GET "${CONFIG_URL}")"

  local updated
  updated="$(
    CURRENT_CONFIG="${current}" \
    PROVIDER_KEY="${PROVIDER_KEY}" \
    DISPLAY_NAME="${DISPLAY_NAME}" \
    MODEL="${MODEL}" \
    BASE_URL="${BASE_URL}" \
    CHAT_ENDPOINT="${CHAT_ENDPOINT}" \
    TIMEOUT_MS="${TIMEOUT_MS}" \
    TEMPERATURE="${TEMPERATURE}" \
    MAX_OUTPUT_TOKENS="${MAX_OUTPUT_TOKENS}" \
    node <<'EOF'
const config = JSON.parse(process.env.CURRENT_CONFIG ?? '{}');
const providerKey = process.env.PROVIDER_KEY ?? 'localLlm';
const provider = {
  key: providerKey,
  displayName: process.env.DISPLAY_NAME ?? 'Ollama Local',
  adapter: 'ollama',
  enabled: true,
  model: process.env.MODEL ?? 'gemma3:4b',
  baseUrl: process.env.BASE_URL ?? 'http://127.0.0.1:11434',
  apiKey: '',
  localProviderType: 'ollama',
  chatEndpoint: process.env.CHAT_ENDPOINT ?? '/api/generate',
  timeoutMs: Number(process.env.TIMEOUT_MS ?? '15000'),
  retryCount: 0,
  cooldownSeconds: 30,
  temperature: Number(process.env.TEMPERATURE ?? '0.7'),
  maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS ?? '1024'),
  headers: {}
};

const providers = Array.isArray(config.providers) ? [...config.providers] : [];
const existingIndex = providers.findIndex((item) => item?.key === providerKey);

if (existingIndex >= 0) {
  providers[existingIndex] = {
    ...providers[existingIndex],
    adapter: provider.adapter,
    model: provider.model,
    baseUrl: provider.baseUrl,
    localProviderType: provider.localProviderType,
    chatEndpoint: provider.chatEndpoint,
    timeoutMs: provider.timeoutMs,
    temperature: provider.temperature,
    maxOutputTokens: provider.maxOutputTokens,
  };
} else {
  providers.push(provider);
}

const appendIfMissing = (chain) => {
  const list = Array.isArray(chain) ? [...chain] : [];
  if (!list.includes(providerKey)) {
    list.push(providerKey);
  }
  return list;
};

config.providers = providers;
config.complexChain = appendIfMissing(config.complexChain);
config.simpleChain = appendIfMissing(config.simpleChain);

process.stdout.write(JSON.stringify(config));
EOF
  )"

  curl_json PUT "${CONFIG_URL}" "${updated}" >/dev/null
  echo "Local LLM provider ${PROVIDER_KEY} synced successfully"
}

main "$@"
