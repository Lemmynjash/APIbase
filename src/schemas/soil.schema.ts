import { z, type ZodSchema } from 'zod';

/**
 * Zod schemas for USDA Soil Data Access tools (UC-386).
 * Every field includes .describe() for Smithery quality score.
 */

const soilProperties = z
  .object({
    lat: z
      .number()
      .min(-90)
      .max(90)
      .describe(
        'Latitude in WGS84 decimal degrees (e.g. 42.0 for central Iowa farmland, 38.89 for Washington DC). Coverage: US continental + Alaska + Hawaii + territories.',
      ),
    lon: z
      .number()
      .min(-180)
      .max(180)
      .describe(
        'Longitude in WGS84 decimal degrees (e.g. -93.5 for central Iowa, -77.03 for Washington DC). Note: longitude FIRST in coordinate pairs only matters for SQL — this field is independent.',
      ),
  })
  .strip();

export const soilSchemas: Record<string, ZodSchema> = {
  'soil.properties': soilProperties,
};
