import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { WaterSitesOutput, WaterSiteResult, WaterRealtimeOutput, WaterReading } from './types';

const WATER_BASE = 'https://waterservices.usgs.gov/nwis';

/**
 * USGS Water Services adapter (UC-369).
 *
 * Real-time streamflow, water levels, temperature from 1.5M+ US monitoring sites.
 * US Gov public domain, no auth, unlimited.
 */
export class UsgsWaterAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'usgs-water', baseUrl: WATER_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'text/plain' };

    switch (req.toolId) {
      case 'water.sites': {
        const qp = new URLSearchParams();
        qp.set('format', 'rdb');
        qp.set('siteStatus', 'active');
        qp.set('hasDataTypeCd', 'iv');
        qp.set('siteType', 'ST');
        if (params.state) qp.set('stateCd', String(params.state));
        if (params.county) qp.set('countyCd', String(params.county));
        if (params.bbox) qp.set('bBox', String(params.bbox));
        if (params.site_no) qp.set('sites', String(params.site_no));
        return { url: `${WATER_BASE}/site/?${qp.toString()}`, method: 'GET', headers };
      }

      case 'water.realtime': {
        const qp = new URLSearchParams();
        qp.set('format', 'json');
        qp.set('sites', String(params.site_no));
        qp.set('period', String(params.period || 'PT2H'));
        if (params.parameter_cd) qp.set('parameterCd', String(params.parameter_cd));
        headers.Accept = 'application/json';
        return { url: `${WATER_BASE}/iv/?${qp.toString()}`, method: 'GET', headers };
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

    switch (req.toolId) {
      case 'water.sites':
        return this.parseSitesRdb(typeof body === 'string' ? body : String(body));
      case 'water.realtime':
        return this.parseRealtime(body as Record<string, unknown>);
      default:
        return body;
    }
  }

  private parseSitesRdb(rdb: string): WaterSitesOutput {
    const lines = rdb.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('5s'));
    // First non-comment line is header
    const headerLine = lines.find((l) => l.startsWith('agency_cd'));
    if (!headerLine) {
      return { total: 0, results: [] };
    }
    const headers = headerLine.split('\t');
    const dataLines = lines.filter((l) => !l.startsWith('agency_cd'));

    const idx = (name: string) => headers.indexOf(name);
    const results: WaterSiteResult[] = dataLines.slice(0, 50).map((line) => {
      const cols = line.split('\t');
      return {
        site_no: cols[idx('site_no')] ?? '',
        station_name: cols[idx('station_nm')] ?? '',
        site_type: cols[idx('site_tp_cd')] ?? '',
        latitude: parseFloat(cols[idx('dec_lat_va')]) || 0,
        longitude: parseFloat(cols[idx('dec_long_va')]) || 0,
        altitude: parseFloat(cols[idx('alt_va')]) || null,
        huc_code: cols[idx('huc_cd')] ?? '',
        state_cd: (cols[idx('state_cd')] ?? '').trim(),
      };
    });

    return { total: results.length, results };
  }

  private parseRealtime(body: Record<string, unknown>): WaterRealtimeOutput {
    const value = body.value as Record<string, unknown> | undefined;
    if (!value || !Array.isArray(value.timeSeries)) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `USGS returned unexpected format: ${JSON.stringify(body).slice(0, 200)}`,
        provider: this.provider,
        durationMs: 0,
      };
    }

    const series = value.timeSeries as Array<Record<string, unknown>>;
    const first = series[0];
    const sourceInfo = (first?.sourceInfo ?? {}) as Record<string, unknown>;
    const siteCodes = (sourceInfo.siteCode ?? []) as Array<Record<string, string>>;
    const siteNo = siteCodes[0]?.value ?? '';
    const stationName = String(sourceInfo.siteName ?? '');

    const readings: WaterReading[] = series.map((s) => {
      const variable = s.variable as Record<string, unknown>;
      const variableName = String(variable?.variableName ?? '');
      const unit = (variable?.unit as Record<string, string>)?.unitCode ?? '';
      const vals = ((s.values as Array<Record<string, unknown>>)?.[0]?.value ?? []) as Array<
        Record<string, string>
      >;
      const latest = vals[vals.length - 1];
      return {
        parameter: variableName,
        unit,
        value: latest ? parseFloat(latest.value) || null : null,
        datetime: latest?.dateTime ?? '',
        qualifier: latest?.qualifiers?.[0] ?? '',
      };
    });

    return { site_no: siteNo, station_name: stationName, readings };
  }
}
