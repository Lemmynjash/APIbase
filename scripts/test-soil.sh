#!/bin/bash
# Smoke test for USDA Soil Data Access integration (UC-386).
# Verifies: health, catalog, schema, upstream live, x402 challenge.

set -e
API="https://apibase.pro"

echo "=== 1. Health ==="
curl -s "$API/health/ready" | grep -q '"status":"ready"' && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo ""
echo "=== 2. soil.properties in catalog ==="
n=$(curl -s "$API/api/v1/tools" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for t in d['data'] if t['id'].startswith('soil.')))")
[ "$n" = "1" ] && echo "  PASS — 1 soil tool" || { echo "  FAIL — got $n"; exit 1; }

echo ""
echo "=== 3. Tool detail ==="
http=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/v1/tools/soil.properties")
[ "$http" = "200" ] && echo "  PASS — tool detail 200" || { echo "  FAIL — got $http"; exit 1; }

echo ""
echo "=== 4. Schema has lat + lon ==="
keys=$(curl -s "$API/api/v1/tools/soil.properties" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(sorted(d.get('input_schema',{}).get('properties',{}).keys())))")
[ "$keys" = "lat,lon" ] && echo "  PASS — schema {lat,lon}" || { echo "  FAIL — got: $keys"; exit 1; }

echo ""
echo "=== 5. Upstream SDA reachable ==="
body=$(curl -s --max-time 10 "https://sdmdataaccess.nrcs.usda.gov/Tabular/SDMTabularService/post.rest" \
  -H 'Content-Type: application/json' \
  -d '{"format":"JSON","query":"SELECT TOP 1 mukey FROM mapunit"}')
echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('Table') and len(d['Table'])>0; print('  PASS — SDA returned', len(d['Table']), 'row')"

echo ""
echo "=== 6. /call returns 402 challenge ==="
TOK=$(curl -s -X POST "$API/oauth/register" -H 'Content-Type: application/json' \
      -d '{"client_name":"soil-smoke"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('client_secret',''))")
[ -z "$TOK" ] && { echo "  FAIL — couldn't register"; exit 1; }
http=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/v1/tools/soil.properties/call" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" \
  -d '{"lat":42.0,"lon":-93.5}')
case "$http" in
  402) echo "  PASS — auth'd no-payment → 402";;
  *) echo "  FAIL — got $http"; exit 1;;
esac

echo ""
echo "=== All smoke tests passed ==="
