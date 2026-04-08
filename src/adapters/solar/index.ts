import { BaseAdapter } from '../base.adapter';
import {
  type ProviderRequest,
  type ProviderRawResponse,
  ProviderErrorCode,
} from '../../types/provider';
import type { SolarBodiesOutput, SolarBodyDetailOutput, SolarBodySummary } from './types';

const SOLAR_BASE = 'https://api.le-systeme-solaire.net';

/**
 * Solar System OpenData adapter (UC-354).
 *
 * 1,400+ solar system bodies. MIT license. Bearer token auth (free).
 */
export class SolarAdapter extends BaseAdapter {
  private readonly token: string;

  constructor(token: string) {
    super({ provider: 'solar', baseUrl: SOLAR_BASE });
    this.token = token;
  }

  protected buildRequest(req: ProviderRequest): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    const params = req.params as Record<string, unknown>;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };

    switch (req.toolId) {
      case 'solar.bodies': {
        const bodyType = String(params.body_type || 'all');
        let filter = '';
        if (bodyType === 'planet') filter = '?filter[]=isPlanet,eq,true';
        else if (bodyType === 'moon') filter = '?filter[]=bodyType,eq,Moon';
        else if (bodyType === 'asteroid') filter = '?filter[]=bodyType,eq,Asteroid';
        else if (bodyType === 'comet') filter = '?filter[]=bodyType,eq,Comet';
        else if (bodyType === 'dwarf_planet') filter = '?filter[]=bodyType,eq,Dwarf Planet';
        return {
          url: `${SOLAR_BASE}/rest/bodies${filter}`,
          method: 'GET',
          headers,
        };
      }

      case 'solar.body_details': {
        const id = encodeURIComponent(String(params.id).toLowerCase());
        return {
          url: `${SOLAR_BASE}/rest/bodies/${id}`,
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
      case 'solar.bodies':
        return this.parseBodies(body);
      case 'solar.body_details':
        return this.parseBodyDetail(body);
      default:
        return body;
    }
  }

  private parseBodies(body: Record<string, unknown>): SolarBodiesOutput {
    const bodies = (body.bodies ?? []) as Record<string, unknown>[];
    return {
      total: bodies.length,
      results: bodies.slice(0, 50).map(
        (b): SolarBodySummary => ({
          id: String(b.id ?? ''),
          name: String(b.englishName ?? b.name ?? ''),
          body_type: String(b.bodyType ?? ''),
          is_planet: Boolean(b.isPlanet),
          gravity: b.gravity != null ? Number(b.gravity) : null,
          mean_radius_km: b.meanRadius != null ? Number(b.meanRadius) : null,
          moons_count: Array.isArray(b.moons) ? b.moons.length : 0,
        }),
      ),
    };
  }

  private parseBodyDetail(b: Record<string, unknown>): SolarBodyDetailOutput {
    const mass = (b.mass ?? {}) as Record<string, unknown>;
    const massStr =
      mass.massValue != null ? `${mass.massValue}e${mass.massExponent} kg` : 'unknown';
    const moons = (b.moons ?? []) as Record<string, unknown>[];

    return {
      id: String(b.id ?? ''),
      name: String(b.englishName ?? ''),
      body_type: String(b.bodyType ?? ''),
      is_planet: Boolean(b.isPlanet),
      mass_kg: massStr,
      mean_radius_km: b.meanRadius != null ? Number(b.meanRadius) : null,
      equa_radius_km: b.equaRadius != null ? Number(b.equaRadius) : null,
      polar_radius_km: b.polarRadius != null ? Number(b.polarRadius) : null,
      density_g_cm3: b.density != null ? Number(b.density) : null,
      gravity_m_s2: b.gravity != null ? Number(b.gravity) : null,
      escape_velocity_km_s: b.escape != null ? Number(b.escape) : null,
      avg_temp_k: b.avgTemp != null ? Number(b.avgTemp) : null,
      axial_tilt_deg: b.axialTilt != null ? Number(b.axialTilt) : null,
      rotation_period_hrs: b.sideralRotation != null ? Number(b.sideralRotation) : null,
      orbital_period_days: b.sideralOrbit != null ? Number(b.sideralOrbit) : null,
      semi_major_axis_km: b.semimajorAxis != null ? Number(b.semimajorAxis) : null,
      eccentricity: b.eccentricity != null ? Number(b.eccentricity) : null,
      inclination_deg: b.inclination != null ? Number(b.inclination) : null,
      discovered_by: String(b.discoveredBy ?? ''),
      discovery_date: String(b.discoveryDate ?? ''),
      moons: moons.map((m) => String(m.moon ?? '')),
    };
  }
}
