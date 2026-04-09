import { z, type ZodSchema } from 'zod';

const search = z
  .object({
    title: z
      .string()
      .optional()
      .describe('Artwork title search (e.g. "Night Watch", "Self-portrait", "Milkmaid")'),
    description: z
      .string()
      .optional()
      .describe('Search within artwork descriptions (e.g. "portrait", "landscape")'),
    creation_date: z
      .string()
      .optional()
      .describe('Filter by creation year or date (e.g. "1642", "1665")'),
    object_number: z
      .string()
      .optional()
      .describe('Rijksmuseum object number (e.g. "SK-C-5" for Night Watch)'),
  })
  .strip();

const details = z
  .object({
    object_id: z
      .string()
      .min(1)
      .describe(
        'Rijksmuseum numeric ID (e.g. "200107928" for The Night Watch). Use rijks.search to find IDs.',
      ),
  })
  .strip();

export const rijksSchemas: Record<string, ZodSchema> = {
  'rijks.search': search,
  'rijks.details': details,
};
