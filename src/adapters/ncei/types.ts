// ---------------------------------------------------------------------------
// Normalized output types (what agents receive)
// ---------------------------------------------------------------------------

export interface NceiStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  min_date: string;
  max_date: string;
  data_coverage: number;
}

export interface NceiStationsOutput {
  total: number;
  results: NceiStation[];
}

export interface NceiDataPoint {
  date: string;
  datatype: string;
  value: number;
  station: string;
  attributes: string;
}

export interface NceiDailyDataOutput {
  station: string;
  start_date: string;
  end_date: string;
  total: number;
  results: NceiDataPoint[];
}
