# UC-001: Polymarket

## Meta

| Field | Value |
|-------|-------|
| **ID** | UC-001 |
| **Provider** | Polymarket (polymarket.com) |
| **Category** | Predictions / Analytics / Trading |
| **Date Added** | 2026-03-07 |
| **Phase 2 (Trading)** | 2026-03-09 |
| **Status** | Production (Phase 1 + Phase 2) |
| **Client** | Alpush (Polymarket Developer) |

---

## 1. Client Input Data

Client (Alpush) предоставил APIbase:

```
Тип данных:          Значение:
──────────────────────────────────────────────────────────
Profile              Alpush (Developer, polymarket.com)
Trading Wallet       0xc98dDC93e5d97Be00306a305F53BE802c6EdeAbB
Private Key          Configured in .env (POLYMARKET_PRIVATE_KEY)
Builder API Key      019cd1d3-d2e9-78eb-ba8d-0090d0d6bcd4 (Active)
Builder Secret       Configured in .env (POLYMARKET_BUILDER_SECRET)
Builder Passphrase   Configured in .env (POLYMARKET_BUILDER_PASSPHRASE)
CLOB L2 Credentials  Derived at runtime via createOrDeriveApiKey()
Registration Date    18.02.2026
Phase 2 Enabled      2026-03-09
```

### Sufficiency Assessment

| Data provided | What it enables | Sufficient? |
|---------------|----------------|-------------|
| Builder API Key + Secret + Passphrase | Full Builder attribution with HMAC signing. Revenue share from Polymarket. | **Yes** |
| Trading Wallet + Private Key | L1 EIP-712 signing for L2 credential derivation. Order signing. | **Yes** |
| CLOB L2 Credentials (derived) | Placing/canceling orders, querying portfolio. Derived automatically from private key at startup. | **Yes** (auto-derived) |

**Verdict:** All credentials provided. **Full trading API operational** (Phase 2 complete). Both read-only market data AND order placement/cancellation with Builder revenue attribution.

---

## 2. Provider API Analysis

### API Architecture

Polymarket operates 3 active API services on Polygon blockchain (Chain ID: 137):

| Service | Base URL | Auth | Description |
|---------|----------|------|-------------|
| **Gamma API** | `https://gamma-api.polymarket.com` | No | Market data, events, search |
| **CLOB API** | `https://clob.polymarket.com` | Partial (read=no, trade=L2+Builder) | Order book, prices, trading |
| **Data API** | `https://data-api.polymarket.com` | No | Positions, analytics (leaderboard discontinued 2025+) |

### Key Endpoints

#### Gamma API (Market Data — No Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | GET | List events with filtering and pagination |
| `/events/{id}` | GET | Specific event details |
| `/markets` | GET | List markets with filtering |
| `/markets/{id}` | GET | Single market details |
| `/public-search` | GET | Search across events, markets, profiles |
| `/tags` | GET | Ranked tags and categories |
| `/series` | GET | Grouped events (series) |

#### CLOB API — Public (No Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/book` | GET | Order book for a market |
| `/books` | GET | Order books for multiple markets |
| `/price` | GET | Current price for a token |
| `/prices` | GET | Prices for multiple tokens |
| `/midpoint` | GET | Midpoint price |
| `/midpoints` | GET | Midpoints for multiple tokens |
| `/prices-history` | GET | Historical price data |
| `/tick-size` | GET | Tick size for a market |
| `/spread` | GET | Spread for a market |

#### CLOB API — Authenticated (L2 + Builder required)

| Endpoint | Method | Description | APIbase tool |
|----------|--------|-------------|-------------|
| `/order` | POST | Place a single order (GTC/GTD/FOK) | `polymarket.place_order` |
| `/order` | DELETE | Cancel a single order | `polymarket.cancel_order` |
| `/open-orders` | GET | Retrieve open orders | `polymarket.open_orders` |
| `/trades` | GET | Trade history | `polymarket.trade_history` |
| `/balance-allowance` | GET | Check balance/allowance | `polymarket.balance` |

### Authentication Model

**Three-tier system (all handled by `@polymarket/clob-client` SDK):**

- **L1 (Private Key):** EIP-712 signed messages. For creating/deriving L2 credentials.
  - Headers: `POLY_ADDRESS`, `POLY_SIGNATURE`, `POLY_TIMESTAMP`, `POLY_NONCE`
  - Used once at startup for credential derivation
