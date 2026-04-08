import { z, type ZodSchema } from 'zod';

const indicators = z
  .object({
    keyword: z
      .string()
      .optional()
      .describe(
        'Search keyword for indicators (e.g. "gdp", "population", "poverty", "education", "co2 emissions")',
      ),
    topic: z
      .string()
      .optional()
      .describe(
        'Topic ID filter (1=Agriculture, 3=Economy, 4=Education, 6=Environment, 8=Health, 11=Poverty, 14=Science, 19=Climate Change)',
      ),
    source: z
      .string()
      .optional()
      .describe('Source ID filter (2=World Development Indicators, 11=Africa, 57=Gender)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Results per page (1-50, default 20)'),
  })
  .strip();

export const worldbankSchemas: Record<string, ZodSchema> = {
  'worldbank.indicators': indicators,
};
