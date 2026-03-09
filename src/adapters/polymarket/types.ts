/**
 * Raw Polymarket API response types (UC-001).
 *
 * Three upstream services:
 *   Gamma API  — https://gamma-api.polymarket.com  (markets, search)
 *   CLOB API   — https://clob.polymarket.com       (prices, orderbook, history)
 *   Data API   — https://data-api.polymarket.com   (leaderboard, analytics)
 */

// ---------------------------------------------------------------------------
// Gamma API — /public-search, /markets, /markets/{id}
// ---------------------------------------------------------------------------

export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: string;
  openInterest?: string;
  active: boolean;
  closed: boolean;
  marketType: string;
  groupItemTitle?: string;
  clobTokenIds?: string;
  tickSize?: string;
  image?: string;
  icon?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  enableOrderBook?: boolean;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
}

/** /public-search response — events with nested markets */
export interface GammaEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description?: string;
  startDate?: string;
  creationDate?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  active: boolean;
  closed: boolean;
  archived?: boolean;
  liquidity?: number;
  volume?: number;
  volume24hr?: number;
  enableOrderBook?: boolean;
  markets: GammaMarket[];
}

export interface GammaSearchResponse {
  events: GammaEvent[];
  pagination?: {
    count: number;
    limit: number;
    offset: number;
  };
}

export type GammaMarketsResponse = GammaMarket[];

// ---------------------------------------------------------------------------
// CLOB API — /prices, /book, /prices-history
// ---------------------------------------------------------------------------

export interface ClobPriceEntry {
  token_id: string;
  price: string;
}

export type ClobPricesResponse = Record<string, string>;

/** /midpoint response — single token midpoint price */
export interface ClobMidpointResponse {
  mid: string;
}

export interface ClobOrderbookLevel {
  price: string;
  size: string;
}

export interface ClobOrderbookResponse {
  market: string;
  asset_id: string;
  bids: ClobOrderbookLevel[];
  asks: ClobOrderbookLevel[];
  hash: string;
  timestamp: string;
}

export interface ClobPriceHistoryPoint {
  t: number;
  p: string;
}

export type ClobPriceHistoryResponse = {
  history: ClobPriceHistoryPoint[];
};

// ---------------------------------------------------------------------------
// Data API — leaderboard endpoint removed (2025+)
// ---------------------------------------------------------------------------