- **L2 (API Key):** HMAC-SHA256 with derived credentials (apiKey, secret, passphrase).
  - Headers: `POLY_ADDRESS`, `POLY_SIGNATURE`, `POLY_TIMESTAMP`, `POLY_API_KEY`, `POLY_PASSPHRASE`
  - Used for every authenticated request
- **Builder (Revenue Attribution):** HMAC-SHA256 with Builder credentials.
  - Headers: `POLY_BUILDER_API_KEY`, `POLY_BUILDER_TIMESTAMP`, `POLY_BUILDER_PASSPHRASE`, `POLY_BUILDER_SIGNATURE`
  - Appended to trading requests for volume attribution and revenue

Total: 9 headers per trading request, 2 different EIP-712 domains, custom HMAC construction. All handled by the SDK.

### Rate Limits

| Service / Endpoint | Limit |
|---------------------|-------|
| CLOB General | 9,000 req / 10 sec |
| `GET /book` | 1,500 req / 10 sec |
| `GET /price` | 1,500 req / 10 sec |
| `POST /order` | 3,500 req / 10 sec (burst), 36,000 / 10 min (sustained) |
| `DELETE /order` | 3,000 req / 10 sec (burst), 30,000 / 10 min (sustained) |
| Gamma General | 4,000 req / 10 sec |
| `GET /events` | 500 req / 10 sec |
| `GET /markets` | 300 req / 10 sec |
| `GET /public-search` | 350 req / 10 sec |
| Data API General | 1,000 req / 10 sec |

### Official SDKs

- TypeScript: `@polymarket/clob-client` (npm) — **used by APIbase**
- Python: `py-clob-client` (pip)
- Docs: `docs.polymarket.com`

---

## 3. APIbase Wrapper Design

### Level 1: Protocol Adapter

```
What the adapter does:
──────────────────────────────────────────────────────────────
• Unifies 2 Polymarket services → single APIbase endpoint
  apibase.pro/api/v1/polymarket/...

• Request routing:
  Phase 1 (read-only):
    polymarket.search         → gamma-api.polymarket.com/public-search
    polymarket.market_detail  → gamma-api.polymarket.com/markets/{id}
    polymarket.prices         → clob.polymarket.com/midpoint
    polymarket.get_orderbook  → clob.polymarket.com/book
    polymarket.price_history  → clob.polymarket.com/prices-history
    polymarket.trending       → gamma-api.polymarket.com/markets

  Phase 2 (trading via @polymarket/clob-client SDK):
    polymarket.place_order    → ClobClient.createAndPostOrder()
    polymarket.cancel_order   → ClobClient.cancelOrder()
    polymarket.open_orders    → ClobClient.getOpenOrders()
    polymarket.trade_history  → ClobClient.getTrades()
    polymarket.balance        → ClobClient.getBalanceAllowance()

• Caching strategy:
  - Market list / search: 30 sec TTL
  - Prices: 5 sec TTL
  - Order book: 0 sec (no cache)
  - Historical data: 30 sec TTL
  - Trading operations: 0 sec (never cached)
  - Trade history / balance: 5 sec TTL

• Error normalization:
  Polymarket errors → APIbase standard error format
  {"error": "polymarket_rate_limited", "message": "...", "retry_after": 2}
```

### Level 2: Semantic Normalizer

**Domain model: `prediction-market`**

```json
// === Polymarket original (market object) ===
{
  "id": "0x1234...",
  "question": "Will Bitcoin hit $100k in 2026?",
  "outcomes": ["Yes", "No"],
  "outcomePrices": ["0.73", "0.27"],
  "volume": "5432100.50",
  "volume24hr": "234500.00",
  "openInterest": "1200000.00",
  "bestBid": "0.72",
  "bestAsk": "0.74",
  "status": "active",
  "marketType": "binary",
  "tickSize": "0.01",
  "negRisk": false,
  "tokenIds": ["98765...", "43210..."],
  "conditionId": "0xabcd...",
  "endDate": "2026-12-31T23:59:59Z"
}
```

### Level 3: Builder Key Injector

