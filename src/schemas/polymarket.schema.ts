import { z, type ZodSchema } from 'zod';

const polymarketSearch = z
  .object({
    query: z.string(),
    category: z
      .enum([
        'politics',
        'crypto',
        'sports',
        'finance',
        'science',
        'culture',
        'geopolitics',
        'iran',
        'economics',
      ])
      .optional(),
    status: z.enum(['active', 'resolved', 'all']).optional(),
    sort_by: z
      .enum(['volume', 'newest', 'ending_soon', 'probability_high', 'probability_low'])
      .optional(),
    limit: z.number().int().max(100).optional(),
  })
  .strip();

const polymarketMarketDetail = z
  .object({
    market_id: z.string(),
    include_orderbook: z.boolean().optional(),
    include_history: z.boolean().optional(),
  })
  .strip();

const polymarketPrices = z
  .object({
    token_id: z.string(),
  })
  .strip();

const polymarketPriceHistory = z
  .object({
    market_id: z.string(),
    interval: z.enum(['1h', '4h', '1d', '1w']).optional(),
    days: z.number().int().max(365).optional(),
  })
  .strip();

const polymarketGetOrderbook = z
  .object({
    market_id: z.string(),
    depth: z.number().int().max(50).optional(),
  })
  .strip();

const polymarketTrending = z
  .object({
    sort_by: z.enum(['volume_24h', 'newest', 'biggest_move', 'ending_soon']).optional(),
    category: z
      .enum(['politics', 'crypto', 'sports', 'finance', 'science', 'culture', 'geopolitics'])
      .optional(),
    limit: z.number().int().max(50).optional(),
  })
  .strip();

// Phase 2 — Trading tools (UC-001 §3-§8)

const polymarketPlaceOrder = z
  .object({
    token_id: z.string(),
    price: z.number().min(0.01).max(0.99),
    side: z.enum(['buy', 'sell']),
    size: z.number().min(1),
    order_type: z.enum(['GTC', 'GTD', 'FOK']).optional(),
    tick_size: z.string().optional(),
    neg_risk: z.boolean().optional(),
  })
  .strip();

const polymarketCancelOrder = z
  .object({
    order_id: z.string(),
  })
  .strip();

const polymarketOpenOrders = z
  .object({
    market_id: z.string().optional(),
  })
  .strip();

const polymarketTradeHistory = z
  .object({
    market_id: z.string().optional(),
    limit: z.number().int().max(100).optional(),
  })
  .strip();

const polymarketBalance = z
  .object({
    asset_type: z.enum(['COLLATERAL', 'CONDITIONAL']).optional(),
  })
  .strip();

export const polymarketSchemas: Record<string, ZodSchema> = {
  'polymarket.search': polymarketSearch,
  'polymarket.market_detail': polymarketMarketDetail,
  'polymarket.prices': polymarketPrices,
  'polymarket.price_history': polymarketPriceHistory,
  'polymarket.get_orderbook': polymarketGetOrderbook,
  'polymarket.trending': polymarketTrending,
  'polymarket.place_order': polymarketPlaceOrder,
  'polymarket.cancel_order': polymarketCancelOrder,
  'polymarket.open_orders': polymarketOpenOrders,
  'polymarket.trade_history': polymarketTradeHistory,
  'polymarket.balance': polymarketBalance,
};
