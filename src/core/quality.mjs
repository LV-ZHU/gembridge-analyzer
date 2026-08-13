import { DIRS, STRAINS } from "./utils.mjs";
import { impFromDiff } from "../bridge/scoring.mjs";

const RANK_VALUE = { A: 4, K: 3, Q: 2, J: 1 };
const VALID_RANKS = new Set("AKQJT98765432");

export function validateBoardBundle(board) {
  const issues = [];
  const checks = [];
  const hand = board?.hand;
  check(Boolean(hand), "board.hand", "缺少牌型数据", issues, checks);
  if (!hand) return finish(issues, checks);

  check(
    Number.isInteger(hand.board) && hand.board > 0,
    "hand.board",
    "牌号不是正整数",
    issues,
    checks,
  );
  check(
    DIRS.includes(hand.dealer),
    "hand.dealer",
    `发牌人无效: ${hand.dealer || "空"}`,
    issues,
    checks,
  );
  const cards = [];
  for (const direction of DIRS) {
    const holding = hand.hands?.[direction];
    check(
      Boolean(holding),
      `hand.hands.${direction}`,
      `${direction} 缺少手牌`,
      issues,
      checks,
    );
    if (!holding) continue;
    let count = 0;
    let hcp = 0;
    for (const suit of ["S", "H", "D", "C"]) {
      const ranks = String(holding[suit] || "")
        .replace(/[-\s]/g, "")
        .toUpperCase();
      count += ranks.length;
      for (const rank of ranks) {
        if (!VALID_RANKS.has(rank))
          add(
            issues,
            "error",
            "invalid-rank",
            `hand.hands.${direction}.${suit}`,
            `无法识别牌张点数: ${rank}`,
          );
        cards.push(`${suit}${rank}`);
        hcp += RANK_VALUE[rank] || 0;
      }
    }
    check(
      count === 13,
      `hand.hands.${direction}`,
      `${direction} 有 ${count} 张牌，应为 13 张`,
      issues,
      checks,
    );
    if (Number.isFinite(holding.hcp))
      check(
        hcp === holding.hcp,
        `hand.hands.${direction}.hcp`,
        `${direction} HCP 为 ${holding.hcp}，按牌张重算为 ${hcp}`,
        issues,
        checks,
        "warning",
        "hcp-mismatch",
      );
  }
  const duplicates = [
    ...new Set(cards.filter((card, index) => cards.indexOf(card) !== index)),
  ];
  check(
    cards.length === 52,
    "hand.hands",
    `四手牌合计 ${cards.length} 张，应为 52 张`,
    issues,
    checks,
  );
  check(
    !duplicates.length,
    "hand.hands",
    `发现重复牌: ${duplicates.join(", ")}`,
    issues,
    checks,
  );

  for (const direction of DIRS)
    for (const strain of STRAINS) {
      const tricks = hand.doubleDummyTricks?.[direction]?.[strain];
      if (tricks != null)
        check(
          Number.isInteger(tricks) && tricks >= 0 && tricks <= 13,
          `hand.doubleDummyTricks.${direction}.${strain}`,
          `DD 墩数超出 0-13: ${tricks}`,
          issues,
          checks,
        );
    }

  const seenRooms = new Set();
  for (let index = 0; index < (board.results || []).length; index++) {
    const row = board.results[index];
    const path = `results[${index}]`;
    if (Number.isFinite(row.table) && Number.isFinite(row.room)) {
      const key = `${row.table}/${row.room}`;
      check(
        !seenRooms.has(key),
        path,
        `桌号/室重复: ${key}`,
        issues,
        checks,
        "warning",
        "duplicate-table-room",
      );
      seenRooms.add(key);
    }
    if (row.recordKind === "played-contract") {
      check(
        Number.isInteger(row.contract?.level) &&
          row.contract.level >= 1 &&
          row.contract.level <= 7,
        `${path}.contract.level`,
        `定约阶数无效: ${row.contract?.level}`,
        issues,
        checks,
      );
      check(
        STRAINS.includes(row.contract?.strain),
        `${path}.contract.strain`,
        `定约花色无效: ${row.contract?.strain}`,
        issues,
        checks,
      );
      check(
        DIRS.includes(row.contract?.declarer),
        `${path}.contract.declarer`,
        `庄家方位无效: ${row.contract?.declarer}`,
        issues,
        checks,
      );
      if (row.contract?.actualTricks != null)
        check(
          row.contract.actualTricks >= 0 && row.contract.actualTricks <= 13,
          `${path}.contract.actualTricks`,
          `实际墩数超出 0-13: ${row.contract.actualTricks}`,
          issues,
          checks,
        );
    }
    if (
      Number.isFinite(row.scoreNS) &&
      Number.isFinite(row.datumScoreNS) &&
      Number.isFinite(row.datumDifference)
    ) {
      check(
        row.scoreNS - row.datumScoreNS === row.datumDifference,
        `${path}.datumDifference`,
        "Datum 差与 NS 得分不一致",
        issues,
        checks,
      );
    }
    if (Number.isFinite(row.datumDifference) && Number.isFinite(row.ximp)) {
      const expected = impFromDiff(row.datumDifference);
      check(
        expected === row.ximp,
        `${path}.ximp`,
        `xIMP 为 ${row.ximp}，按 Datum 差应为 ${expected}`,
        issues,
        checks,
        "warning",
        "ximp-mismatch",
      );
    }
  }
  for (const source of board.provenance?.sources || []) {
    if (source?.stale)
      add(
        issues,
        "warning",
        "stale-cache",
        "provenance.sources",
        `接口失败，当前使用 ${source.fetchedAt || "未知时间"} 的过期缓存`,
      );
  }
  return finish(issues, checks);
}