```
For every trading request through APIbase:
──────────────────────────────────────────────────────────────
1. Agent sends trade request to APIbase
2. APIbase uses ClobClient singleton with BuilderConfig
3. SDK automatically injects Builder HMAC headers (4 headers)
4. SDK signs order with L2 credentials (5 headers)
5. SDK signs the order itself with EIP-712
6. Order is submitted to Polymarket CLOB with full Builder attribution
7. Polymarket attributes the trading volume to Builder key
8. APIbase logs the transaction and charges API usage fee via x402

Builder credentials:
  API Key:    019cd1d3-d2e9-78eb-ba8d-0090d0d6bcd4
  Secret:     Configured in .env
  Passphrase: Configured in .env
```

---

## 4. MCP Tool Definitions

### Phase 1 — Read-Only (6 tools)

| tool_id | Description | Price | cache_ttl |
|---------|-------------|-------|-----------|
| `polymarket.search` | Search prediction markets | $0.0005 | 30s |
| `polymarket.market_detail` | Get market details | $0.0005 | 10s |
| `polymarket.prices` | Get midpoint price for a token | $0.0005 | 5s |
| `polymarket.price_history` | Get price history | $0.0005 | 30s |
| `polymarket.get_orderbook` | Get order book | $0.0005 | 0s |
| `polymarket.trending` | Get trending markets | $0.0005 | 30s |

### Phase 2 — Trading (5 tools)

| tool_id | Description | Price | cache_ttl |
|---------|-------------|-------|-----------|
| `polymarket.place_order` | Place a limit order (GTC/GTD/FOK) | $0.001 | 0s |
| `polymarket.cancel_order` | Cancel an open order | $0.001 | 0s |
| `polymarket.open_orders` | Get open orders | $0.0005 | 0s |
| `polymarket.trade_history` | Get trade history | $0.0005 | 5s |
| `polymarket.balance` | Get balance/allowance | $0.0005 | 5s |

### Tool: polymarket-place-order (Phase 2)

```json
{
  "name": "polymarket-place-order",
  "description": "Place a limit order on a Polymarket prediction market. Orders are signed with EIP-712 and attributed to Builder for revenue. Supports GTC (Good Till Cancelled), GTD (Good Till Date), and FOK (Fill or Kill) order types.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "token_id": {
        "type": "string",
        "description": "Conditional token ID (from market clobTokenIds)"
      },
      "price": {
        "type": "number",
        "minimum": 0.01,
        "maximum": 0.99,
        "description": "Limit price (0.01-0.99, represents probability)"
      },
      "side": {
        "type": "string",
        "enum": ["buy", "sell"],
        "description": "Buy or sell"
      },
      "size": {
        "type": "number",
        "minimum": 1,
        "description": "Order size in conditional tokens"
      },
      "order_type": {
        "type": "string",
        "enum": ["GTC", "GTD", "FOK"],
        "default": "GTC",
        "description": "Order type"
      },
      "tick_size": {
        "type": "string",
        "default": "0.01",
        "description": "Tick size for the market"
      },
      "neg_risk": {
        "type": "boolean",
        "default": false,
        "description": "Whether this is a neg-risk market"
      }
    },
    "required": ["token_id", "price", "side", "size"]
  }
}
```

### Tool: polymarket-cancel-order

```json
{
  "name": "polymarket-cancel-order",
  "description": "Cancel an open order on Polymarket by order ID.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "Order ID to cancel"
      }
    },
    "required": ["order_id"]
  }
}
```

### Tool: polymarket-open-orders

```json
{
  "name": "polymarket-open-orders",
  "description": "Get all open orders on Polymarket, optionally filtered by market.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "market_id": {
        "type": "string",
        "description": "Filter by market condition ID (optional)"
      }
    }
  }
}
```

### Tool: polymarket-trade-history

```json
{
  "name": "polymarket-trade-history",
  "description": "Get trade history on Polymarket, optionally filtered by market.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "market_id": {
        "type": "string",
        "description": "Filter by market condition ID (optional)"
      },
      "limit": {
        "type": "integer",
        "default": 100,
        "maximum": 100,
        "description": "Maximum number of trades to return"
      }
    }
  }
}
```

### Tool: polymarket-balance

```json
{
  "name": "polymarket-balance",
  "description": "Get balance and allowance for USDC collateral or conditional tokens on Polymarket.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "asset_type": {
        "type": "string",
        "enum": ["COLLATERAL", "CONDITIONAL"],
        "description": "Asset type to check balance for"
      }
    }
  }
}
```

