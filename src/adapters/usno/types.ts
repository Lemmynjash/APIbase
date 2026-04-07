// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface MoonPhase {
  phase: string;
  date: string;
  time: string;
}

export interface UsnoMoonPhasesOutput {
  year: number;
  total: number;
  phases: MoonPhase[];
}

export interface SunMoonEvent {
  phenomenon: string;
  time: string;
}

export interface UsnoSunMoonOutput {
  date: string;
  latitude: number;
  longitude: number;
  sun: SunMoonEvent[];
  moon: SunMoonEvent[];
  moon_phase: string;
}

export interface SeasonEvent {
  season: string;
  date: string;
  time: string;
}

export interface UsnoSeasonsOutput {
  year: number;
  events: SeasonEvent[];
}
