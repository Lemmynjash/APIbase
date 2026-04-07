import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { NceiStationsOutput, NceiDailyDataOutput, NceiStation, NceiDataPoint } from './types';

const NCEI_BASE = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

/**
 * NOAA NCEI adapter (UC-343).
 *
 * Historical climate data — 260+ years, 100K+ global stations.
 * Auth: `token` header. 1K req/day. US Gov public domain.
 */
export class NceiAdapter extends BaseAdapter {
  private readonly token: string;

  constructor(token: string) {
    super({ provider: 'ncei', baseUrl: NCEI_BASE });
    this.token = token;
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = {
      token: this.token,
      Accept: 'application/json',
    };

    switch (req.toolId) {
      case 'ncei.stations': {
        const qp = new URLSearchParams();
        qp.set('locationid', String(params.location_id));
        qp.set('datasetid', 'GHCND');
        qp.set('limit', String(Math.min(Number(params.limit) || 10, 25)));
        return {
          url: `${NCEI_BASE}/stations?${qp.toString()}`,
          method: 'GET',
          headers,
        };
      }

      case 'ncei.daily_data': {
        const qp = new URLSearchParams();
        qp.set('datasetid', 'GHCND');
        qp.set('stationid', String(params.station_id));
        qp.set('startdate', String(params.start_date));
        qp.set('enddate', String(params.end_date));
        qp.set('limit', '100');
        if (params.datatypes) qp.set('datatypeid', String(params.datatypes));
        return {
          url: `${NCEI_BASE}/data?${qp.toString()}`,
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
    const body = raw.body as Record<string, unknown>;
    const results = (body.results ?? []) as Record<string, unknown>[];
    const meta = ((body.metadata ?? {}) as Record<string, unknown>).resultset as
      | Record<string, unknown>
      | undefined;

    switch (req.toolId) {
      case 'ncei.stations':
        return this.parseStations(results, meta);
      case 'ncei.daily_data':
        return this.parseDailyData(results, meta, req.params as Record<string, unknown>);
      default:
        return body;
    }
  }

  private parseStations(
    results: Record<string, unknown>[],
    meta: Record<string, unknown> | undefined,
  ): NceiStationsOutput {
    return {
      total: Number(meta?.count ?? results.length),
      results: results.map(
        (r): NceiStation => ({
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          latitude: Number(r.latitude ?? 0),
          longitude: Number(r.longitude ?? 0),
          elevation: r.elevation != null ? Number(r.elevation) : null,
          min_date: String(r.mindate ?? ''),
          max_date: String(r.maxdate ?? ''),
          data_coverage: Number(r.datacoverage ?? 0),
        }),
      ),
    };
  }

  private parseDailyData(
    results: Record<string, unknown>[],
    meta: Record<string, unknown> | undefined,
    params: Record<string, unknown>,
  ): NceiDailyDataOutput {
    return {
      station: String(params.station_id),
      start_date: String(params.start_date),
      end_date: String(params.end_date),
      total: Number(meta?.count ?? results.length),
      results: results.map(
        (r): NceiDataPoint => ({
          date: String(r.date ?? '').slice(0, 10),
          datatype: String(r.datatype ?? ''),
          value: Number(r.value ?? 0),
          station: String(r.station ?? ''),
          attributes: String(r.attributes ?? ''),
        }),
      ),
    };
  }
}
