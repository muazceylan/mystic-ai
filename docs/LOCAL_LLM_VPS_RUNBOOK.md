# Local LLM VPS Runbook

This runbook installs Ollama on a single Linux VPS, configures `ai-orchestrator` to reach it over localhost, and syncs the runtime `/ai-models` config without disturbing the existing provider order.

## 1. Install Ollama On The VPS

Run as root:

```bash
chmod +x scripts/ops/install-ollama-vps.sh
sudo scripts/ops/install-ollama-vps.sh gemma3:4b
```

What it does:

- installs Ollama if missing
- forces the service to bind on `127.0.0.1:11434`
- enables and starts the `ollama` systemd unit
- pulls `gemma3:4b`
- verifies `/api/tags` and `/api/generate`

## 2. Configure `ai-orchestrator` Environment

Add these values to the systemd env file used by `ai-orchestrator`:

```bash
AI_LOCAL_LLM_ENABLED=true
AI_LOCAL_LLM_PROVIDER_TYPE=ollama
AI_LOCAL_LLM_BASE_URL=http://127.0.0.1:11434
AI_LOCAL_LLM_MODEL=gemma3:4b
AI_LOCAL_LLM_CHAT_ENDPOINT=/api/generate
AI_LOCAL_LLM_TIMEOUT_MS=15000
AI_LOCAL_LLM_RETRY=0
AI_LOCAL_LLM_COOLDOWN=30
AI_LOCAL_LLM_TEMPERATURE=0.7
AI_LOCAL_LLM_MAX_OUTPUT_TOKENS=1024
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ai-orchestrator
sudo systemctl status ai-orchestrator --no-pager
```

## 3. Sync The Runtime Provider Config

The active provider order is controlled by `/ai-models` runtime config, not by YAML priority fields. Sync the local provider into the existing config with:

```bash
chmod +x scripts/ops/sync-local-llm-provider.sh
AI_MODEL_CONFIG_URL=http://127.0.0.1:8084/api/admin/v1/ai-model-config \
scripts/ops/sync-local-llm-provider.sh
```

Notes:

- the script preserves the current provider order
- if `localLlm` is missing, it appends it to the end of both chains
- if `localLlm` already exists, it only refreshes connection and model fields

If the endpoint is protected in your environment, pass the auth header:

```bash
AI_MODEL_CONFIG_AUTH_HEADER="Authorization: Bearer <token>" \
AI_MODEL_CONFIG_URL=http://127.0.0.1:8084/api/admin/v1/ai-model-config \
scripts/ops/sync-local-llm-provider.sh
```

## 4. Verification

Check Ollama:

```bash
curl -fsS http://127.0.0.1:11434/api/tags
```

Check runtime config:

```bash
curl -fsS http://127.0.0.1:8084/api/admin/v1/ai-model-config
```

Check logs:

```bash
journalctl -u ai-orchestrator -n 200 --no-pager
journalctl -u ollama -n 200 --no-pager
```

In `ai-orchestrator` logs, confirm:

- the selected `complex` or `simple` chain matches the admin config
- `localLlm` appears in the expected order
- when Ollama is unavailable, the chain falls through to the next provider or mock fallback
