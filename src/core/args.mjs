const BOOLEAN_OPTIONS = new Set([
  "json",
  "word",
  "no-reveal",
  "deep",
  "refresh",
  "no-cache",
  "quiet",
  "help",
  "version",
  "strict",
]);

const VALUE_OPTIONS = new Set([
  "format",
  "out",
  "proxy",
  "timeout",
  "retries",
  "cache-dir",
  "cache-ttl",
  "concurrency",
  "rounds",
  "boards",
  "table",
  "team",
  "player",
  "name",
  "scope",
  "seat",
  "notes",
]);

export function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      pos.push(arg);
      continue;
    }

    const equalAt = arg.indexOf("=");
    const key = arg.slice(2, equalAt === -1 ? undefined : equalAt);
    if (BOOLEAN_OPTIONS.has(key)) {
      if (equalAt !== -1) throw new Error(`--${key} 是开关参数，不需要填写值`);
      opts[key] = true;
      continue;
    }
    if (!VALUE_OPTIONS.has(key)) throw new Error(`未知参数: --${key}`);

    const value = equalAt === -1 ? argv[++i] : arg.slice(equalAt + 1);
    if (
      value == null ||
      value === "" ||
      (equalAt === -1 && value.startsWith("--"))
    ) {
      if (equalAt === -1 && value?.startsWith("--")) i--;
      throw new Error(`--${key} 缺少值`);
    }
    opts[key] = value;
  }
  return { pos, opts };
}
