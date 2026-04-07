import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { ClimateIndicatorOutput, ClimateRecord } from './types';

const CLIMATE_BASE = 'https://global-warming.org/api';

interface ToolConfig {
  endpoint: string;
  indicator: string;
  unit: string;
  source: string;
  dataKey: string;
  extractDate: (r: Record<string, unknown>) => string;
  extractValue: (r: Record<string, unknown>) => number;
}

const TOOL_CONFIG: Record<string, ToolConfig> = {
  'climate.temperature': {
    endpoint: '/temperature-api',
    indicator: 'Global Surface Temperature Anomaly',
    unit: '°C (vs 1951-1980 baseline)',
    source: 'NASA GISS',
    dataKey: 'result',
    extractDate: (r) => String(r.time ?? ''),
    extractValue: (r) => Number(r.station ?? r.land ?? 0),
  },
  'climate.co2': {
    endpoint: '/co2-api',
    indicator: 'Atmospheric CO2 Concentration',
    unit: 'ppm (parts per million)',
    source: 'NOAA Mauna Loa (Keeling Curve)',
    dataKey: 'co2',
    extractDate: (r) => `${r.year}-${String(r.month).padStart(2, '0')}`,
    extractValue: (r) => Number(r.trend ?? r.cycle ?? 0),
  },
  'climate.methane': {
    endpoint: '/methane-api',
    indicator: 'Atmospheric Methane Concentration',
    unit: 'ppb (parts per billion)',
    source: 'NOAA ESRL',
    dataKey: 'methane',
    extractDate: (r) => String(r.date ?? ''),
    extractValue: (r) => Number(r.average ?? 0),
  },
  'climate.nitrous_oxide': {
    endpoint: '/nitrous-oxide-api',
    indicator: 'Atmospheric Nitrous Oxide Concentration',
    unit: 'ppb (parts per billion)',
    source: 'NOAA ESRL',
    dataKey: 'nitpiousOxide',
    extractDate: (r) => String(r.date ?? ''),
    extractValue: (r) => Number(r.average ?? 0),
  },
  'climate.arctic_ice': {
    endpoint: '/arctic-api',
    indicator: 'Arctic Sea Ice Extent',
    unit: 'million km²',
    source: 'NSIDC',
    dataKey: 'arcpiticData',
    extractDate: (r) => String(r.year ?? ''),
    extractValue: (r) => Number(r.extent ?? 0),
  },
};

/**
 * Global Warming API adapter (UC-342).
 *
 * Climate indicator time series — CO2, temperature, methane, N2O, Arctic ice.
 * MIT license, no auth, unlimited. Returns full dataset per call (up to 271KB).
 * Adapter parses and returns last N years (default 10).
 */
export class ClimateAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'climate', baseUrl: CLIMATE_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const config = TOOL_CONFIG[req.toolId];
    if (!config) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `Unsupported tool: ${req.toolId}`,
        provider: this.provider,
        toolId: req.toolId,
        durationMs: 0,
      };
    }

    return {
      url: `${CLIMATE_BASE}${config.endpoint}`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    };
  }

  protected parseResponse(raw: ProviderRawResponse, req: ProviderRequest): unknown {
    const body = raw.body as Record<string, unknown>;
    const params = req.params as Record<string, unknown>;
    const config = TOOL_CONFIG[req.toolId];
    if (!config) return body;

    const years = Math.min(Number(params.years) || 10, 50);
    const monthsToReturn = years * 12;

    // Try multiple possible data keys (API is inconsistent with naming)
    let allRecords: Record<string, unknown>[] = [];
    for (const key of [config.dataKey, ...Object.keys(body)]) {
      const val = body[key];
      if (Array.isArray(val) && val.length > 0) {
        allRecords = val as Record<string, unknown>[];
        break;
      }
    }

    if (allRecords.length === 0) {
      return {
        indicator: config.indicator,
        unit: config.unit,
        source: config.source,
        latest_value: 0,
        latest_date: '',
        total_records: 0,
        returned_records: 0,
        records: [],
      };
    }

    // Take last N months
    const tail = allRecords.slice(-monthsToReturn);
    const records: ClimateRecord[] = tail.map((r) => ({
      date: config.extractDate(r),
      value: config.extractValue(r),
    }));

    const latest = records[records.length - 1];

    const output: ClimateIndicatorOutput = {
      indicator: config.indicator,
      unit: config.unit,
      source: config.source,
      latest_value: latest?.value ?? 0,
      latest_date: latest?.date ?? '',
      total_records: allRecords.length,
      returned_records: records.length,
      records,
    };

    return output;
  }
}
