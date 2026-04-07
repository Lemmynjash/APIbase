import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type {
  EpaToxicReleasesOutput,
  EpaWaterSystemsOutput,
  TriFacility,
  WaterSystem,
} from './types';

const EPA_BASE = 'https://enviro.epa.gov/enviro/efservice';

/**
 * EPA Envirofacts adapter (UC-337).
 *
 * US Environmental Protection Agency — TRI toxic releases, public water systems.
 * No auth, unlimited, US Gov open data.
 * URL pattern: /efservice/{table}/{field}/{value}/rows/{start}:{end}/JSON
 * Response: JSON array directly (no envelope), fields UPPER_CASE.
 */
export class EpaAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'epa', baseUrl: EPA_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const limit = Math.min(Number(params.limit) || 10, 50);
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'epa.toxic_releases': {
        const state = encodeURIComponent(String(params.state).toUpperCase());
        const zip = params.zip_code ? encodeURIComponent(String(params.zip_code)) : null;

        const filter = zip ? `zip_code/${zip}` : `state_abbr/${state}`;

        return {
          url: `${EPA_BASE}/tri_facility/${filter}/rows/0:${limit}/JSON`,
          method: 'GET',
          headers,
        };
      }

      case 'epa.water_systems': {
        const state = encodeURIComponent(String(params.state).toUpperCase());
        return {
          url: `${EPA_BASE}/WATER_SYSTEM/STATE_CODE/${state}/rows/0:${limit}/JSON`,
          method: 'GET',
          headers,
        };
      }

      default:
        throw {
          code: ProviderErrorCode.INVALID_RESPONSE,
          httpStatus: 502,
          message: `Unsupported tool: ${req.toolId}`,
          provider: this.provider,
          toolId: req.toolId,
          durationMs: 0,
        };
    }
  }

  protected parseResponse(raw: ProviderRawResponse, req: ProviderRequest): unknown {
    const body = raw.body;
    const params = req.params as Record<string, unknown>;

    // EPA returns error objects for invalid tables
    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      (body as Record<string, unknown>).error
    ) {
      return { total: 0, state: String(params.state ?? ''), results: [] };
    }

    const records = Array.isArray(body) ? body : [];

    switch (req.toolId) {
      case 'epa.toxic_releases':
        return this.parseTri(records, params);
      case 'epa.water_systems':
        return this.parseWater(records, params);
      default:
        return records;
    }
  }

  private parseTri(records: unknown[], params: Record<string, unknown>): EpaToxicReleasesOutput {
    return {
      total: records.length,
      state: String(params.state ?? '').toUpperCase(),
      results: records.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          facility_id: String(rec.tri_facility_id ?? ''),
          facility_name: String(rec.facility_name ?? ''),
          street_address: String(rec.street_address ?? ''),
          city: String(rec.city_name ?? ''),
          state: String(rec.state_abbr ?? ''),
          county: String(rec.county_name ?? ''),
          zip_code: String(rec.zip_code ?? ''),
          region: String(rec.region ?? ''),
          industry_sector: String(rec.industry_sector ?? ''),
          is_closed: rec.fac_closed_ind === '1',
          latitude: rec.latitude != null ? Number(rec.latitude) : null,
          longitude: rec.longitude != null ? Number(rec.longitude) : null,
        } as TriFacility;
      }),
    };
  }

  private parseWater(records: unknown[], params: Record<string, unknown>): EpaWaterSystemsOutput {
    return {
      total: records.length,
      state: String(params.state ?? '').toUpperCase(),
      results: records.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          pwsid: String(rec.pwsid ?? ''),
          name: String(rec.pws_name ?? ''),
          activity_code: String(rec.pws_activity_code ?? ''),
          primacy_agency: String(rec.primacy_agency_code ?? ''),
          epa_region: String(rec.epa_region ?? ''),
          population_served:
            rec.population_served_count != null ? Number(rec.population_served_count) : null,
          service_connections:
            rec.number_of_service_connections != null
              ? Number(rec.number_of_service_connections)
              : null,
          source_type: String(rec.source_type_code ?? ''),
        } as WaterSystem;
      }),
    };
  }
}
