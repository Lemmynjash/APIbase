import { z, type ZodSchema } from 'zod';

const toxicReleases = z
  .object({
    state: z.string().length(2).describe('US state code (e.g. CA, TX, NY, FL)'),
    zip_code: z
      .string()
      .optional()
      .describe('ZIP code to filter (e.g. 90001). Overrides state filter if provided.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of results (1-50, default 10)'),
  })
  .strip();

const waterSystems = z
  .object({
    state: z.string().length(2).describe('US state code (e.g. FL, CA, TX)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of results (1-50, default 10)'),
  })
  .strip();

export const epaSchemas: Record<string, ZodSchema> = {
  'epa.toxic_releases': toxicReleases,
  'epa.water_systems': waterSystems,
};
