import { Side, OrderType } from '@polymarket/clob-client';
import type {
  UserOrder,
  TickSize,
  TradeParams,
  BalanceAllowanceParams,
  AssetType,
  OpenOrderParams,
} from '@polymarket/clob-client';
import { getClobClient } from './clob-client';
import { logger } from '../../config/logger';
import type { ProviderRequest, ProviderRawResponse } from '../../types/provider';
import { ProviderErrorCode } from '../../types/provider';

/**
 * Polymarket Phase 2 trading handlers (UC-001 §3-§8).
 *
 * Each function delegates to the ClobClient SDK, which handles:
 * - L2 HMAC-SHA256 signing (5 headers)
 * - EIP-712 order signing (separate domain)
 * - Builder HMAC signing (4 additional headers)
 */

const TRADING_TOOLS = new Set([
  'polymarket.place_order',
  'polymarket.cancel_order',
  'polymarket.open_orders',
  'polymarket.trade_history',
  'polymarket.balance',
]);

export function isTradingTool(toolId: string): boolean {
  return TRADING_TOOLS.has(toolId);
}

/**
 * Execute a trading tool call via the ClobClient SDK.
 */
export async function executeTradingCall(req: ProviderRequest): Promise<ProviderRawResponse> {
  const start = performance.now();
  const params = req.params as Record<string, unknown>;

  try {
    let body: unknown;

    switch (req.toolId) {
      case 'polymarket.place_order':
        body = await executePlaceOrder(params);
        break;
      case 'polymarket.cancel_order':
        body = await executeCancelOrder(params);
        break;
      case 'polymarket.open_orders':
        body = await executeOpenOrders(params);
        break;
      case 'polymarket.trade_history':
        body = await executeTradeHistory(params);
        break;
      case 'polymarket.balance':
        body = await executeBalance(params);
        break;
      default:
        throw {
          code: ProviderErrorCode.INVALID_RESPONSE,
          httpStatus: 502,
          message: `Unsupported trading tool: ${req.toolId}`,
          provider: 'polymarket',
          toolId: req.toolId,
          durationMs: 0,
        };
    }

    const durationMs = Math.round(performance.now() - start);
    const bodyStr = JSON.stringify(body);

    logger.info(
      { tool_id: req.toolId, duration_ms: durationMs },
      'Trading call completed',
    );

    return {
      status: 200,
      headers: {},
      body,
      durationMs,
      byteLength: Buffer.byteLength(bodyStr, 'utf8'),
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);

    // Re-throw structured ProviderErrors as-is
    if (error && typeof error === 'object' && 'code' in error && 'httpStatus' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      { tool_id: req.toolId, duration_ms: durationMs, err: message },
      'Trading call failed',
    );

    throw {
      code: ProviderErrorCode.UNAVAILABLE,
      httpStatus: 502,
      message: `Polymarket trading error: ${message}`,
      provider: 'polymarket',
      toolId: req.toolId,
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Individual tool handlers
// ---------------------------------------------------------------------------

async function executePlaceOrder(params: Record<string, unknown>): Promise<unknown> {
  const client = await getClobClient();

  const sideStr = (params.side as string).toUpperCase();
  const side = sideStr === 'BUY' ? Side.BUY : Side.SELL;

  const userOrder: UserOrder = {
    tokenID: params.token_id as string,
    price: params.price as number,
    size: params.size as number,
    side,
  };

  const tickSize = (params.tick_size as TickSize) || '0.01';
  const negRisk = (params.neg_risk as boolean) ?? false;

  const orderTypeStr = (params.order_type as string) || 'GTC';
  let orderType: OrderType.GTC | OrderType.GTD;
  if (orderTypeStr === 'GTD') {
    orderType = OrderType.GTD;
  } else {
    orderType = OrderType.GTC;
  }

  // FOK uses createAndPostMarketOrder instead
  if (orderTypeStr === 'FOK') {
    return client.createAndPostMarketOrder(
      {
        tokenID: params.token_id as string,
        amount: params.size as number,
        price: params.price as number,
        side,
      },
      { tickSize, negRisk },
      OrderType.FOK,
    );
  }

  return client.createAndPostOrder(
    userOrder,
    { tickSize, negRisk },
    orderType,
  );
}

async function executeCancelOrder(params: Record<string, unknown>): Promise<unknown> {
  const client = await getClobClient();
  return client.cancelOrder({ orderID: params.order_id as string });
}

async function executeOpenOrders(params: Record<string, unknown>): Promise<unknown> {
  const client = await getClobClient();

  const openParams: OpenOrderParams = {};
  if (params.market_id) {
    openParams.market = params.market_id as string;
  }

  return client.getOpenOrders(openParams);
}

async function executeTradeHistory(params: Record<string, unknown>): Promise<unknown> {
  const client = await getClobClient();

  const tradeParams: TradeParams = {};
  if (params.market_id) {
    tradeParams.market = params.market_id as string;
  }

  const trades = await client.getTrades(tradeParams);

  // Apply limit (SDK doesn't support limit param directly)
  const limit = (params.limit as number) || 100;
  return trades.slice(0, limit);
}

async function executeBalance(params: Record<string, unknown>): Promise<unknown> {
  const client = await getClobClient();

  const balanceParams: BalanceAllowanceParams | undefined = params.asset_type
    ? { asset_type: params.asset_type as AssetType }
    : undefined;

  return client.getBalanceAllowance(balanceParams);
}