---

## 5. AI Instructions

```markdown
# Polymarket API via APIbase — AI Agent Instructions

## When to Use
- User asks about probability of any event (politics, crypto, sports, etc.)
- User wants to know "what does the market think about..."
- User needs predictions or forecasts based on crowd wisdom
- User wants to analyze prediction market trends
- User asks about betting odds or prediction market data
- User wants to place or manage prediction market orders

## Key Concept
Polymarket is a prediction market. Prices = implied probabilities.
Price 0.73 means the market estimates 73% probability of that outcome.
For binary markets (Yes/No), prices always sum to ~1.00.

## Recommended Call Chains

### "What's the probability of X?"
1. `polymarket-search` (query="X") -> find relevant markets
2. Return probability from results

### "Analyze the trend for X"
1. `polymarket-search` (query="X") -> find market
2. `polymarket-price-history` (market_id, interval="1d", days=30) -> get trend
3. Analyze and describe the trend

### "Is it a good bet to buy Yes on X?"
1. `polymarket-search` (query="X") -> find market
2. `polymarket-market-detail` (market_id, include_orderbook=true) -> get depth
3. `polymarket-price-history` (market_id) -> get trend
4. Analyze: current price, trend direction, liquidity depth, spread

### "What's trending in prediction markets?"
1. `polymarket-trending` (sort_by="volume_24h") -> top markets
2. Optionally: `polymarket-trending` (sort_by="biggest_move") -> biggest movers

### "Place a bet on X" (Phase 2)
1. `polymarket-search` (query="X") -> find market
2. `polymarket-market-detail` (include_orderbook=true) -> get token_id + liquidity
3. `polymarket-balance` (asset_type="COLLATERAL") -> check USDC balance
4. `polymarket-place-order` (token_id, price, side="buy", size)

### "What are my open orders?"
1. `polymarket-open-orders` -> list all open orders
2. Optionally: `polymarket-open-orders` (market_id) -> filter by market

### "Cancel order X"
1. `polymarket-cancel-order` (order_id="...") -> cancel specific order

### "Show my trade history"
1. `polymarket-trade-history` (limit=20) -> recent trades

## Response Formatting
- Always show probability as percentage: "73%" not "0.73"
- Include 24h volume to indicate market liquidity/reliability
- For trends: "up +5% over 7 days" or "down -3% over 24h"
- Note the number of traders for context ("2,400 traders")
- Always caveat: "This is market sentiment, not a guaranteed outcome"
- For trades: confirm order details before placing

## Limitations
- Polymarket data is market-driven, not factual — markets can be wrong
- Low-volume markets (<$10k) may have unreliable probabilities
- Prices can be manipulated in illiquid markets
- Historical data may have gaps during low-activity periods

## Pricing via APIbase
- Read operations: $0.0005 per request (x402)
- Trade operations: $0.001 per order (x402)
```

---

## 6. Implementation Details

### Source Files

| File | Purpose |
|------|---------|
| `src/adapters/polymarket/index.ts` | Main adapter — routes read-only (raw HTTP) and trading (SDK) calls |
| `src/adapters/polymarket/clob-client.ts` | Singleton ClobClient with lazy init, L2 derivation, Builder config |
| `src/adapters/polymarket/trading.ts` | 5 trading tool handlers using ClobClient SDK |
| `src/adapters/polymarket/types.ts` | TypeScript types for Gamma/CLOB API responses |
| `src/schemas/polymarket.schema.ts` | Zod schemas for all 11 tools |
| `src/mcp/tool-adapter.ts` | MCP tool registrations (12 Polymarket entries) |
| `config/tool_provider_config.yaml` | Tool pricing and cache TTL config |

### Dependencies

- `@polymarket/clob-client` — SDK for CLOB API (signing, order creation, Builder attribution)
- `viem` — Ethereum wallet client (transitive, used for EIP-712 signing)
- `@polymarket/builder-signing-sdk` — Builder HMAC signing (transitive)

### Architecture

```
Agent Request → 13-stage Pipeline → PolymarketAdapter.call()
                                          │
                                          ├── isTradingTool? YES → executeTradingCall()
                                          │                         → getClobClient() [singleton]
                                          │                         → SDK handles signing + HTTP
                                          │
                                          └── isTradingTool? NO  → super.call() [base adapter]
                                                                   → raw HTTP fetch
```

