import { z, type ZodSchema } from 'zod';

const companySearch = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        'Company name, ticker, or keyword to search (e.g. "Apple Inc", "TSLA", "artificial intelligence")',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Max results to return (default 10, max 50)'),
  })
  .strip();

const filings = z
  .object({
    cik: z
      .string()
      .min(1)
      .describe(
        'SEC CIK number (e.g. "320193" for Apple, "789019" for Microsoft). Find via company_search',
      ),
  })
  .strip();

const companyFacts = z
  .object({
    cik: z
      .string()
      .min(1)
      .describe(
        'SEC CIK number (e.g. "320193" for Apple). Returns XBRL financial facts: revenue, net income, assets, liabilities',
      ),
  })
  .strip();

const xbrlConcept = z
  .object({
    cik: z
      .string()
      .min(1)
      .describe('SEC CIK number (e.g. "320193" for Apple, "789019" for Microsoft)'),
    tag: z
      .string()
      .min(1)
      .describe('XBRL concept tag (e.g. Revenues, NetIncomeLoss, Assets, EarningsPerShareBasic)'),
    taxonomy: z
      .string()
      .optional()
      .describe('XBRL taxonomy (default: us-gaap). Other: ifrs-full, dei, srt'),
  })
  .strip();

const xbrlFrames = z
  .object({
    tag: z
      .string()
      .min(1)
      .describe('XBRL concept tag (e.g. Revenues, NetIncomeLoss, Assets, TotalDebt)'),
    period: z
      .string()
      .min(1)
      .describe(
        'Reporting period: CY2023 (annual), CY2023Q4I (quarterly instant), CY2023Q3 (quarterly duration)',
      ),
    unit: z
      .string()
      .optional()
      .describe(
        'Unit of measure (default: USD). Other: USD/shares for EPS, shares for share counts',
      ),
    taxonomy: z.string().optional().describe('XBRL taxonomy (default: us-gaap)'),
  })
  .strip();

export const edgarSchemas: Record<string, ZodSchema> = {
  'edgar.company_search': companySearch,
  'edgar.filings': filings,
  'edgar.company_facts': companyFacts,
  'edgar.xbrl_concept': xbrlConcept,
  'edgar.xbrl_frames': xbrlFrames,
};
