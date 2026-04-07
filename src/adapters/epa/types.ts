// ---------------------------------------------------------------------------
// Normalized output types (what agents receive)
// ---------------------------------------------------------------------------

export interface TriFacility {
  facility_id: string;
  facility_name: string;
  street_address: string;
  city: string;
  state: string;
  county: string;
  zip_code: string;
  region: string;
  industry_sector: string;
  is_closed: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface EpaToxicReleasesOutput {
  total: number;
  state: string;
  results: TriFacility[];
}

export interface WaterSystem {
  pwsid: string;
  name: string;
  activity_code: string;
  primacy_agency: string;
  epa_region: string;
  population_served: number | null;
  service_connections: number | null;
  source_type: string;
}

export interface EpaWaterSystemsOutput {
  total: number;
  state: string;
  results: WaterSystem[];
}
