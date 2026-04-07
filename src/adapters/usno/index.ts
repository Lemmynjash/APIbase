import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type {
  UsnoMoonPhasesOutput,
  UsnoSunMoonOutput,
  UsnoSeasonsOutput,
  MoonPhase,
  SunMoonEvent,
  SeasonEvent,
} from './types';

const USNO_BASE = 'https://aa.usno.navy.mil';

/**
 * USNO adapter (UC-353).
 *
 * US Naval Observatory — moon phases, sun/moon rise/set, seasons.
 * No auth, unlimited, US Gov public domain. Canonical astronomical data.
 */
export class UsnoAdapter extends BaseAdapter {
  constructor() {
    super({ provider: 'usno', baseUrl: USNO_BASE });
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = { Accept: 'application/json' };

    switch (req.toolId) {
      case 'usno.moon_phases': {
        const year = Number(params.year) || new Date().getFullYear();
        return {
          url: `${USNO_BASE}/api/moon/phases/year?year=${year}`,
          method: 'GET',
          headers,
        };
      }

      case 'usno.sun_moon': {
        const date = encodeURIComponent(String(params.date));
        const lat = Number(params.latitude);
        const lon = Number(params.longitude);
        return {
          url: `${USNO_BASE}/api/rstt/oneday?date=${date}&coords=${lat},${lon}`,
          method: 'GET',
          headers,
        };
      }

      case 'usno.seasons': {
        const year = Number(params.year) || new Date().getFullYear();
        return {
          url: `${USNO_BASE}/api/seasons?year=${year}`,
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

    switch (req.toolId) {
      case 'usno.moon_phases':
        return this.parseMoonPhases(body);
      case 'usno.sun_moon':
        return this.parseSunMoon(body, req.params as Record<string, unknown>);
      case 'usno.seasons':
        return this.parseSeasons(body);
      default:
        return body;
    }
  }

  private parseMoonPhases(body: Record<string, unknown>): UsnoMoonPhasesOutput {
    const phasedata = (body.phasedata ?? []) as Record<string, unknown>[];
    return {
      year: Number(body.year ?? new Date().getFullYear()),
      total: phasedata.length,
      phases: phasedata.map(
        (p): MoonPhase => ({
          phase: String(p.phase ?? ''),
          date: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
          time: String(p.time ?? ''),
        }),
      ),
    };
  }

  private parseSunMoon(
    body: Record<string, unknown>,
    params: Record<string, unknown>,
  ): UsnoSunMoonOutput {
    const props = (body.properties ?? {}) as Record<string, unknown>;
    const data = (props.data ?? {}) as Record<string, unknown>;
    const sundata = (data.sundata ?? []) as Record<string, unknown>[];
    const moondata = (data.moondata ?? []) as Record<string, unknown>[];

    return {
      date: String(params.date),
      latitude: Number(params.latitude),
      longitude: Number(params.longitude),
      sun: sundata.map(
        (s): SunMoonEvent => ({
          phenomenon: String(s.phen ?? ''),
          time: String(s.time ?? ''),
        }),
      ),
      moon: moondata.map(
        (m): SunMoonEvent => ({
          phenomenon: String(m.phen ?? ''),
          time: String(m.time ?? ''),
        }),
      ),
      moon_phase: String(
        data.curphase ?? (data.closestphase as Record<string, unknown>)?.phase ?? '',
      ),
    };
  }

  private parseSeasons(body: Record<string, unknown>): UsnoSeasonsOutput {
    const data = (body.data ?? []) as Record<string, unknown>[];
    return {
      year: Number(body.year ?? new Date().getFullYear()),
      events: data.map(
        (s): SeasonEvent => ({
          season: String(s.season ?? s.phenom ?? ''),
          date: `${body.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
          time: String(s.time ?? ''),
        }),
      ),
    };
  }
}
