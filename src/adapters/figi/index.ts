import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { FigiInstrument, FigiMapOutput, FigiSearchOutput, FigiFilterOutput } from './types';

const FIGI_BASE = 'https://api.openfigi.com/v3';

/**
 * OpenFIGI adapter (UC-357).
 *
 * Bloomberg Financial Instrument Global Identifier — ISO 18774.
 * 300M+ instruments, 45K+ exchanges. POST-based API.
 * Optional API key increases rate limits.
 */
export class FigiAdapter extends BaseAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({ provider: 'figi', baseUrl: FIGI_BASE });
    this.apiKey = apiKey;
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['X-OPENFIGI-APIKEY'] = this.apiKey;
    }

    switch (req.toolId) {
      case 'figi.map': {
        const mapping: Record<string, unknown> = {
          idType: String(params.id_type),
          idValue: String(params.id_value),
        };
        if (params.exchange_code) mapping.exchCode = String(params.exchange_code);
        return {
          url: `${FIGI_BASE}/mapping`,
          method: 'POST',
          headers,
          body: JSON.stringify([mapping]),
        };
      }

      case 'figi.search': {
        const search: Record<string, unknown> = {
          query: String(params.query),
        };
        if (params.exchange_code) search.exchCode = String(params.exchange_code);
        if (params.security_type) search.securityType = String(params.security_type);
        return {
          url: `${FIGI_BASE}/search`,
          method: 'POST',
          headers,
          body: JSON.stringify(search),
        };
      }

      case 'figi.filter': {
        const filter: Record<string, unknown> = {};
        if (params.exchange_code) filter.exchCode = String(params.exchange_code);
        if (params.market_sector) filter.marketSector = String(params.market_sector);
        if (params.security_type) filter.securityType = String(params.security_type);
        return {
          url: `${FIGI_BASE}/filter`,
          method: 'POST',
          headers,
          body: JSON.stringify(filter),
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

    switch (req.toolId) {
      case 'figi.map':
        return this.parseMap(body);
      case 'figi.search':
        return this.parseSearch(body as Record<string, unknown>);
      case 'figi.filter':
        return this.parseFilter(body as Record<string, unknown>);
      default:
        return body;
    }
  }

  private parseMap(body: unknown): FigiMapOutput {
    // /mapping returns array of { data: [...] } or { error: "..." }
    const results = Array.isArray(body) ? body : [];
    const instruments: FigiInstrument[] = [];

    for (const r of results) {
      const rec = r as Record<string, unknown>;
      const data = (rec.data ?? []) as Record<string, unknown>[];
      for (const item of data.slice(0, 10)) {
        instruments.push(this.toInstrument(item));
      }
    }

    return { results: instruments, total: instruments.length };
  }

  private parseSearch(body: Record<string, unknown>): FigiSearchOutput {
    const data = (body.data ?? []) as Record<string, unknown>[];
    return {
      results: data.slice(0, 20).map((item) => this.toInstrument(item)),
      total: data.length,
    };
  }

  private parseFilter(body: Record<string, unknown>): FigiFilterOutput {
    const data = (body.data ?? []) as Record<string, unknown>[];
    return {
      results: data.slice(0, 20).map((item) => this.toInstrument(item)),
      total: Number(body.total ?? data.length),
    };
  }

  private toInstrument(item: Record<string, unknown>): FigiInstrument {
    return {
      figi: String(item.figi ?? ''),
      name: String(item.name ?? ''),
      ticker: String(item.ticker ?? ''),
      exchange_code: String(item.exchCode ?? ''),
      market_sector: String(item.marketSector ?? ''),
      security_type: String(item.securityType ?? item.securityType2 ?? ''),
      composite_figi: String(item.compositeFIGI ?? ''),
      share_class_figi: String(item.shareClassFIGI ?? ''),
    };
  }
}
