import { z, type ZodSchema } from 'zod';

const stations = z
  .object({
    location_id: z
      .string()
      .min(1)
      .describe(
        'Location ID: FIPS:06 (California), FIPS:36 (New York), ZIP:10001, CITY:US360019, or CNTRY:US',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Number of stations to return (1-25, default 10)'),
  })
  .strip();

const dailyData = z
  .object({
    station_id: z
      .string()
      .min(1)
      .describe(
        'NCEI station ID (e.g. GHCND:USW00094728 for Central Park, NY). Get from ncei.stations tool.',
      ),
    start_date: z.string().describe('Start date in YYYY-MM-DD format (e.g. 2025-01-01)'),
    end_date: z
      .string()
      .describe('End date in YYYY-MM-DD format (e.g. 2025-01-31). Max 1 year range.'),
    datatypes: z
      .string()
      .optional()
      .describe(
        'Comma-separated data types: TMAX (max temp), TMIN (min temp), PRCP (precipitation), SNOW, AWND (avg wind). Default: all.',
      ),
  })
  .strip();

export const nceiSchemas: Record<string, ZodSchema> = {
  'ncei.stations': stations,
  'ncei.daily_data': dailyData,
};
