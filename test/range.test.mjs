import test from "node:test";
import assert from "node:assert/strict";
import { selectBoardRange, boardBounds } from "../src/core/range.mjs";

test("board range accepts absolute board numbers inside the round", () => {
  assert.deepEqual(selectBoardRange("17-18", 17, 32), [17, 18]);
});

test("board range maps 1-based positions into later round board numbers", () => {
  assert.deepEqual(selectBoardRange("1-2", 17, 32), [17, 18]);
});

test("board range rejects values that are neither positions nor absolute boards", () => {
  assert.throws(() => selectBoardRange("33", 17, 32), /既不在本轮绝对牌号/);
});

test("board bounds do not force every round to include boards 1-12", () => {
  const bounds = boardBounds([
    { boardRange: { low: 17, high: 32 } },
    { boardRange: { low: 17, high: 32 } },
  ]);
  assert.deepEqual(bounds, { low: 17, high: 32 });
});
