#!/usr/bin/env bash
# ============================================================================
# Polymarket Phase 2 Trading Tools — Integration Test
# ============================================================================
# Verifies all 11 Polymarket tools (6 read-only + 5 trading) are registered,
# correctly priced, and accessible via MCP SSE transport.
#
# Usage:
#   API_URL=http://127.0.0.1:8880 bash scripts/test-polymarket-phase2.sh
# ============================================================================

API_URL="${API_URL:-http://127.0.0.1:8880}"
TEST_KEY="${TEST_API_KEY:-ak_live_test_0000000000000000000000000000}"

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); echo "PASS"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); echo "FAIL: $1"; }

echo "=== Polymarket Phase 2 Integration Test ==="
echo "Target: $API_URL"
echo ""

# 1. Health
echo -n "1/8 Health... "
health=$(curl -s "$API_URL/health/ready")
echo "$health" | grep -q "ready" && pass || fail "$health"

# 2. Polymarket tool count (expect >= 11)
echo -n "2/8 Polymarket tools in catalog... "
pm_count=$(curl -s "$API_URL/api/v1/tools" | python3 -c "
import sys, json
data = json.load(sys.stdin)
pm = [t for t in data.get('data', []) if t.get('id','').startswith('polymarket.')]
print(len(pm))
" 2>/dev/null)
if [ "$pm_count" -ge 11 ] 2>/dev/null; then
  pass
  echo "       ($pm_count Polymarket tools)"
else
  fail "expected >= 11, got $pm_count"
fi

# 3. All 5 Phase 2 tools present
echo -n "3/8 Phase 2 tools present... "
result=$(curl -s "$API_URL/api/v1/tools" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ids = {t['id'] for t in data.get('data', [])}
phase2 = ['polymarket.place_order','polymarket.cancel_order','polymarket.open_orders','polymarket.trade_history','polymarket.balance']
missing = [p for p in phase2 if p not in ids]
print('OK' if not missing else 'MISSING:'+','.join(missing))
" 2>/dev/null)
[ "$result" = "OK" ] && pass || fail "$result"

# 4. Pricing correct
echo -n "4/8 Phase 2 pricing... "
result=$(curl -s "$API_URL/api/v1/tools" | python3 -c "
import sys, json
data = json.load(sys.stdin)
tools = {t['id']: t for t in data.get('data', [])}
errs = []
for tid in ['polymarket.place_order','polymarket.cancel_order']:
    p = tools.get(tid,{}).get('pricing',{}).get('price_usd',-1)
    if abs(p - 0.001) > 0.0001: errs.append(f'{tid}={p}')
for tid in ['polymarket.open_orders','polymarket.trade_history','polymarket.balance']:
    p = tools.get(tid,{}).get('pricing',{}).get('price_usd',-1)
    if abs(p - 0.0005) > 0.0001: errs.append(f'{tid}={p}')
print('OK' if not errs else 'WRONG:'+','.join(errs))
" 2>/dev/null)
[ "$result" = "OK" ] && pass || fail "$result"

# 5. Tool detail endpoints return 200
echo -n "5/8 Tool detail endpoints... "
all_ok=true
for tool in polymarket.place_order polymarket.cancel_order polymarket.open_orders polymarket.trade_history polymarket.balance; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/tools/$tool")
  if [ "$code" != "200" ]; then
    echo ""
    echo "       $tool -> $code"
    all_ok=false
  fi
done
$all_ok && pass || fail "some endpoints not 200"

# 6. MCP SSE session opens
echo -n "6/8 MCP SSE session... "
sse_data=$(timeout 3 curl -s -N \
  -H "Authorization: Bearer $TEST_KEY" \
  -H "Accept: text/event-stream" \
  "$API_URL/mcp" 2>/dev/null || true)
if echo "$sse_data" | grep -q "endpoint"; then
  pass
  session_id=$(echo "$sse_data" | grep "sessionId=" | grep -oP 'sessionId=[^ "]+' | head -1 | cut -d= -f2)
  echo "       (session: ${session_id:-unknown})"
else
  fail "no endpoint event in SSE"
fi

# 7. MCP auth rejection without key
echo -n "7/8 MCP no-auth rejection... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/mcp")
[ "$code" = "401" ] && pass || fail "expected 401, got $code"

# 8. YAML config has cache_ttl=0 for trading tools
echo -n "8/8 Trading tools cache_ttl=0 in config... "
result=$(python3 -c "
import yaml, sys
with open('config/tool_provider_config.yaml') as f:
    data = yaml.safe_load(f)
tools = {t['tool_id']: t for t in data.get('tools', [])}
errs = []
for tid in ['polymarket.place_order','polymarket.cancel_order','polymarket.open_orders']:
    ttl = tools.get(tid,{}).get('cache_ttl', -1)
    if ttl != 0: errs.append(f'{tid}={ttl}')
print('OK' if not errs else 'WRONG:'+','.join(errs))
" 2>/dev/null)
[ "$result" = "OK" ] && pass || fail "$result"

# Summary
echo ""
echo "=== Results ==="
echo "Passed: $PASS/$TOTAL"
[ "$FAIL" -gt 0 ] && echo "Failed: $FAIL/$TOTAL"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "=== All Polymarket Phase 2 tests passed ==="
  exit 0
else
  echo "=== SOME TESTS FAILED ==="
  exit 1
fi
