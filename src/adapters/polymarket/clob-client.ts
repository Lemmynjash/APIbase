import { ClobClient, SignatureType } from '@polymarket/clob-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { config } from '../../config';
import { logger } from '../../config/logger';

/**
 * Lazy-initialized singleton ClobClient for Polymarket trading (UC-001 Phase 2).
 *
 * On first use:
 *  1. Creates viem WalletClient from private key
 *  2. Calls createOrDeriveApiKey() to get L2 credentials (one-time L1 EIP-712 call)
 *  3. Creates ClobClient with BuilderConfig for revenue attribution
 *  4. Caches the client instance for reuse
 */

let clientInstance: ClobClient | null = null;
let initPromise: Promise<ClobClient> | null = null;

/**
 * Check whether Polymarket trading credentials are configured.
 */
export function isTradingConfigured(): boolean {
  return !!(config.POLYMARKET_PRIVATE_KEY && config.POLYMARKET_BUILDER_API_KEY);
}

/**
 * Get or create the singleton ClobClient instance.
 * Thread-safe: concurrent calls share the same initialization promise.
 */
export async function getClobClient(): Promise<ClobClient> {
  if (clientInstance) return clientInstance;

  if (!initPromise) {
    initPromise = initClobClient();
  }

  return initPromise;
}

async function initClobClient(): Promise<ClobClient> {
  if (!config.POLYMARKET_PRIVATE_KEY) {
    throw new Error('POLYMARKET_PRIVATE_KEY not configured');
  }
  if (!config.POLYMARKET_BUILDER_API_KEY) {
    throw new Error('POLYMARKET_BUILDER_API_KEY not configured');
  }

  const account = privateKeyToAccount(config.POLYMARKET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http('https://polygon-rpc.com'),
  });

  // Derive L2 credentials (L1 EIP-712 call, happens once)
  const tempClient = new ClobClient(
    'https://clob.polymarket.com',
    137,
    walletClient,
  );
  const creds = await tempClient.createOrDeriveApiKey();
  logger.info({ address: account.address }, 'CLOB L2 credentials derived');

  // Full client with Builder attribution
  const builderConfig = new BuilderConfig({
    localBuilderCreds: {
      key: config.POLYMARKET_BUILDER_API_KEY,
      secret: config.POLYMARKET_BUILDER_SECRET,
      passphrase: config.POLYMARKET_BUILDER_PASSPHRASE,
    },
  });

  clientInstance = new ClobClient(
    'https://clob.polymarket.com',
    137,
    walletClient,
    creds,
    SignatureType.EOA,
    account.address,
    undefined,
    false,
    builderConfig,
  );

  logger.info({ address: account.address }, 'CLOB client initialized with Builder attribution');
  return clientInstance;
}
