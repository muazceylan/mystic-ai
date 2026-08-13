#!/usr/bin/env bash
set -euo pipefail

# Prints the LevelPlay server-to-server callback URL to paste into the
# Unity LevelPlay dashboard, using the public URL of a running ngrok tunnel.
#
# Usage:
#   ngrok http 8080          # in another terminal
#   scripts/ops/levelplay-callback-url.sh
#
# The backend endpoint is LevelPlayRewardWebhookController
# (@GetMapping /api/v1/webhooks/levelplay/rewarded), exposed publicly through
# the gateway route "provider-reward-webhooks" (/api/v1/webhooks/**).

NGROK_API="${NGROK_API:-http://127.0.0.1:4040/api/tunnels}"
CALLBACK_PATH="/api/v1/webhooks/levelplay/rewarded"

if ! tunnels=$(curl -sS --max-time 5 "${NGROK_API}" 2>/dev/null); then
  echo "ngrok is not running (no local API at ${NGROK_API})." >&2
  echo "Start it first:  ngrok http 8080" >&2
  exit 1
fi

public_url=$(printf '%s' "${tunnels}" \
  | grep -o '"public_url":"https://[^"]*"' \
  | head -1 \
  | sed 's/"public_url":"//; s/"$//')

if [[ -z "${public_url}" ]]; then
  echo "No https tunnel found. Is ngrok forwarding to port 8080?" >&2
  exit 1
fi

# Macro names are LevelPlay's callback placeholders; the backend requires
# timestamp, eventId, userId, rewards and custom_rewardSessionId. `signature`
# is required unless levelplay.rewarded.allow-unsigned-callbacks is true.
cat <<EOF
Public URL : ${public_url}

Paste into LevelPlay dashboard → Rewarded → Server-to-Server callback:

${public_url}${CALLBACK_PATH}?timestamp=[TIMESTAMP]&eventId=[EVENT_ID]&userId=[USER_ID]&rewards=[REWARDS]&signature=[SIGNATURE]&custom_rewardSessionId=[custom_rewardSessionId]&placementName=[PLACEMENT_NAME]

Then set the dashboard's private key in .env and restart notification-service:

  LEVELPLAY_REWARDED_PRIVATE_KEY=<key from the same dashboard page>

Reachability check (must return 400 MISSING_REQUIRED_PARAMETER, not 404/502):

  curl -i "${public_url}${CALLBACK_PATH}"
EOF
