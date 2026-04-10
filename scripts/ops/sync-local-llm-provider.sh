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
  require_command jq

  local current
  current="$(curl_json GET "${CONFIG_URL}")"

  local updated
  updated="$(
    jq \
      --arg providerKey "${PROVIDER_KEY}" \
      --arg displayName "${DISPLAY_NAME}" \
      --arg model "${MODEL}" \
      --arg baseUrl "${BASE_URL}" \
      --arg chatEndpoint "${CHAT_ENDPOINT}" \
      --argjson timeoutMs "${TIMEOUT_MS}" \
      --argjson temperature "${TEMPERATURE}" \
      --argjson maxOutputTokens "${MAX_OUTPUT_TOKENS}" \
      '
      def local_provider:
        {
          key: $providerKey,
          displayName: $displayName,
          adapter: "ollama",
          enabled: true,
          model: $model,
          baseUrl: $baseUrl,
          apiKey: "",
          localProviderType: "ollama",
          chatEndpoint: $chatEndpoint,
          timeoutMs: $timeoutMs,
          retryCount: 0,
          cooldownSeconds: 30,
          temperature: $temperature,
          maxOutputTokens: $maxOutputTokens,
          headers: {}
        };
      def append_if_missing(chain):
        if (chain | index($providerKey)) == null then chain + [$providerKey] else chain end;
      .providers =
        (
          (.providers // [])
          | if map(.key) | index($providerKey)
            then map(
              if .key == $providerKey
              then . + {
                adapter: "ollama",
                model: $model,
                baseUrl: $baseUrl,
                localProviderType: "ollama",
                chatEndpoint: $chatEndpoint,
                timeoutMs: $timeoutMs,
                temperature: $temperature,
                maxOutputTokens: $maxOutputTokens
              }
              else .
              end
            )
            else . + [local_provider]
            end
        )
      | .complexChain = append_if_missing(.complexChain // [])
      | .simpleChain = append_if_missing(.simpleChain // [])
      ' <<<"${current}"
  )"

  curl_json PUT "${CONFIG_URL}" "${updated}" >/dev/null
  echo "Local LLM provider ${PROVIDER_KEY} synced successfully"
}

main "$@"