export function validateRoundSnapshot(snapshot) {
  const issues = [];
  const checks = [];
  const round = snapshot?.meta?.round ?? snapshot?.round;
  const tables = snapshot?.tables || [];
  check(
    Number.isInteger(round) && round > 0,
    "round",
    `轮次无效: ${round}`,
    issues,
    checks,
  );
  const tableNumbers = tables.map((row) => row.table).filter(Number.isFinite);
  check(
    new Set(tableNumbers).size === tableNumbers.length,
    "tables",
    "存在重复桌号",
    issues,
    checks,
    "warning",
    "duplicate-table",
  );
  for (let index = 0; index < tables.length; index++) {
    const row = tables[index];
    check(
      row.round === round,
      `tables[${index}].round`,
      `对阵轮次 ${row.round} 与快照轮次 ${round} 不一致`,
      issues,
      checks,
    );
    check(
      Number.isFinite(row.nsTeam?.no) && Number.isFinite(row.ewTeam?.no),
      `tables[${index}]`,
      "对阵缺少队号",
      issues,
      checks,
      "warning",
      "missing-team",
    );
    if (
      Number.isFinite(row.boardRange?.low) &&
      Number.isFinite(row.boardRange?.high)
    )
      check(
        row.boardRange.low <= row.boardRange.high,
        `tables[${index}].boardRange`,
        "牌号范围上下界颠倒",
        issues,
        checks,
      );
  }
  const ranks = snapshot?.ranks?.rows || [];
  const rankTeams = ranks.map((row) => row.teamNo).filter(Number.isFinite);
  check(
    new Set(rankTeams).size === rankTeams.length,
    "ranks.rows",
    "轮次排名中存在重复队号",
    issues,
    checks,
    "warning",
    "duplicate-ranked-team",
  );
  const datum = snapshot?.datum;
  for (let index = 0; index < (datum?.players || []).length; index++) {
    const player = datum.players[index];
    const sum = player.boardsXimp.reduce(
      (total, board) => total + (Number(board.ximp) || 0),
      0,
    );
    check(
      Math.abs(sum - player.totalXimp) < 0.001,
      `datum.players[${index}].totalXimp`,
      `${player.player || player.memberNo} 的逐副 xIMP 合计 ${sum}，官方总计 ${player.totalXimp}`,
      issues,
      checks,
      "warning",
      "player-ximp-total",
    );
  }
  const boardReports = (snapshot?.boards || []).map(validateBoardBundle);
  for (const source of collectProvenance(snapshot)) {
    if (source?.stale)
      add(
        issues,
        "warning",
        "stale-cache",
        "provenance",
        `接口失败，当前使用 ${source.fetchedAt || "未知时间"} 的过期缓存`,
      );
  }
  return finish(issues, checks, boardReports);
}

export function validateButlerData(butler) {
  const issues = [];
  const checks = [];
  const seenMembers = new Set();
  for (let index = 0; index < (butler?.players || []).length; index++) {
    const player = butler.players[index];
    const path = `players[${index}]`;
    if (player.memberNo) {
      check(
        !seenMembers.has(player.memberNo),
        `${path}.memberNo`,
        `Butler 中会员号重复: ${player.memberNo}`,
        issues,
        checks,
        "warning",
        "duplicate-player",
      );
      seenMembers.add(player.memberNo);
    }
    check(
      Number.isFinite(player.boards) && player.boards >= 0,
      `${path}.boards`,
      `副数无效: ${player.boards}`,
      issues,
      checks,
    );
    if (player.boards > 0 && Number.isFinite(player.butler))
      check(
        Math.abs(player.ximps / player.boards - player.butler) < 0.002,
        `${path}.butler`,
        `${player.name || player.memberNo} 的 Butler 与 XIMP/副数不一致`,
        issues,
        checks,
        "warning",
        "butler-formula",
      );
    if (
      Number.isFinite(player.butler) &&
      Number.isFinite(player.aob) &&
      Number.isFinite(player.correctButler)
    )
      check(
        Math.abs(player.butler + player.aob - player.correctButler) < 0.002,
        `${path}.correctButler`,
        `${player.name || player.memberNo} 的修正 Butler 与 Butler+AOB 不一致`,
        issues,
        checks,
        "warning",
        "corrected-butler-formula",
      );
  }
  return finish(issues, checks);
}

export function combineQuality(reports) {
  const all = reports.filter(Boolean);
  const issues = all.flatMap((report, index) =>
    report.issues.map((issue) => ({ ...issue, report: index })),
  );
  const checks = all.reduce(
    (total, report) => total + (report.summary?.checks || 0),
    0,
  );
  return finish(issues, Array.from({ length: checks }));
}

function check(
  condition,
  path,
  message,
  issues,
  checks,
  severity = "error",
  code = "invalid-value",
) {
  checks.push({ path, passed: Boolean(condition) });
  if (!condition) add(issues, severity, code, path, message);
}
function add(issues, severity, code, path, message) {
  issues.push({ severity, code, path, message });
}
function collectProvenance(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (value.kind === "raw_api" && Object.hasOwn(value, "stale"))
    found.push(value);
  for (const child of Object.values(value)) collectProvenance(child, found);
  return found;
}
function finish(issues, checks, children = []) {
  const childIssues = children.flatMap((report, index) =>
    report.issues.map((issue) => ({
      ...issue,
      path: `boards[${index}].${issue.path}`,
    })),
  );
  const allIssues = [...issues, ...childIssues];
  const errors = allIssues.filter((issue) => issue.severity === "error").length;
  const warnings = allIssues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const childChecks = children.reduce(
    (total, report) => total + report.summary.checks,
    0,
  );
  return {
    status: errors ? "error" : warnings ? "warning" : "ok",
    summary: { checks: checks.length + childChecks, errors, warnings },
    issues: allIssues,
  };
}
