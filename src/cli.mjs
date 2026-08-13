#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { parseArgs } from "./core/args.mjs";
import {
  parseRange,
  intArg,
  selectBoardRange,
  boardBounds,
} from "./core/range.mjs";
import { mapLimit } from "./core/concurrency.mjs";
import { writeOutput, loadJson } from "./core/output.mjs";
import { writeWordOutput } from "./core/word.mjs";
import {
  validateBoardBundle,
  validateRoundSnapshot,
  validateButlerData,
  combineQuality,
} from "./core/quality.mjs";
import { createSnapshot, APP_VERSION } from "./core/snapshot.mjs";
import { parseGemBridgeUrl, withMeta } from "./gembridge/url.mjs";
import { GemBridgeApi } from "./gembridge/api.mjs";
import {
  normalizeBoardBundle,
  normalizeRoundMeta,
  normalizeRoundTable,
  normalizeRoundRank,
  normalizeSwissTeam,
  normalizeDatumRound,
  normalizeButler,
} from "./gembridge/normalize.mjs";
import { analyzeBoard } from "./analyzers/board.mjs";
import { analyzeMatch } from "./analyzers/match.mjs";
import { analyzeStandings } from "./analyzers/standings.mjs";
import { analyzeButler } from "./analyzers/butler.mjs";
import { analyzePlayer } from "./analyzers/player.mjs";
import { analyzeTeam } from "./analyzers/team.mjs";
import { analyzeRound } from "./analyzers/round.mjs";
import { analyzeEvent } from "./analyzers/event.mjs";
import {
  boardMarkdown,
  matchMarkdown,
  standingsMarkdown,
  butlerMarkdown,
  playerMarkdown,
  teamMarkdown,
  roundMarkdown,
  eventMarkdown,
} from "./reports/markdown.mjs";

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(`参数错误: ${e.message || e}`);
  console.error("运行 gb help 查看可用参数。");
  process.exit(2);
}
const { pos, opts } = parsed;
const [cmd, urlArg] = pos;
if (opts.version || cmd === "version") {
  console.log(APP_VERSION);
  process.exit(0);
}
if (opts.help || !cmd || ["help", "-h", "--help"].includes(cmd)) {
  help();
  process.exit(0);
}
if (cmd === "doctor") {
  doctor();
  process.exit(0);
}
const commands = new Set([
  "board",
  "match",
  "standings",
  "butler",
  "player",
  "team",
  "round",
  "event",
  "fetch",
]);
if (!commands.has(cmd)) {
  console.error(`未知命令: ${cmd}`);
  console.error("运行 gb help 查看可用命令。");
  process.exit(2);
}
const url = urlArg || (await promptForUrl());
if (!url) die("需要一个 GemBridge score URL");
let meta;
try {
  meta = parseGemBridgeUrl(url);
} catch (e) {
  console.error(`URL 错误: ${e.message || e}`);
  process.exit(2);
}
const format = opts.json ? "json" : opts.format || "md";
const api = new GemBridgeApi({
  proxy: opts.proxy,
  timeoutMs: Number(opts.timeout || 15000),
  retries: Number(opts.retries || 2),
  cacheDir: opts["cache-dir"] || ".cache/gembridge-analyzer",
  cacheTtlMs: Number(opts["cache-ttl"] || 300000),
  cache: !opts["no-cache"],
  refresh: Boolean(opts.refresh),
});
const concurrency = Number(opts.concurrency || 5);
const progress = opts.quiet
  ? () => {}
  : ({ done, total }) =>
      process.stderr.write(
        `\r获取 ${done}/${total}${done === total ? "\n" : ""}`,
      );

try {
  if (cmd === "board") await runBoard();
  else if (cmd === "match") await runMatch();
  else if (cmd === "standings") await runStandings();
  else if (cmd === "butler") await runButler();
  else if (cmd === "player") await runPlayer();
  else if (cmd === "team") await runTeam();
  else if (cmd === "round") await runRound();
  else if (cmd === "event") await runEvent();
  else if (cmd === "fetch") await runFetch();
  else die(`未知命令: ${cmd}`);
} catch (e) {
  console.error(`\n错误：${e.message || e}`);
  process.exit(1);
}

