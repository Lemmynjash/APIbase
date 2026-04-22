import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type {
  SmithsonianSearchResponse,
  SmithsonianContentResponse,
  SmithsonianRow,
} from './types';

/**
 * Smithsonian Institution Open Access adapter (UC-382).
 *
 * Supported tools:
 *   smithsonian.search → GET /openaccess/api/v1.0/search
 *   smithsonian.record → GET /openaccess/api/v1.0/content/{id}
 *
 * Auth: query param api_key=KEY (obtained from api.data.gov).
 * Free tier: 1,000 req/hour (shared api.data.gov limit).
 * Data: 11M+ records from 19 Smithsonian museums. Mixed licensing —
 * by default this adapter filters to CC0-licensed records only.
 */
export class SmithsonianAdapter extends BaseAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({
      provider: 'smithsonian',
      baseUrl: 'https://api.si.edu/openaccess/api/v1.0',
    });
    this.apiKey = apiKey;
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'smithsonian.search':
        return this.buildSearchRequest(params, headers);
      case 'smithsonian.record':
        return this.buildRecordRequest(params, headers);
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
      case 'smithsonian.search': {
        const data = body as SmithsonianSearchResponse;
        if (!data.response || !Array.isArray(data.response.rows)) {
          throw new Error('Invalid /search response: missing response.rows');
        }
        const params = req.params as Record<string, unknown>;
        const cc0Only = params.cc0_only !== false; // default true
        const rows = cc0Only ? data.response.rows.filter(isCc0) : data.response.rows;
        return {
          total_matches: data.response.rowCount,
          returned: rows.length,
          cc0_filter: cc0Only,
          results: rows.map(summarize),
        };
      }
      case 'smithsonian.record': {
        const data = body as SmithsonianContentResponse;
        if (!data.response || !data.response.id) {
          throw new Error('Invalid /content response: missing response.id');
        }
        const row = data.response;
        const cc0 = isCc0(row);
        return {
          id: row.id,
          title: row.title,
          unit_code: row.unitCode,
          type: row.type,
          record_link: row.content?.descriptiveNonRepeating?.record_link,
          data_source: row.content?.descriptiveNonRepeating?.data_source,
          license: row.content?.descriptiveNonRepeating?.metadata_usage?.access ?? 'Unknown',
          is_cc0: cc0,
          online_media: row.content?.descriptiveNonRepeating?.online_media?.media ?? [],
          freetext: row.content?.freetext,
          indexed_structured: row.content?.indexedStructured,
          last_updated: row.lastTimeUpdated,
        };
      }
      default:
        return body;
    }
  }

  // ---------------------------------------------------------------------------
  // Request builders
  // ---------------------------------------------------------------------------

  private buildSearchRequest(
    params: Record<string, unknown>,
    headers: Record<string, string>,
  ): { url: string; method: string; headers: Record<string, string> } {
    const qs = new URLSearchParams();
    qs.set('api_key', this.apiKey);
    const q = String(params.q ?? '');
    qs.set('q', q);
    if (params.rows !== undefined) qs.set('rows', String(params.rows));
    if (params.start !== undefined) qs.set('start', String(params.start));
    if (params.sort) qs.set('sort', String(params.sort));
    if (params.type) qs.set('type', String(params.type));
    if (params.online_media_type) qs.set('online_media_type', String(params.online_media_type));

    return {
      url: `${this.baseUrl}/search?${qs.toString()}`,
      method: 'GET',
      headers,
    };
  }

  private buildRecordRequest(
    params: Record<string, unknown>,
    headers: Record<string, string>,
  ): { url: string; method: string; headers: Record<string, string> } {
    const id = encodeURIComponent(String(params.id ?? ''));
    const qs = new URLSearchParams();
    qs.set('api_key', this.apiKey);

    return {
      url: `${this.baseUrl}/content/${id}?${qs.toString()}`,
      method: 'GET',
      headers,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCc0(row: SmithsonianRow): boolean {
  const access = row.content?.descriptiveNonRepeating?.metadata_usage?.access;
  return access === 'CC0';
}

function summarize(row: SmithsonianRow): Record<string, unknown> {
  const dn = row.content?.descriptiveNonRepeating;
  return {
    id: row.id,
    title: row.title,
    unit_code: row.unitCode,
    type: row.type,
    url: row.url,
    record_link: dn?.record_link,
    data_source: dn?.data_source,
    license: dn?.metadata_usage?.access ?? 'Unknown',
    has_media: Boolean(dn?.online_media?.mediaCount && Number(dn.online_media.mediaCount) > 0),
    last_updated: row.lastTimeUpdated,
  };
}
