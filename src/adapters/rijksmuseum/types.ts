// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface RijksSearchResult {
  id: string;
  url: string;
}

export interface RijksSearchOutput {
  total: number;
  results: RijksSearchResult[];
}

export interface RijksArtworkDetails {
  id: string;
  url: string;
  title: string;
  alt_titles: string[];
  object_number: string;
  type: string;
  creation_date: string;
  produced_at: string;
  materials: string[];
  dimensions: string;
  current_location: string;
}