async function fetchBoard(m) {
  const raw = await api.getBoard(m);
  const board = normalizeBoardBundle({
    meta: m,
    hand: raw.hand,
    results: raw.results,
  });
  if (opts.strict) enforceQuality(validateBoardBundle(board));
  return board;
}
async function fetchBoards(m, boards) {
  return mapLimit(
    boards,
    concurrency,
    (b) => fetchBoard(withMeta(m, { board: b })),
    progress,
  );
}
async function roundTables(m) {
  const r = await api.getRoundTables(m);
  return (r.data || []).map((x) => normalizeRoundTable(x, r.meta));
}
async function swiss(m) {
  const r = await api.getSwiss(m);
  return (r.data || []).map((x) => normalizeSwissTeam(x, r.meta));
}
async function ranks(m) {
  const r = await api.getRoundRanks(m);
  return {
    round: m.round,
    rows: (r.data || []).map((x) => normalizeRoundRank(x, r.meta)),
  };
}
async function datum(m) {
  const r = await api.getDatumRound(m);
  return normalizeDatumRound(r.data, r.meta);
}
async function butler() {
  const r = await api.getButler(meta);
  return normalizeButler(r.data, r.meta);
}

async function runBoard() {
  if (meta.board == null) die("board 命令需要 URL 中的 board");
  const b = await fetchBoard(meta),
    quality = validateBoardBundle(b),
    manual = await loadJson(opts.notes),
    a = analyzeBoard(b, { manual });
  enforceQuality(quality);
  a.dataQuality = quality;
  await emit(
    format === "json"
      ? { board: b, analysis: a, dataQuality: quality }
      : boardMarkdown(b, a, {
          reveal: !opts["no-reveal"],
          seat: opts.seat?.toUpperCase(),
        }),
    { title: `R${b.hand.round} B${b.hand.board} 桥牌分析` },
  );
}
async function runMatch() {
  const table = intArg(opts.table || "", "table", { min: 1 });
  const tables = await roundTables(meta),
    m = tables.find((x) => x.table === table);
  if (!m) die(`第${meta.round}轮未找到 ${table}桌`);
  const boards = selectBoardRange(
      opts.boards,
      m.boardRange.low || 1,
      m.boardRange.high || 12,
    ),
    bs = await fetchBoards(meta, boards),
    a = analyzeMatch(m, bs);
  await emit(format === "json" ? { match: m, analysis: a } : matchMarkdown(a), {
    title: `R${meta.round} ${table}桌 对抗分析`,
  });
}
async function runStandings() {
  const s = await swiss(meta);
  let prev = null;
  if (meta.round > 1) {
    const p = await api.getSwiss(withMeta(meta, { round: meta.round - 1 }));
    prev = (p.data || []).map((x) => normalizeSwissTeam(x, p.meta));
  }
  const a = analyzeStandings(s, { previousRanks: prev });
  await emit(format === "json" ? a : standingsMarkdown(a, meta.round), {
    title: `第${meta.round}轮后排名`,
  });
}
async function runButler() {
  const b = await butler(),
    quality = validateButlerData(b),
    a = analyzeButler(b);
  enforceQuality(quality);
  await emit(
    format === "json"
      ? { butler: b, analysis: a, dataQuality: quality }
      : butlerMarkdown(a),
    { title: "Butler 分析" },
  );
}
async function runPlayer() {
  if (!opts.player && !opts.name)
    throw new Error("player 命令需要 --player 会员号 或 --name 姓名");
  const rounds = parseRange(opts.rounds || `1-${meta.round}`, {
      min: 1,
      max: 99,
    }),
    ds = await mapLimit(
      rounds,
      concurrency,
      (r) => datum(withMeta(meta, { round: r })),
      progress,
    ),
    b = await butler();
  const a = analyzePlayer({
    memberNo: opts.player,
    name: opts.name,
    datumRounds: ds,
    butler: b,
  });
  if (!a.boardCount && !a.butler)
    throw new Error(`未找到牌手: ${opts.player || opts.name}`);
  await emit(format === "json" ? a : playerMarkdown(a), {
    title: `${a.name || a.memberNo} 牌手分析`,
  });
}
async function runTeam() {
  const no = intArg(opts.team || "", "team", { min: 1 });
  const rounds = parseRange(opts.rounds || `1-${meta.round}`, {
    min: 1,
    max: 99,
  });
  const finalMeta = withMeta(meta, { round: Math.max(...rounds) });
  const finalSwiss = await swiss(finalMeta),
    t = finalSwiss.find((x) => x.teamNo === no);
  if (!t) die(`未找到队号 ${no}`);
  const rankSnapshots = await mapLimit(
    rounds,
    concurrency,
    (r) => ranks(withMeta(meta, { round: r })),
    progress,
  );
  const tableByRound = await mapLimit(
    rounds,
    concurrency,
    async (r) =>
      (await roundTables(withMeta(meta, { round: r }))).map((x) => ({
        ...x,
        round: r,
      })),
    progress,
  );
  const tables = tableByRound.flat();
  let deep = [];
  if (opts.deep) {
    for (const r of rounds) {
      const tm = tables.find(
        (x) => x.round === r && (x.nsTeam.no === no || x.ewTeam.no === no),
      );
      if (!tm) continue;
      const bs = await fetchBoards(
        withMeta(meta, { round: r }),
        selectBoardRange(
          opts.boards,
          tm.boardRange.low || 1,
          tm.boardRange.high || 12,
        ),
      );
      const ma = analyzeMatch(tm, bs);
      ma.teamPerspectiveNo = no;
      for (const b of ma.boards)
        b.teamGain = tm.nsTeam.no === no ? b.teamAGain : -b.teamAGain;
      deep.push(ma);
    }
  }
  const a = analyzeTeam({
    team: t,
    rankSnapshots,
    roundTables: tables,
    deepMatches: deep,
  });
  await emit(format === "json" ? a : teamMarkdown(a), {
    title: `${a.teamName || no} 队伍分析`,
  });
}
async function runRound() {
  const [rmR, tables, s] = await Promise.all([
    api.getRoundMeta(meta),
    roundTables(meta),
    swiss(meta),
  ]);
  const rm = normalizeRoundMeta(rmR.data, rmR.meta);
  let bas = [],
    mas = [];
  if (opts.deep) {
    const { low, high } = boardBounds(tables);
    const boards = selectBoardRange(opts.boards, low, high);
    const bs = await fetchBoards(meta, boards);
    bas = bs.map((b) => analyzeBoard(b));
    mas = tables.map((t) => analyzeMatch(t, bs));
  }
  const stand = analyzeStandings(s);
  const a = analyzeRound({
    roundMeta: rm,
    tables,
    boardAnalyses: bas,
    matchAnalyses: mas,
    standings: stand,
  });
  await emit(format === "json" ? a : roundMarkdown(a), {
    title: `第${meta.round}轮分析`,
  });
}
async function runEvent() {
  const rounds = parseRange(opts.rounds || `1-${meta.round}`, {
      min: 1,
      max: 99,
    }),
    finalMeta = withMeta(meta, { round: Math.max(...rounds) }),
    finalSwiss = await swiss(finalMeta),
    rankSnapshots = await mapLimit(
      rounds,
      concurrency,
      (r) => ranks(withMeta(meta, { round: r })),
      progress,
    ),
    b = await butler(),
    ba = analyzeButler(b);
  const summaries = [];
  for (const r of rounds) {
    const m = withMeta(meta, { round: r });
    const [rmR, tables] = await Promise.all([
      api.getRoundMeta(m),
      roundTables(m),
    ]);
    const rm = normalizeRoundMeta(rmR.data, rmR.meta);
    let bas = [],
      mas = [];
    if (opts.deep) {
      const { low, high } = boardBounds(tables);
      const boards = selectBoardRange(opts.boards, low, high),
        bs = await fetchBoards(m, boards);
      bas = bs.map((x) => analyzeBoard(x));
      mas = tables.map((t) => analyzeMatch(t, bs));
    }
    summaries.push(
      analyzeRound({
        roundMeta: rm,
        tables,
        boardAnalyses: bas,
        matchAnalyses: mas,
      }),
    );
  }
  const a = analyzeEvent({
    finalSwiss,
    rankSnapshots,
    roundSummaries: summaries,
    butlerAnalysis: ba,
  });
  await emit(format === "json" ? a : eventMarkdown(a), {
    title: "GemBridge 赛事分析",
  });
}
async function runFetch() {
  if (opts.word) throw new Error("fetch 只输出 JSON，不支持 --word");
  const scope = opts.scope || "board";
  let data, quality;
  if (scope === "board") {
    data = await fetchBoard(meta);
    quality = validateBoardBundle(data);
  } else if (scope === "round") {
    data = await fetchRoundSnapshot(meta, { deep: Boolean(opts.deep) });
    quality = validateRoundSnapshot(data);
  } else if (scope === "event") {
    const rounds = parseRange(opts.rounds || `1-${meta.round}`, {
      min: 1,
      max: 99,
    });
    const snapshots = await mapLimit(
      rounds,
      concurrency,
      (r) =>
        fetchRoundSnapshot(withMeta(meta, { round: r }), {
          deep: Boolean(opts.deep),
        }),
      progress,
    );
    const butlerData = await butler();
    data = { rounds: snapshots, butler: butlerData };
    quality = combineQuality([
      ...snapshots.map(validateRoundSnapshot),
      validateButlerData(butlerData),
    ]);
  } else die("--scope 支持 board|round|event");
  enforceQuality(quality);
  await writeOutput(
    createSnapshot({ scope, meta, data, dataQuality: quality }),
    { out: opts.out, format: "json" },
  );
}
async function fetchRoundSnapshot(m, { deep = false } = {}) {
  const [rmR, tables, rankRows, swissRows, datumRows] = await Promise.all([
    api.getRoundMeta(m),
    roundTables(m),
    ranks(m),
    swiss(m),
    datum(m),
  ]);
  const snapshot = {
    meta: normalizeRoundMeta(rmR.data, rmR.meta),
    tables,
    ranks: rankRows,
    swiss: swissRows,
    datum: datumRows,
  };
  if (deep) {
    const available = tables
      .flatMap((table) => [table.boardRange.low, table.boardRange.high])
      .filter(Number.isFinite);
    const low = available.length ? Math.min(...available) : 1,
      high = available.length ? Math.max(...available) : 12;
    snapshot.boards = await fetchBoards(
      m,
      selectBoardRange(opts.boards, low, high),
    );
  }
  return snapshot;
}
function enforceQuality(quality) {
  if (opts.strict && quality?.summary?.errors) {
    const first = quality.issues.find((issue) => issue.severity === "error");
    throw new Error(
      `数据校验失败：${first?.path || "unknown"} ${first?.message || ""}`.trim(),
    );
  }
}
async function emit(value, { title = "GemBridge 分析报告" } = {}) {
  if (opts.word) {
    if (format === "json") throw new Error("--word 不能和 --json 同时使用");
    const out = await writeWordOutput(String(value), { out: opts.out, title });
    console.error(`已写入 ${out}`);
    return;
  }
  await writeOutput(value, { out: opts.out, format });
}
async function promptForUrl() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (
      await rl.question(
        "请直接粘贴完整的 CCBA / GemBridge 赛事链接（不需要引号）：\n> ",
      )
    ).trim();
  } finally {
    rl.close();
  }
}
function doctor() {
  console.log(
    `GemBridge Analyzer ${APP_VERSION}\nNode ${process.version}\n代理: ${process.env.GEMBRIDGE_PROXY || process.env.HTTP_PROXY || "(未设置)"}\n状态: CLI 可启动。运行 npm test 做完整离线测试。`,
  );
}
function die(s) {
  console.error(s);
  help();
  process.exit(2);
}
function help() {
  console.log(`gembridge-analyzer ${APP_VERSION}

安装一次短命令:
  scripts\\setup.cmd

之后直接使用 gb（gembridge 也可以）:
  gb board
  gb match --table 61
  gb player --player 082034 --rounds 1-7

省略 URL 时，按提示直接粘贴完整链接，不需要引号。

命令:
  gb board [URL]                           单副牌学习与技术分析
  gb match [URL] --table 61                一场对抗及逐副 IMP
  gb round [URL] [--deep]                  一整轮概览
  gb team [URL] --team 24 [--deep]         一支队的赛事轨迹
  gb player [URL] --player 082034          牌手 xIMP、搭档和 Butler
  gb player [URL] --name 姓名              按姓名查牌手
  gb standings [URL]                       排名与 tie-break
  gb butler [URL]                          Butler / AOB / 修正 Butler
  gb event [URL] [--deep]                  整项赛事概览
  gb fetch [URL] --scope board|round|event  导出标准 JSON 快照
  gb doctor                                检查运行环境
  gb help                                  显示本帮助

输出参数:
  --word             输出 Word 文档（.docx）
  --json             输出 JSON
  --out FILE         指定输出文件

分析参数:
  --rounds 1-8       指定轮次范围
  --boards 1-12      指定牌号范围
  --table 61         指定桌号
  --team 24          指定队号
  --player 082034    指定牌手会员号
  --name 姓名        指定牌手姓名
  --deep             抓逐副牌做深度分析或快照
  --strict           数据校验有错误时停止输出
  --refresh          忽略缓存重新请求
  --no-cache         禁用缓存
  --concurrency 5    并发请求数
  --no-reveal        board 隐藏全场结果
  --seat S           board 只显示指定座位
  --notes FILE       补录叫牌、首攻和打法
  --quiet            隐藏抓取进度

示例:
  gb board --word
  gb match --table 61 --word --out reports\\match.docx
  gb event --rounds 1-7 --deep --out reports\\event.md
  gb fetch --scope event --rounds 1-7 --deep --out data\\event.json`);
}
