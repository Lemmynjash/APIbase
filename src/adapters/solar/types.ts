// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface SolarBodySummary {
  id: string;
  name: string;
  body_type: string;
  is_planet: boolean;
  gravity: number | null;
  mean_radius_km: number | null;
  moons_count: number;
}

export interface SolarBodiesOutput {
  total: number;
  results: SolarBodySummary[];
}

export interface SolarBodyDetailOutput {
  id: string;
  name: string;
  body_type: string;
  is_planet: boolean;
  mass_kg: string;
  mean_radius_km: number | null;
  equa_radius_km: number | null;
  polar_radius_km: number | null;
  density_g_cm3: number | null;
  gravity_m_s2: number | null;
  escape_velocity_km_s: number | null;
  avg_temp_k: number | null;
  axial_tilt_deg: number | null;
  rotation_period_hrs: number | null;
  orbital_period_days: number | null;
  semi_major_axis_km: number | null;
  eccentricity: number | null;
  inclination_deg: number | null;
  discovered_by: string;
  discovery_date: string;
  moons: string[];
}
