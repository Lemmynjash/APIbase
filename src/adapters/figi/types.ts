// ---------------------------------------------------------------------------
// Normalized output types (what agents receive)
// ---------------------------------------------------------------------------

export interface FigiInstrument {
  figi: string;
  name: string;
  ticker: string;
  exchange_code: string;
  market_sector: string;
  security_type: string;
  composite_figi: string;
  share_class_figi: string;
}

export interface FigiMapOutput {
  results: FigiInstrument[];
  total: number;
}

export interface FigiSearchOutput {
  results: FigiInstrument[];
  total: number;
}

export interface FigiFilterOutput {
  results: FigiInstrument[];
  total: number;
}
