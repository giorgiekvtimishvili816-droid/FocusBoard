#!/usr/bin/env bash
# Blue/green release slots, atomic symlink switch and automatic rollback.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$ROOT/.deployment}"
ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT/dist}"
PORT="${PORT:-4173}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:$PORT}"
HEALTH_LOG="$DEPLOY_DIR/logs/health.log"
RELEASE_LOG="$DEPLOY_DIR/logs/deploy.log"
mkdir -p "$DEPLOY_DIR/logs"

if [[ ! -f "$ARTIFACT_DIR/index.html" ]]; then
  echo "Deployment aborted: missing $ARTIFACT_DIR/index.html" >&2
  exit 1
fi

PREVIOUS="$(readlink "$DEPLOY_DIR/active" 2>/dev/null || true)"
if [[ "$PREVIOUS" == "blue" ]]; then SLOT="green"; else SLOT="blue"; fi
printf '%s | deploying to %s (previous: %s)\n' "$(date -u +%FT%TZ)" "$SLOT" "${PREVIOUS:-none}" | tee -a "$RELEASE_LOG"
rm -rf "$DEPLOY_DIR/$SLOT"
mkdir -p "$DEPLOY_DIR/$SLOT"
cp -R "$ARTIFACT_DIR/." "$DEPLOY_DIR/$SLOT/"

# The server resolves the 'active' symlink on every request. No restart needed.
if ! curl -fsS --max-time 2 "$HEALTH_URL/health" >/dev/null 2>&1; then
  DEPLOY_ROOT="$DEPLOY_DIR/active" PORT="$PORT" nohup node "$ROOT/scripts/server.mjs" \
    >>"$DEPLOY_DIR/logs/server.log" 2>&1 </dev/null &
  echo "$!" > "$DEPLOY_DIR/server.pid"
fi

switch_to() {
  local slot="$1"
  ln -s "$slot" "$DEPLOY_DIR/.active.next"
  mv -Tf "$DEPLOY_DIR/.active.next" "$DEPLOY_DIR/active"
}

rollback() {
  if [[ "$PREVIOUS" == "blue" || "$PREVIOUS" == "green" ]]; then
    switch_to "$PREVIOUS"
    printf '%s | ROLLBACK | restored %s\n' "$(date -u +%FT%TZ)" "$PREVIOUS" | tee -a "$RELEASE_LOG"
  else
    rm -f "$DEPLOY_DIR/active"
    printf '%s | ROLLBACK | no previous release to restore\n' "$(date -u +%FT%TZ)" | tee -a "$RELEASE_LOG"
  fi
}

switch_to "$SLOT"
SUCCESS=0
for _ in 1 2 3 4 5; do
  if HEALTH_URL="$HEALTH_URL" HEALTH_LOG="$HEALTH_LOG" bash "$ROOT/scripts/health-check.sh"; then
    SUCCESS=1
    break
  fi
  sleep 1
done

if [[ "$SUCCESS" != "1" ]]; then
  rollback
  echo 'Deployment failed: health check failed. Previous release restored.' >&2
  exit 1
fi
printf '%s | SUCCESS | active=%s\n' "$(date -u +%FT%TZ)" "$SLOT" | tee -a "$RELEASE_LOG"
echo "Deployment successful: $HEALTH_URL (slot: $SLOT)"
