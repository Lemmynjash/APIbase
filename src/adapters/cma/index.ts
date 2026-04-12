import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { CmaSearchOutput, CmaSearchResult, CmaArtworkOutput } from './types';

const CMA_BASE = 'https://openaccess-api.clevelandart.org/api';

/**
 * Cleveland Museum of Art adapter (UC-381).
 *
 * 64K+ artworks, 37K+ CC0 images. No auth, unlimited.
 */
export class CmaAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'cma', baseUrl: CMA_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'cma.search': {
        const qp = new URLSearchParams();
        if (params.query) qp.set('q', String(params.query));
        if (params.type) qp.set('type', String(params.type));
        if (params.department) qp.set('department', String(params.department));
        if (params.artist) qp.set('artists', String(params.artist));
        if (params.has_image !== false) qp.set('has_image', '1');
        if (params.cc0_only) qp.set('cc0', '1');
        qp.set('limit', String(Math.min(Number(params.limit) || 20, 50)));
        return { url: `${CMA_BASE}/artworks/?${qp.toString()}`, method: 'GET', headers };
      }

      case 'cma.artwork': {
        const artworkId = Number(params.artwork_id);
        if (!Number.isInteger(artworkId) || artworkId <= 0) {
          throw {
            code: ProviderErrorCode.INVALID_RESPONSE,
            httpStatus: 400,
            message: `Invalid artwork_id: must be a positive integer`,
            provider: this.provider,
            toolId: req.toolId,
            durationMs: 0,
          };
        }
        return { url: `${CMA_BASE}/artworks/${artworkId}`, method: 'GET', headers };
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

    switch (req.toolId) {
      case 'cma.search':
        return this.parseSearch(body);
      case 'cma.artwork':
        return this.parseArtwork((body.data ?? body) as Record<string, unknown>);
      default:
        return body;
    }
  }

  private parseSearch(body: Record<string, unknown>): CmaSearchOutput {
    const info = (body.info ?? {}) as Record<string, unknown>;
    const data = (body.data ?? []) as Array<Record<string, unknown>>;

    return {
      total: Number(info.total ?? 0),
      results: data.map((d): CmaSearchResult => {
        const creators = (d.creators ?? []) as Array<Record<string, string>>;
        const images = (d.images ?? {}) as Record<string, Record<string, string>>;
        return {
          id: Number(d.id ?? 0),
          title: String(d.title ?? ''),
          artist: creators[0]?.description ?? '',
          date: String(d.creation_date ?? ''),
          type: String(d.type ?? ''),
          department: String(d.department ?? ''),
          license: String(d.share_license_status ?? ''),
          image_url: images?.web?.url ?? '',
        };
      }),
    };
  }

  private parseArtwork(d: Record<string, unknown>): CmaArtworkOutput {
    if (!d.id) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `Cleveland Museum returned empty object`,
        provider: this.provider,
        durationMs: 0,
      };
    }

    const creators = (d.creators ?? []) as Array<Record<string, string>>;
    const images = (d.images ?? {}) as Record<string, Record<string, string>>;
    const dims = (d.dimensions ?? {}) as Record<string, Record<string, string>>;

    return {
      id: Number(d.id ?? 0),
      title: String(d.title ?? ''),
      artist: creators[0]?.description ?? '',
      artist_nationality: creators[0]?.nationality ?? '',
      date: String(d.creation_date ?? ''),
      type: String(d.type ?? ''),
      department: String(d.department ?? ''),
      medium: String(d.technique ?? ''),
      dimensions: dims?.framed?.description ?? dims?.overall?.description ?? '',
      culture: String(((d.culture ?? []) as string[])[0] ?? ''),
      license: String(d.share_license_status ?? ''),
      image_url: images?.web?.url ?? '',
      image_full: images?.full?.url ?? '',
      url: String(d.url ?? ''),
      provenance: String(
        ((d.provenance ?? []) as Array<Record<string, string>>)[0]?.description ?? '',
      ).slice(0, 300),
    };
  }
}
