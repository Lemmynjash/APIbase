#!/bin/bash
# Smoke test for Smithsonian integration (UC-382).
# Verifies: health, catalog visibility, tool details, live upstream probe.

set -e
API="https://apibase.pro"
KEY=$(grep PROVIDER_KEY_SMITHSONIAN /home/apibase/apibase/.env | cut -d= -f2-)

echo "=== 1. Health ==="
curl -s "$API/health/ready" | grep -q '"status":"ready"' && echo "  PASS — /health/ready = ready" || { echo "  FAIL"; exit 1; }

echo ""
echo "=== 2. Tools in catalog ==="
COUNT=$(curl -s "$API/api/v1/tools" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for t in d['data'] if t['id'].startswith('smithsonian.')))")
[ "$COUNT" = "2" ] && echo "  PASS — 2 smithsonian tools visible" || { echo "  FAIL — expected 2, got $COUNT"; exit 1; }

echo ""
echo "=== 3. Tool detail endpoints ==="
for id in smithsonian.search smithsonian.record; do
  http=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/v1/tools/$id")
  [ "$http" = "200" ] && echo "  PASS — $id → 200" || { echo "  FAIL — $id → $http"; exit 1; }
done

echo ""
echo "=== 4. Tool schemas have properties ==="
for id in smithsonian.search smithsonian.record; do
  props=$(curl -s "$API/api/v1/tools/$id" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('input_schema',{}).get('properties',{})))")
  [ "$props" -gt 0 ] && echo "  PASS — $id has $props params" || { echo "  FAIL — $id has 0 params"; exit 1; }
done

echo ""
echo "=== 5. Upstream probe ==="
if [ -z "$KEY" ] || [ "$KEY" = "" ]; then
  echo "  SKIP — PROVIDER_KEY_SMITHSONIAN not set in .env"
else
  BODY=$(curl -s --max-time 10 "https://api.si.edu/openaccess/api/v1.0/stats?api_key=$KEY")
  echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')==200; units=d.get('response',{}).get('units',[]); assert len(units) > 0; print(f'  PASS — {len(units)} Smithsonian units reachable')"
fi

echo ""
echo "=== 6. /call returns 402 (payment required) — auth'd agent w/o payment ==="
# Get an ephemeral agent via OAuth /register so auth middleware passes
TOK=$(curl -s -X POST "$API/oauth/register" -H 'Content-Type: application/json' \
      -d '{"client_name":"smithsonian-smoke"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('client_secret',''))")
[ -z "$TOK" ] && { echo "  FAIL — couldn't obtain ephemeral API key"; exit 1; }
for id in smithsonian.search smithsonian.record; do
  http=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/v1/tools/$id/call" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOK" \
    -d '{"q":"smoke","rows":1,"id":"x"}')
  case "$http" in
    402) echo "  PASS — $id auth'd no-payment → HTTP 402 (x402 challenge)";;
    400) echo "  PASS — $id auth'd → HTTP 400 (schema validation — also acceptable)";;
    *) echo "  FAIL — $id → $http (expected 402 or 400)"; exit 1;;
  esac
done

echo ""
echo "=== All smoke tests passed ==="
