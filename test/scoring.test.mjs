import test from "node:test";
import assert from "node:assert/strict";
import { actualTricks, impFromDiff, scoreNS } from "../src/bridge/scoring.mjs";
test("1NTX-3 is 4 tricks and NS +500 from API fields", () => {
  assert.equal(actualTricks(1, "-3"), 4);
  assert.equal(scoreNS({ tpNS: 500, tpEW: 0 }), 500);
});
test("350 raw-score difference is 8 IMP", () => {
  assert.equal(impFromDiff(350), 8);
  assert.equal(impFromDiff(-350), -8);
});
test("scoreNS falls back to tp when directional fields are absent", () =>
  assert.equal(scoreNS({ tp: -420 }), -420));
