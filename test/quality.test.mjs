import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  validateBoardBundle,
  validateRoundSnapshot,
  validateButlerData,
} from "../src/core/quality.mjs";
import {
  createSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
} from "../src/core/snapshot.mjs";
import { parseGemBridgeUrl } from "../src/gembridge/url.mjs";
import {
  normalizeHand,
  normalizeBoardResult,
  normalizeDatumRound,
  normalizeRoundTable,
  normalizeButler,
} from "../src/gembridge/normalize.mjs";

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
  );

test("URL parser accepts quoted, protocol-less GemBridge links", () => {
  const meta = parseGemBridgeUrl(
    '"www.gembridge.cn/score/TeamRoundBoards?section=abc&round=2&board=3"',
  );
  assert.equal(meta.sourceHost, "www.gembridge.cn");
  assert.equal(meta.section, "abc");
  assert.equal(meta.round, 2);
  assert.equal(meta.board, 3);
});

test("URL parser accepts CCBA links with score identifiers", () => {
  const meta = parseGemBridgeUrl(
    "https://www.ccba.org.cn/score/SectionSwiss?section=abc&round=7",
  );
  assert.equal(meta.sourceHost, "www.ccba.org.cn");
  assert.equal(meta.section, "abc");
});

test("board quality validator accepts complete fixture and exposes warnings separately", () => {
  const handCache = fixture("hand-2025-r1b1-cache.json");
  const resultCache = fixture("board-2025-r1b1-cache.json");
  const hand = normalizeHand(handCache.data, {
    url: handCache.url,
    fromCache: true,
    fetchedAt: handCache.fetchedAt,
  });
  const results = resultCache.data.map((row) =>
    normalizeBoardResult(row, hand, { url: resultCache.url, fromCache: true }),
  );
  const report = validateBoardBundle({ hand, results });
  assert.equal(report.summary.errors, 0);
  assert.ok(report.summary.checks > 50);
  assert.equal(hand.provenance.fromCache, true);
});

test("board quality validator detects duplicate and incomplete cards", () => {
  const hand = normalizeHand(fixture("board-r1b2-hand.json"));
  hand.hands.N.S = `${hand.hands.N.S}A`;
  const report = validateBoardBundle({ hand, results: [] });
  assert.equal(report.status, "error");
  assert.ok(report.issues.some((issue) => /13 张|重复牌/.test(issue.message)));
});

test("board quality reports stale cache fallback as a warning", () => {
  const hand = normalizeHand(fixture("board-r1b2-hand.json"));
  const report = validateBoardBundle({
    hand,
    results: [],
    provenance: {
      sources: [{ stale: true, fetchedAt: "2026-01-01T00:00:00Z" }],
    },
  });
  assert.equal(report.status, "warning");
  assert.ok(report.issues.some((issue) => issue.code === "stale-cache"));
});

test("round quality validates datum totals and snapshot has a versioned envelope", () => {
  const table = normalizeRoundTable(fixture("round7-table61.json"));
  const datum = normalizeDatumRound(fixture("datum-r1.json"));
  const round = {
    meta: { round: 7 },
    tables: [table],
    ranks: { rows: [] },
    datum,
  };
  const quality = validateRoundSnapshot(round);
  assert.equal(quality.summary.errors, 0);
  const snapshot = createSnapshot({
    scope: "round",
    meta: { section: "x", round: 7 },
    data: round,
    dataQuality: quality,
  });
  assert.equal(snapshot.schemaVersion, SNAPSHOT_SCHEMA_VERSION);
  assert.equal(snapshot.scope, "round");
  assert.equal(snapshot.source.identifiers.round, 7);
});

test("Butler quality validates official formulas", () => {
  const report = validateButlerData(normalizeButler(fixture("butler.json")));
  assert.equal(report.status, "ok");
  assert.equal(report.summary.errors, 0);
});
