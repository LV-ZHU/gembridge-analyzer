export function parseRange(spec, { min = 0, max = 9999 } = {}) {
  if (Array.isArray(spec))
    return [...new Set(spec.map(Number))]
      .filter((n) => Number.isInteger(n) && n >= min && n <= max)
      .sort((a, b) => a - b);
  const s = String(spec ?? "").trim();
  if (!s) return [];
  const out = [];
  for (const part of s.split(",")) {
    const p = part.trim();
    if (/^\d+$/.test(p)) out.push(Number(p));
    else {
      const m = p.match(/^(\d+)-(\d+)$/);
      if (!m) throw new Error(`无效范围: ${p}`);
      const a = Number(m[1]),
        b = Number(m[2]);
      for (let n = a; n <= b; n++) out.push(n);
    }
  }
  return [...new Set(out)]
    .filter((n) => n >= min && n <= max)
    .sort((a, b) => a - b);
}
export function intArg(v, name, { min = 0, max = 1e9 } = {}) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error(`${name} 必须是 ${min}~${max} 的整数`);
  return n;
}

export function selectBoardRange(spec, low, high) {
  const first = Number.isInteger(low) ? low : 1;
  const last = Number.isInteger(high) ? high : first + 11;
  if (first > last) throw new Error(`牌号范围无效: ${first}-${last}`);
  if (!spec) return parseRange(`${first}-${last}`, { min: 1, max: 999 });
  const requested = parseRange(spec, { min: 1, max: 999 });
  if (requested.every((board) => board >= first && board <= last))
    return requested;
  const count = last - first + 1;
  if (requested.every((position) => position >= 1 && position <= count)) {
    return requested.map((position) => first + position - 1);
  }
  throw new Error(
    `--boards ${spec} 既不在本轮绝对牌号 ${first}-${last} 内，也不是有效的本轮序号 1-${count}`,
  );
}

export function boardBounds(tables) {
  const lows = tables
    .map((table) => table.boardRange.low)
    .filter(Number.isFinite);
  const highs = tables
    .map((table) => table.boardRange.high)
    .filter(Number.isFinite);
  return {
    low: lows.length ? Math.min(...lows) : 1,
    high: highs.length ? Math.max(...highs) : 12,
  };
}
