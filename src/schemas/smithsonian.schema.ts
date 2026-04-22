import { z, type ZodSchema } from 'zod';

/**
 * Zod schemas for Smithsonian Institution Open Access tools (UC-382).
 * Every field includes .describe() for Smithery quality score.
 */

const smithsonianSearch = z
  .object({
    q: z
      .string()
      .min(1)
      .describe(
        'Full-text search query. Example: "dinosaur", "picasso", "apollo 11". Supports EDAN query syntax (field:value, AND/OR).',
      ),
    rows: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of results to return (1-100, default 10).'),
    start: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Offset for pagination (default 0). Useful with rowCount from previous call.'),
    sort: z
      .enum(['relevancy', 'newest', 'updated', 'random'])
      .optional()
      .describe('Sort order for results. Default: relevancy.'),
    type: z
      .enum(['archives', 'books', 'online_media', 'objects', 'events', 'places', 'species'])
      .optional()
      .describe(
        'Filter by record type. E.g. "objects" for 3D objects, "species" for scientific specimens.',
      ),
    online_media_type: z
      .enum(['Images', 'Sound recordings', 'Videos'])
      .optional()
      .describe('Filter to items that have media of a specific type.'),
    cc0_only: z
      .boolean()
      .optional()
      .describe(
        'Filter results to CC0-licensed records only (default true). Set false to include all records with their license field.',
      ),
  })
  .strip();

const smithsonianRecord = z
  .object({
    id: z
      .string()
      .min(1)
      .describe(
        'Smithsonian record ID from a previous search result (e.g. "edanmdm-nmnhvz_5068559" or "ld1-*"). Use smithsonian.search first to find IDs.',
      ),
  })
  .strip();

export const smithsonianSchemas: Record<string, ZodSchema> = {
  'smithsonian.search': smithsonianSearch,
  'smithsonian.record': smithsonianRecord,
};
