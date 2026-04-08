import { z, type ZodSchema } from 'zod';

const bodies = z
  .object({
    body_type: z
      .enum(['planet', 'moon', 'asteroid', 'comet', 'dwarf_planet', 'all'])
      .optional()
      .describe(
        'Filter by body type: planet, moon, asteroid, comet, dwarf_planet, or all (default: all)',
      ),
  })
  .strip();

const bodyDetails = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('Body ID from search results (e.g. "mars", "jupiter", "moon", "europa", "ceres")'),
  })
  .strip();

export const solarSchemas: Record<string, ZodSchema> = {
  'solar.bodies': bodies,
  'solar.body_details': bodyDetails,
};
