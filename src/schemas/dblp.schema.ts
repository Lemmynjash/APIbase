import { z, type ZodSchema } from 'zod';

const search = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        'Search query — paper title, keyword, or topic (e.g. "transformer attention", "graph neural network", "LLM reasoning")',
      ),
    year: z.number().int().optional().describe('Filter by publication year (e.g. 2024)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of results (1-50, default 20)'),
  })
  .strip();

const author = z
  .object({
    query: z
      .string()
      .min(1)
      .describe('Author name to search (e.g. "Geoffrey Hinton", "Yann LeCun", "Ilya Sutskever")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe('Number of results (1-30, default 10)'),
  })
  .strip();

export const dblpSchemas: Record<string, ZodSchema> = {
  'dblp.search': search,
  'dblp.author': author,
};
