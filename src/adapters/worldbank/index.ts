import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { WbIndicatorsOutput, WbIndicatorResult } from './types';

const WB_BASE = 'https://api.worldbank.org/v2';

/**
 * World Bank Indicators adapter (UC-372).
 *
 * 16,000+ global development indicators — GDP, population, poverty, education, health.
 * CC BY 4.0, no auth, unlimited.
 */
export class WorldBankAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'worldbank', baseUrl: WB_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'worldbank.indicators': {
        const qp = new URLSearchParams();
        qp.set('format', 'json');
        qp.set('per_page', String(Math.min(Number(params.limit) || 20, 50)));
        if (params.keyword) qp.set('keyword', String(params.keyword));
        if (params.topic) qp.set('topic', String(params.topic));
        if (params.source) qp.set('source', String(params.source));
        return { url: `${WB_BASE}/indicator?${qp.toString()}`, method: 'GET', headers };
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
      case 'worldbank.indicators':
        return this.parseIndicators(body);
      default:
        return body;
    }
  }

  private parseIndicators(body: unknown): WbIndicatorsOutput {
    if (!Array.isArray(body) || body.length < 2) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `World Bank returned unexpected format: ${JSON.stringify(body).slice(0, 200)}`,
        provider: this.provider,
        durationMs: 0,
      };
    }

    const meta = body[0] as Record<string, unknown>;
    const data = (body[1] ?? []) as Array<Record<string, unknown>>;

    return {
      total: Number(meta.total ?? 0),
      page: Number(meta.page ?? 1),
      pages: Number(meta.pages ?? 1),
      results: data.map(
        (d): WbIndicatorResult => ({
          id: String(d.id ?? ''),
          name: String(d.name ?? ''),
          source: String((d.source as Record<string, string>)?.value ?? ''),
          source_note: String(d.sourceNote ?? '').slice(0, 300),
          topics: ((d.topics ?? []) as Array<Record<string, string>>)
            .map((t) => t.value)
            .filter(Boolean)
            .slice(0, 5),
        }),
      ),
    };
  }
}
