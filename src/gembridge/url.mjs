const ALLOWED_HOSTS = [/(^|\.)gembridge\.cn$/i, /(^|\.)ccba\.org\.cn$/i];

export function parseGemBridgeUrl(input) {
  const normalizedInput = normalizeInputUrl(input);
  let u;
  try {
    u = new URL(normalizedInput);
  } catch {
    throw new Error(`URL 无效: ${input}`);
  }
  if (!ALLOWED_HOSTS.some((pattern) => pattern.test(u.hostname)))
    throw new Error(
      `需要 gembridge.cn 或 ccba.org.cn 的赛事链接，收到 ${u.hostname}`,
    );
  const q = u.searchParams;
  const meta = {
    sourceUrl: u.href,
    sourceHost: u.hostname.toLowerCase(),
    pathname: u.pathname,
    tourStart: q.get("tourStart"),
    tour: numParam(q, "tour"),
    event: q.get("event"),
    section: q.get("section"),
    round: numParam(q, "round"),
    seg: q.has("seg") ? numParam(q, "seg") : 0,
    board: q.has("board") ? numParam(q, "board") : null,
    from: q.get("from") || "ccba",
    byrank: q.get("byrank"),
  };
  if (!meta.section) throw new Error("URL 缺少 section");
  if (meta.round == null) throw new Error("URL 缺少 round");
  return meta;
}
function numParam(q, k) {
  const v = q.get(k);
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`${k} 不是整数: ${v}`);
  return n;
}
export function withMeta(meta, patch) {
  return { ...meta, ...patch };
}

export function normalizeInputUrl(input) {
  let value = String(input ?? "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
    value = value.slice(1, -1).trim();
  if (value && !/^[a-z][a-z\d+.-]*:\/\//i.test(value))
    value = `https://${value}`;
  return value;
}
