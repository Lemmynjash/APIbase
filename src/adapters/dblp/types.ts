// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface DblpPaperResult {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  doi: string;
  url: string;
}

export interface DblpSearchOutput {
  total: number;
  results: DblpPaperResult[];
}

export interface DblpAuthorResult {
  name: string;
  pid: string;
  url: string;
  aliases: string[];
  affiliations: string[];
}

export interface DblpAuthorOutput {
  total: number;
  results: DblpAuthorResult[];
}
