/**
 * USDA Soil Data Access (SDA) raw response types.
 *
 * Endpoint: POST https://sdmdataaccess.nrcs.usda.gov/Tabular/SDMTabularService/post.rest
 * Body:     {"format":"JSON", "query": "<SOIL SQL>"}
 *
 * Response shape: {"Table": [[col1, col2, ...], ...]} — column order matches
 * the SELECT in the query. SSURGO column order is documented per query.
 *
 * Docs: https://sdmdataaccess.nrcs.usda.gov/
 */

export interface SdaTabularResponse {
  /**
   * Each row is an array in SELECT-column order. Empty array if no soil data
   * for the location (e.g. point outside US, water bodies, urban land
   * without survey coverage).
   */
  Table?: string[][];
}