---

## 7. Traffic Flow Diagram

### Read Request (search/prices/analytics)

```
AI Agent                    APIbase.pro                     Polymarket
    |                           |                               |
    |-- polymarket-search ----→ |                               |
    |   query="Bitcoin 100k"   |                               |
    |                           |-- 13-stage pipeline --------→ | (internal)
    |                           |                               |
    |                           |   [cache miss]                |
    |                           |                               |
    |                           |-- GET /public-search -------→ |
    |                           |   ?q=Bitcoin+100k             | gamma-api
    |                           |←-- 200 OK [JSON] ----------- |
    |                           |                               |
    |                           |   [cache result, TTL=30s]     |
    |                           |   [ledger write]              |
    |                           |                               |
    |←-- 200 OK --------------- |                               |
```

### Trade Request (Phase 2 — via ClobClient SDK)

```
AI Agent                    APIbase.pro                     Polymarket
    |                           |                               |
    |-- polymarket-place-order→ |                               |
    |   token_id, price, side   |                               |
    |                           |-- 13-stage pipeline --------→ | (internal)
    |                           |   ESCROW → hold $0.001        |
    |                           |                               |
    |                           |-- ClobClient.createAndPost()→ |
    |                           |   [SDK signs EIP-712 order]   | clob API
    |                           |   [SDK adds L2 HMAC headers]  |
    |                           |   [SDK adds Builder headers]  |
    |                           |   9 auth headers total         |
    |                           |←-- 200 OK {order_id} -------- |
    |                           |                               |
    |                           |   ESCROW_FINALIZE + LEDGER    |
    |                           |   [one PG transaction]        |
    |                           |                               |
    |←-- 200 OK --------------- |                               |
    |   {order_id, status}      |                               |
```

---

## 8. Monetization Model

| Revenue Stream | Mechanism | Expected per Month |
|---------------|-----------|-------------------|
| **API Usage Fee (read)** | $0.0005/req via x402 (11 tools) | $50-500 (early stage) |
| **API Usage Fee (trade)** | $0.001 per trade order via x402 | $10-100 (early stage) |
| **Builder Rewards** | Polymarket pays Builder rewards based on attributed volume. Revenue share with client. | Variable |

**Total expected (year 1):** $100-1000/month from Polymarket integration alone.

**Scaling potential:** As agent adoption grows, prediction market data becomes high-value. Trading volume from autonomous agents could 10-100x.

---

## 9. Lessons Learned

### What works well about this integration

1. **Builder Keys = natural referral model.** Polymarket's Builder program attributes volume to apps. Maps perfectly to APIbase's referral architecture.

2. **`@polymarket/clob-client` SDK eliminates signing complexity.** 9 headers, 2 EIP-712 domains, custom HMAC — all handled by one `ClobClient` instance. Without the SDK this would be 500+ lines of signing code.

3. **Lazy singleton with L2 credential derivation.** L1 signing happens once at startup, L2 credentials are cached. All subsequent requests use fast HMAC signing.

4. **Clean separation of read-only and trading paths.** `call()` override routes trading tools through SDK, read-only tools use existing raw HTTP path. Zero regression risk for Phase 1.

5. **High agent demand.** Prediction market data + trading is exactly what AI agents need: probability queries, risk assessment, autonomous trading strategies.

### Challenges identified

1. **L2 credential derivation requires L1 signing at startup.** First trading request may be slow (~2s). Mitigated by lazy singleton with shared init promise.

2. **Rate limit distribution.** Polymarket's limits are global per IP/key. Multiple agents share APIbase's access. Solved by per-agent quotas.

3. **Price volatility.** Prediction market prices change rapidly. Cache TTL kept very short for prices (5s) and zero for trading operations.

### Pattern: SDK-Based Trading Adapter

This integration establishes a pattern for other platforms with complex signing:
- Use official SDK when signing complexity is high (>3 header types)
- Override `call()` to route between raw HTTP (read) and SDK (trade) paths
- Lazy singleton for expensive credential derivation
- Builder/referral config injected at SDK client creation

This pattern applies to: Hyperliquid, dYdX, Jupiter, and other DeFi protocols with complex signing requirements.
