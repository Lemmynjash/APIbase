import { z, type ZodSchema } from 'zod';

const search = z
  .object({
    query: z
      .string()
      .optional()
      .describe('Search keyword — artist, title, subject (e.g. "monet", "armor", "japanese")'),
    type: z
      .string()
      .optional()
      .describe('Artwork type filter (e.g. "Painting", "Sculpture", "Print", "Photograph")'),
    department: z
      .string()
      .optional()
      .describe(
        'Department filter (e.g. "European Painting and Sculpture", "Asian Art", "Prints")',
      ),
    artist: z
      .string()
      .optional()
      .describe('Artist name filter (e.g. "Claude Monet", "Pablo Picasso")'),
    cc0_only: z
      .boolean()
      .optional()
      .describe('Only return CC0-licensed artworks (free for commercial use). Default: false.'),
    has_image: z.boolean().optional().describe('Only return artworks with images (default: true)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of results (1-50, default 20)'),
  })
  .strip();

const artwork = z
  .object({
    artwork_id: z
      .number()
      .int()
      .min(1)
      .describe(
        'Cleveland Museum artwork ID (e.g. 135382 for Monet "The Red Kerchief"). Use cma.search to find IDs.',
      ),
  })
  .strip();

export const cmaSchemas: Record<string, ZodSchema> = {
  'cma.search': search,
  'cma.artwork': artwork,
};
