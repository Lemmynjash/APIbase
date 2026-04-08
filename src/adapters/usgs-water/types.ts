// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface WaterSiteResult {
  site_no: string;
  station_name: string;
  site_type: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  huc_code: string;
  state_cd: string;
}

export interface WaterSitesOutput {
  total: number;
  results: WaterSiteResult[];
}

export interface WaterReading {
  parameter: string;
  unit: string;
  value: number | null;
  datetime: string;
  qualifier: string;
}

export interface WaterRealtimeOutput {
  site_no: string;
  station_name: string;
  readings: WaterReading[];
}
