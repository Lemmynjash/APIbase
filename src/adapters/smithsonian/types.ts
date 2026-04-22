/**
 * Smithsonian Institution Open Access API raw response types.
 *
 * Docs: https://edan.si.edu/openaccess/apidocs/
 * Endpoints: https://api.si.edu/openaccess/api/v1.0/
 */

export interface SmithsonianSearchResponse {
  status: number;
  responseCode?: number;
  response: {
    rowCount: number;
    rows: SmithsonianRow[];
    message?: string;
  };
}

export interface SmithsonianContentResponse {
  status: number;
  responseCode?: number;
  response: SmithsonianRow;
}

export interface SmithsonianRow {
  id: string;
  title: string;
  unitCode: string;
  type: string;
  url: string;
  content: {
    descriptiveNonRepeating?: {
      title?: { label?: string; content?: string } | string;
      record_ID?: string;
      record_link?: string;
      guid?: string;
      data_source?: string;
      unit_code?: string;
      metadata_usage?: { access?: string };
      online_media?: {
        mediaCount?: number | string;
        media?: Array<{
          content?: string;
          thumbnail?: string;
          type?: string;
          usage?: { access?: string };
        }>;
      };
    };
    freetext?: Record<string, unknown>;
    indexedStructured?: Record<string, unknown>;
  };
  lastTimeUpdated?: string;
  hash?: string;
  docSignature?: string;
  timestamp?: string;
  version?: string;
}
