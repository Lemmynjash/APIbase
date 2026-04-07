import { z, type ZodSchema } from 'zod';

const climateParams = z
  .object({
    years: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of years of data to return (1-50, default 10). Data is monthly.'),
  })
  .strip();

export const climateSchemas: Record<string, ZodSchema> = {
  'climate.temperature': climateParams,
  'climate.co2': climateParams,
  'climate.methane': climateParams,
  'climate.nitrous_oxide': climateParams,
  'climate.arctic_ice': climateParams,
};
