import { z, type ZodSchema } from 'zod';

const figiMap = z
  .object({
    id_type: z
      .enum([
        'ID_ISIN',
        'ID_CUSIP',
        'ID_SEDOL',
        'ID_BB_GLOBAL',
        'TICKER',
        'ID_WERTPAPIER',
        'ID_COMMON',
      ])
      .describe('Identifier type: ID_ISIN, ID_CUSIP, ID_SEDOL, TICKER, ID_BB_GLOBAL'),
    id_value: z
      .string()
      .min(1)
      .describe(
        'Identifier value (e.g. US0378331005 for ISIN, AAPL for ticker, BBG000B9XRY4 for FIGI)',
      ),
    exchange_code: z
      .string()
      .optional()
      .describe('Exchange code to narrow results (e.g. US, LN, JP). Optional.'),
  })
  .strip();

const figiSearch = z
  .object({
    query: z
      .string()
      .min(1)
      .describe('Search query — company name or ticker (e.g. "Tesla", "Apple Inc", "MSFT")'),
    exchange_code: z.string().optional().describe('Filter by exchange code (e.g. US, LN, JP)'),
    security_type: z
      .string()
      .optional()
      .describe('Filter by security type (e.g. "Common Stock", "ETP", "REIT")'),
  })
  .strip();

const figiFilter = z
  .object({
    exchange_code: z.string().optional().describe('Exchange code (e.g. US, LN, HK, JP)'),
    market_sector: z
      .string()
      .optional()
      .describe('Market sector (e.g. Equity, Corp, Govt, Index, Curncy, Comdty)'),
    security_type: z
      .string()
      .optional()
      .describe('Security type (e.g. "Common Stock", "ETP", "REIT", "ADR")'),
  })
  .strip();

export const figiSchemas: Record<string, ZodSchema> = {
  'figi.map': figiMap,
  'figi.search': figiSearch,
  'figi.filter': figiFilter,
};
