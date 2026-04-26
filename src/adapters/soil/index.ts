import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { SdaTabularResponse } from './types';

/**
 * USDA Soil Data Access adapter (UC-386).
 *
 * Supported tools:
 *   soil.properties → POST /Tabular/SDMTabularService/post.rest with SOIL SQL
 *
 * Auth: none — US Government open data (NRCS), unlimited free access.
 * Coverage: SSURGO survey, US continental + Hawaii + Alaska + territories.
 * Out-of-coverage points (international, water bodies, urban no-survey)
 * return an empty `components` array — adapter does not throw, just empty.
 */
export class SoilAdapter extends BaseAdapter {
  constructor() {
    super({
      provider: 'soil',
      baseUrl: 'https://sdmdataaccess.nrcs.usda.gov',
      timeoutMs: 15000,
    });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  } {
    const params = req.params as Record<string, unknown>;

    if (req.toolId !== 'soil.properties') {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `Unsupported tool: ${req.toolId}`,
        provider: this.provider,
        toolId: req.toolId,
        durationMs: 0,
      };
    }

    const lat = Number(params.lat);
    const lon = Number(params.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 400,
        message: 'lat and lon must be finite numbers (WGS84 decimal degrees)',
        provider: this.provider,
        toolId: req.toolId,
        durationMs: 0,
      };
    }

    // SDA SOIL SQL — get the dominant component(s) at the point + their full horizon profile.
    // SDA_Get_Mukey_from_intersection_with_WktWgs84 returns map unit keys for the point.
    // Joining mapunit → component → chorizon yields drainage, taxonomy, pH, organic matter,
    // and sand/silt/clay percentages per horizon (depth-stratified).
    const point = `POINT(${lon} ${lat})`;
    const sql = `
      SELECT TOP 50
        mu.mukey, mu.muname, mu.musym,
        co.compname, co.comppct_r, co.drainagecl, co.taxclname,
        ch.hzname, ch.hzdept_r, ch.hzdepb_r,
        ch.ph1to1h2o_r, ch.om_r,
        ch.sandtotal_r, ch.silttotal_r, ch.claytotal_r
      FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${point}') AS spatial
      JOIN mapunit mu ON mu.mukey = spatial.mukey
      LEFT JOIN component co ON co.mukey = mu.mukey AND co.majcompflag = 'Yes'
      LEFT JOIN chorizon ch ON ch.cokey = co.cokey
      ORDER BY co.comppct_r DESC, ch.hzdept_r ASC
    `.trim();

    return {
      url: `${this.baseUrl}/Tabular/SDMTabularService/post.rest`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ format: 'JSON', query: sql }),
    };
  }

  protected parseResponse(raw: ProviderRawResponse, req: ProviderRequest): unknown {
    const body = raw.body as SdaTabularResponse;
    const rows = body?.Table ?? [];
    const params = req.params as Record<string, unknown>;
    const lat = Number(params.lat);
    const lon = Number(params.lon);

    if (rows.length === 0) {
      return {
        location: { lat, lon },
        coverage: false,
        message:
          'No SSURGO soil data for this location. SDA covers US (continental, AK, HI, territories); international, water, and unsurveyed points return empty.',
        components: [],
      };
    }

    // Group rows by mukey + compname to flatten horizon arrays per component.
    const byComp = new Map<
      string,
      {
        mukey: string;
        map_unit_name: string;
        map_unit_symbol: string;
        component_name: string;
        component_pct: number | null;
        drainage_class: string | null;
        taxonomic_class: string | null;
        horizons: Array<{
          name: string | null;
          depth_top_cm: number | null;
          depth_bottom_cm: number | null;
          ph_h2o: number | null;
          organic_matter_pct: number | null;
          sand_pct: number | null;
          silt_pct: number | null;
          clay_pct: number | null;
        }>;
      }
    >();

    for (const r of rows) {
      const [
        mukey,
        muname,
        musym,
        compname,
        comppct,
        drainage,
        taxclass,
        hzname,
        hzdept,
        hzdepb,
        ph,
        om,
        sand,
        silt,
        clay,
      ] = r;
      const key = `${mukey}|${compname ?? '_'}`;
      let comp = byComp.get(key);
      if (!comp) {
        comp = {
          mukey,
          map_unit_name: muname,
          map_unit_symbol: musym,
          component_name: compname,
          component_pct: numOrNull(comppct),
          drainage_class: drainage || null,
          taxonomic_class: taxclass || null,
          horizons: [],
        };
        byComp.set(key, comp);
      }
      if (hzname || hzdept) {
        comp.horizons.push({
          name: hzname || null,
          depth_top_cm: numOrNull(hzdept),
          depth_bottom_cm: numOrNull(hzdepb),
          ph_h2o: numOrNull(ph),
          organic_matter_pct: numOrNull(om),
          sand_pct: numOrNull(sand),
          silt_pct: numOrNull(silt),
          clay_pct: numOrNull(clay),
        });
      }
    }

    return {
      location: { lat, lon },
      coverage: true,
      data_source: 'USDA NRCS SSURGO via Soil Data Access',
      components: Array.from(byComp.values()),
    };
  }
}

function numOrNull(v: string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
