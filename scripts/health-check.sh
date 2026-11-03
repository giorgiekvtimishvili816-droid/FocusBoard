#!/usr/bin/env bash
# Checks both the health endpoint and the real page; writes a permanent log line.
set -u
BASE_URL="${HEALTH_URL:-http://127.0.0.1:4173}"
BASE_URL="${BASE_URL%/}"
LOG_FILE="${HEALTH_LOG:-.deployment/logs/health.log}"
mkdir -p "$(dirname "$LOG_FILE")"
TIMESTAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
BODY="$(mktemp)"
PAGE="$(mktemp)"
trap 'rm -f "$BODY" "$PAGE"' EXIT

HTTP_CODE="$(curl -s --max-time 5 -o "$BODY" -w '%{http_code}' "$BASE_URL/health" 2>/dev/null || true)"
PAGE_CODE="$(curl -s --max-time 5 -o "$PAGE" -w '%{http_code}' "$BASE_URL/" 2>/dev/null || true)"

if [[ "${FORCE_HEALTH_FAIL:-0}" != "1" && "$HTTP_CODE" == "200" && "$PAGE_CODE" == "200" ]] &&
  grep -q '"status":"ok"' "$BODY" && grep -q 'FocusBoard' "$PAGE"; then
  printf '%s | UP | health=%s | page=%s | %s\n' "$TIMESTAMP" "$HTTP_CODE" "$PAGE_CODE" "$BASE_URL" | tee -a "$LOG_FILE"
  exit 0
else
  printf '%s | DOWN | health=%s | page=%s | %s\n' "$TIMESTAMP" "$HTTP_CODE" "$PAGE_CODE" "$BASE_URL" | tee -a "$LOG_FILE"
  exit 1
fi
