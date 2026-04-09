import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type {
  DblpSearchOutput,
  DblpPaperResult,
  DblpAuthorOutput,
  DblpAuthorResult,
} from './types';

const DBLP_BASE = 'https://dblp.org';

/**
 * DBLP adapter (UC-370).
 *
 * Largest CS bibliography — 7M+ publications, 3M+ authors.
 * CC0 public domain, no auth, unlimited.
 */
export class DblpAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'dblp', baseUrl: DBLP_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'dblp.search': {
        const qp = new URLSearchParams();
        qp.set('q', String(params.query));
        qp.set('format', 'json');
        qp.set('h', String(Math.min(Number(params.limit) || 20, 50)));
        if (params.year) qp.set('q', `${String(params.query)} year:${String(params.year)}`);
        return { url: `${DBLP_BASE}/search/publ/api?${qp.toString()}`, method: 'GET', headers };
      }

      case 'dblp.author': {
        const qp = new URLSearchParams();
        qp.set('q', String(params.query));
        qp.set('format', 'json');
        qp.set('h', String(Math.min(Number(params.limit) || 10, 30)));
        return { url: `${DBLP_BASE}/search/author/api?${qp.toString()}`, method: 'GET', headers };
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
    const result = body.result as Record<string, unknown> | undefined;

    if (!result) {
      throw {
        code: ProviderErrorCode.INVALID_RESPONSE,
        httpStatus: 502,
        message: `DBLP returned unexpected format: ${JSON.stringify(body).slice(0, 200)}`,
        provider: this.provider,
        durationMs: 0,
      };
    }

    switch (req.toolId) {
      case 'dblp.search':
        return this.parsePapers(result);
      case 'dblp.author':
        return this.parseAuthors(result);
      default:
        return body;
    }
  }

  private parsePapers(result: Record<string, unknown>): DblpSearchOutput {
    const hits = result.hits as Record<string, unknown> | undefined;
    const total = Number(hits?.['@total'] ?? 0);
    const hitList = (hits?.hit ?? []) as Array<Record<string, unknown>>;

    return {
      total,
      results: hitList.map((h): DblpPaperResult => {
        const info = (h.info ?? {}) as Record<string, unknown>;
        const authors = this.extractAuthors(info.authors);
        return {
          title: String(info.title ?? ''),
          authors,
          venue: String(info.venue ?? ''),
          year: Number(info.year ?? 0),
          type: String(info.type ?? ''),
          doi: String(info.doi ?? ''),
          url: String(info.url ?? ''),
        };
      }),
    };
  }

  private parseAuthors(result: Record<string, unknown>): DblpAuthorOutput {
    const hits = result.hits as Record<string, unknown> | undefined;
    const total = Number(hits?.['@total'] ?? 0);
    const hitList = (hits?.hit ?? []) as Array<Record<string, unknown>>;

    return {
      total,
      results: hitList.map((h): DblpAuthorResult => {
        const info = (h.info ?? {}) as Record<string, unknown>;
        const aliases = ((info.aliases as Record<string, unknown>)?.alias ?? []) as string[];
        const notes = info.notes as Record<string, unknown> | undefined;
        const noteList = Array.isArray(notes?.note)
          ? (notes.note as Array<Record<string, string>>)
          : notes?.note
            ? [notes.note as Record<string, string>]
            : [];
        const affiliations = noteList
          .filter((n) => n['@type'] === 'affiliation')
          .map((n) => n.text)
          .filter(Boolean);

        return {
          name: String(info.author ?? ''),
          pid: String(h['@id'] ?? ''),
          url: String(info.url ?? ''),
          aliases: Array.isArray(aliases) ? aliases.slice(0, 5) : [String(aliases)],
          affiliations: affiliations.slice(0, 3),
        };
      }),
    };
  }

  private extractAuthors(authors: unknown): string[] {
    if (!authors) return [];
    const authObj = authors as Record<string, unknown>;
    const authorList = authObj.author;
    if (Array.isArray(authorList)) {
      return authorList
        .map((a) => (typeof a === 'string' ? a : String((a as Record<string, string>).text ?? '')))
        .filter(Boolean)
        .slice(0, 10);
    }
    if (typeof authorList === 'object' && authorList !== null) {
      return [String((authorList as Record<string, string>).text ?? '')].filter(Boolean);
    }
    if (typeof authorList === 'string') return [authorList];
    return [];
  }
}
