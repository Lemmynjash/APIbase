import { z, type ZodSchema } from 'zod';

const moonPhases = z
  .object({
    year: z
      .number()
      .int()
      .min(1700)
      .max(2100)
      .optional()
      .describe('Year for moon phases (default: current year, e.g. 2026)'),
  })
  .strip();

const sunMoon = z
  .object({
    date: z.string().describe('Date in YYYY-MM-DD format (e.g. 2026-04-07)'),
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .describe('Latitude in decimal degrees (e.g. 40.7128 for New York)'),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe('Longitude in decimal degrees (e.g. -74.0060 for New York)'),
  })
  .strip();

const seasons = z
  .object({
    year: z
      .number()
      .int()
      .min(1700)
      .max(2100)
      .optional()
      .describe('Year for equinoxes and solstices (default: current year)'),
  })
  .strip();

export const usnoSchemas: Record<string, ZodSchema> = {
  'usno.moon_phases': moonPhases,
  'usno.sun_moon': sunMoon,
  'usno.seasons': seasons,
};
