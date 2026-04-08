import { z, type ZodSchema } from 'zod';

const sites = z
  .object({
    state: z
      .string()
      .length(2)
      .optional()
      .describe('US state FIPS code, 2 chars (e.g. "CA", "NY", "CO")'),
    county: z
      .string()
      .optional()
      .describe('County FIPS code, 5 digits (e.g. "06037" for Los Angeles County)'),
    bbox: z
      .string()
      .optional()
      .describe(
        'Bounding box: west,south,east,north in decimal degrees (e.g. "-105.5,39.5,-104.5,40.5")',
      ),
    site_no: z
      .string()
      .optional()
      .describe('USGS site number (e.g. "09380000" for Colorado River at Lees Ferry)'),
  })
  .strip();

const realtime = z
  .object({
    site_no: z
      .string()
      .min(1)
      .describe('USGS site number (e.g. "09380000"). Use water.sites to find site numbers first.'),
    parameter_cd: z
      .string()
      .optional()
      .describe(
        'Parameter code(s), comma-separated. Common: 00060=streamflow, 00065=gage height, 00010=temperature. Default: all available.',
      ),
    period: z
      .string()
      .optional()
      .describe(
        'ISO 8601 duration for data window (e.g. "PT2H" for 2 hours, "P7D" for 7 days). Default: PT2H.',
      ),
  })
  .strip();

export const waterSchemas: Record<string, ZodSchema> = {
  'water.sites': sites,
  'water.realtime': realtime,
};
