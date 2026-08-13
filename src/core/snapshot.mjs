import { nowIso } from "./utils.mjs";

export const SNAPSHOT_SCHEMA_VERSION = "1.1.0";
export const APP_VERSION = "1.1.0";

export function createSnapshot({ scope, meta, data, dataQuality }) {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generator: { name: "gembridge-analyzer", version: APP_VERSION },
    generatedAt: nowIso(),
    scope,
    source: {
      kind: "ccba-gembridge-public-score",
      url: meta?.sourceUrl || null,
      host: meta?.sourceHost || null,
      identifiers: {
        tourStart: meta?.tourStart || null,
        tour: meta?.tour ?? null,
        event: meta?.event || null,
        section: meta?.section || null,
        round: meta?.round ?? null,
        seg: meta?.seg ?? 0,
        board: meta?.board ?? null,
      },
    },
    dataQuality,
    data,
  };
}
