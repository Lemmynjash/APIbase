// ---------------------------------------------------------------------------
// Normalized output types (what agents receive)
// ---------------------------------------------------------------------------

export interface ClimateRecord {
  date: string;
  value: number;
}

export interface ClimateIndicatorOutput {
  indicator: string;
  unit: string;
  source: string;
  latest_value: number;
  latest_date: string;
  total_records: number;
  returned_records: number;
  records: ClimateRecord[];
}
