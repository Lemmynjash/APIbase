// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface CmaSearchResult {
  id: number;
  title: string;
  artist: string;
  date: string;
  type: string;
  department: string;
  license: string;
  image_url: string;
}

export interface CmaSearchOutput {
  total: number;
  results: CmaSearchResult[];
}

export interface CmaArtworkOutput {
  id: number;
  title: string;
  artist: string;
  artist_nationality: string;
  date: string;
  type: string;
  department: string;
  medium: string;
  dimensions: string;
  culture: string;
  license: string;
  image_url: string;
  image_full: string;
  url: string;
  provenance: string;
}
