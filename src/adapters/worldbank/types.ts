// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface WbIndicatorResult {
  id: string;
  name: string;
  source: string;
  source_note: string;
  topics: string[];
}

export interface WbIndicatorsOutput {
  total: number;
  page: number;
  pages: number;
  results: WbIndicatorResult[];
}
