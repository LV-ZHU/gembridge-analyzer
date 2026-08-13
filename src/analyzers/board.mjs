import { groupCount, sortedCountRows, stats, entropyFromCounts, clamp, pct } from "../core/utils.mjs";
import { sideFits } from "../bridge/hands.mjs";
import { isGame, isSlam } from "../bridge/scoring.mjs";

const SIDE = { N: "NS", S: "NS", E: "EW", W: "EW" };
const OTHER_SIDE = { NS: "EW", EW: "NS" };
const GAME = { NT: 9, S: 10, H: 10, D: 11, C: 11 };

export function analyzeBoard(board, { manual = null } = {}) {
  const allRows = board.results.filter(r => r.scoreNS != null);
  const fieldRows = allRows.filter(isFieldResult);
  const playedRows = fieldRows.filter(r => r.recordKind === "played-contract");
  const h = board.hand;

  const exact = sortedCountRows(groupCount(fieldRows, r => r.contract.display), fieldRows.length);
  const destinations = sortedCountRows(groupCount(fieldRows, destinationKey), fieldRows.length);
  const strains = sortedCountRows(
    groupCount(playedRows, r => `${SIDE[r.contract.declarer] || "?"} ${r.contract.strain || "?"}`),
    playedRows.length,
  );
  const ximpValues = fieldRows.map(r => r.ximp).filter(Number.isFinite);
  const scores = fieldRows.map(r => r.scoreNS).filter(Number.isFinite);
  const fits = sideFits(h.hands);
  const dd = ddBySide(h);
  const makeableGames = makeableGamesBySide(dd);
  const sacrificeCandidates = findSacrificeCandidates(playedRows, dd, h.par);
  const notes = practicalNotes(playedRows, dd, destinations, h, sacrificeCandidates);
  const doubles = playedRows.filter(r => r.contract.double).length;
  const games = playedRows.filter(r => isGame(r.contract.level, r.contract.strain)).length;
  const madeGames = playedRows.filter(r => isGame(r.contract.level, r.contract.strain)
    && r.contract.actualTricks != null
    && r.contract.actualTricks >= 6 + r.contract.level).length;
  const slams = playedRows.filter(r => isSlam(r.contract.level)).length;
  const entropy = entropyFromCounts(destinations.map(r => r.count));
  const ximpRange = ximpValues.length ? Math.max(...ximpValues) - Math.min(...ximpValues) : 0;
  const scoreRange = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  const study = Math.round(100 * (
    .24 * clamp(entropy / 3, 0, 1)
    + .28 * clamp(ximpRange / 20, 0, 1)
    + .14 * clamp(scoreRange / 1200, 0, 1)
    + .12 * clamp(doubles / Math.max(1, playedRows.length * .12), 0, 1)
    + .12 * clamp(games / Math.max(1, playedRows.length * .45), 0, 1)
    + .10 * clamp(notes.length / 3, 0, 1)
  ));
  const leads = openingLeads(playedRows);
  const excludedByKind = sortedCountRows(
    groupCount(allRows.filter(r => !isFieldResult(r)), r => r.recordKind),
    Math.max(1, allRows.length - fieldRows.length),
  );

  return {
    board: h.board,
    round: h.round,
    dealer: h.dealer,
    vulnerability: h.vulnerability,
    hcp: {
      NS: (h.hands.N.hcp || 0) + (h.hands.S.hcp || 0),
      EW: (h.hands.E.hcp || 0) + (h.hands.W.hcp || 0),
    },
    fits,
    par: h.par,
    ddBySide: dd,
    makeableGames,
    allResultCount: allRows.length,
    resultCount: fieldRows.length,
    fieldResultCount: fieldRows.length,
    playedResultCount: playedRows.length,
    noPlayCount: fieldRows.filter(r => r.recordKind === "no-play").length,
    excludedResultCount: allRows.length - fieldRows.length,
    excludedByKind,
    tableCount: new Set(fieldRows.map(r => r.table).filter(Number.isFinite)).size,
    exactResults: exact,
    destinations,
    sideStrains: strains,
    gameCount: games,
    gameRate: playedRows.length ? games / playedRows.length : 0,
    madeGameCount: madeGames,
    madeGameRate: playedRows.length ? madeGames / playedRows.length : 0,
    slamCount: slams,
    doubleCount: doubles,
    ximp: stats(ximpValues),
    scoreNS: stats(scores),
    outliers: mergeOutliers(fieldRows),
    sacrificeCandidates,
    notes,
    openingLeads: leads,
    studyValue: {
      score: study,
      label: study >= 75 ? "优先复盘" : study >= 50 ? "值得细看" : study >= 30 ? "快速过一遍" : "低优先级",
      basis: "heuristic",
    },
    manual,
    provenance: {
      derived: [
        "hcp totals",
        "fits",
        "field distributions",
        "played-contract rates",
        "studyValue",
        "notes",
      ],
      manual: Boolean(manual),
    },
  };
}

function isFieldResult(r) {
  if (r.flags?.phantomNS || r.flags?.phantomEW) return false;
  return r.recordKind === "played-contract" || r.recordKind === "no-play";
}

function destinationKey(r) {
  if (r.recordKind === "no-play") return "NoPlay";
  const c = r.contract;
  if (!c.level || !c.strain) return "UNKNOWN";
  return `${SIDE[c.declarer] || "?"} ${c.level}${c.strain}${c.double || ""}`;
}

function mergeOutliers(rows) {
  const grouped = new Map();
  for (const r of rows.filter(r => Number.isFinite(r.ximp))) {
    const key = [r.table, r.contract.display, r.scoreNS, r.datumDifference, r.ximp].join("|");
    const group = grouped.get(key) || { rows: [] };
    group.rows.push(r);
    grouped.set(key, group);
  }
  return [...grouped.values()]
    .sort((a, b) => Math.abs(b.rows[0].ximp) - Math.abs(a.rows[0].ximp))
    .slice(0, 10)
    .map(({ rows: groupRows }) => {
      const first = groupRows[0];
      const rooms = [...new Set(groupRows.map(r => r.room).filter(Number.isFinite))].sort((a, b) => a - b);
      return {
        table: first.table,
        room: rooms.join("/"),
        rooms,
        sameResultInBothRooms: rooms.includes(1) && rooms.includes(2),
        contract: first.contract.display,
        scoreNS: first.scoreNS,
        datumDifference: first.datumDifference,
        ximp: first.ximp,
      };
    });
}

function ddBySide(hand) {
  const out = { NS: {}, EW: {} };
  for (const [side, dirs] of [["NS", ["N", "S"]], ["EW", ["E", "W"]]]) {
    for (const strain of ["C", "D", "H", "S", "NT"]) {
      out[side][strain] = Math.max(...dirs.map(d => hand.doubleDummyTricks[d]?.[strain] ?? -99));
    }
  }
  return out;
}

function makeableGamesBySide(dd) {
  const out = { NS: [], EW: [] };
  for (const side of ["NS", "EW"]) {
    out[side] = Object.entries(GAME)
      .filter(([strain, tricks]) => (dd[side][strain] ?? -1) >= tricks)
      .map(([strain]) => gameContract(strain));
  }
  return out;
}

function findSacrificeCandidates(rows, dd, par) {
  const candidates = [];
  for (const r of rows) {
    const c = r.contract;
    const side = SIDE[c.declarer];
    if (!side || !isGame(c.level, c.strain) || c.actualTricks == null) continue;
    const target = 6 + c.level;
    if (c.actualTricks >= target || (dd[side][c.strain] ?? target) >= target) continue;
    const opponent = OTHER_SIDE[side];
    if (!Object.entries(GAME).some(([strain, tricks]) => (dd[opponent][strain] ?? -1) >= tricks)) continue;
    const opponentMadeGames = rows.filter(x => {
      const xc = x.contract;
      return SIDE[xc.declarer] === opponent
        && isGame(xc.level, xc.strain)
        && (dd[opponent][xc.strain] ?? -1) >= 6 + xc.level
        && xc.actualTricks != null
        && xc.actualTricks >= 6 + xc.level;
    });
    const comparableScores = opponentMadeGames.map(x => sideScore(x.scoreNS, side)).filter(Number.isFinite);
    candidates.push({
      side,
      opponent,
      table: r.table,
      room: r.room,
      contract: r.contract.display,
      scoreForSide: sideScore(r.scoreNS, side),
      parMatch: Number.isFinite(par?.scoreNS) && par.scoreNS === r.scoreNS,
      opponentMadeGameCount: opponentMadeGames.length,
      opponentMadeGameScoreRange: comparableScores.length
        ? { min: Math.min(...comparableScores), max: Math.max(...comparableScores) }
        : null,
    });
  }
  return candidates;
}

function practicalNotes(rows, dd, destinations, hand, sacrificeCandidates) {
  const out = [];
  for (const side of ["NS", "EW"]) {
    const possible = Object.entries(GAME)
      .filter(([strain, tricks]) => (dd[side][strain] ?? -1) >= tricks)
      .map(([strain]) => gameContract(strain));
    const sideRows = rows.filter(r => SIDE[r.contract.declarer] === side);
    const gameRows = sideRows.filter(r => isGame(r.contract.level, r.contract.strain));
    const rate = sideRows.length ? gameRows.length / sideRows.length : 0;
    if (possible.length && sideRows.length >= 3 && rate < .5) {
      out.push(`${side} 双明手有成局（${possible.join("、")}），但该方 ${sideRows.length} 个实际定约中只有 ${gameRows.length} 个到成局高度。这里值得复盘成局判断和定约选择。`);
    }
  }

  const mainstream = destinations.find(x => {
    const match = /^(NS|EW) (\d)(C|D|H|S|NT)/.exec(x.key);
    if (!match) return false;
    const [, side, level, strain] = match;
    return isGame(Number(level), strain) && (dd[side][strain] ?? -1) >= 6 + Number(level);
  });
  if (mainstream && rows.length && mainstream.count / rows.length >= .4) {
    const [, side, level, strain] = /^(NS|EW) (\d)(C|D|H|S|NT)/.exec(mainstream.key);
    out.push(`${side} 双明手可做成 ${contractName(level, strain)}；${rows.length} 个实际定约中有 ${mainstream.count} 个落在这个定约，这是场上的主流选择。`);
  }

  const destinationGroups = groupRows(rows, r => `${SIDE[r.contract.declarer]}|${r.contract.level}|${r.contract.strain}`);
  for (const group of destinationGroups.values()) {
    const first = group[0];
    const side = SIDE[first.contract.declarer];
    const target = 6 + first.contract.level;
    const ddTricks = dd[side]?.[first.contract.strain];
    if (group.length < 2 || !isGame(first.contract.level, first.contract.strain) || ddTricks == null || ddTricks >= target) continue;
    const made = group.filter(r => r.contract.actualTricks >= target).length;
    const down = group.length - made;
    out.push(`${side} 有 ${group.length} 个 ${contractName(first.contract.level, first.contract.strain)} 定约，但 DD 显示只能取得 ${ddTricks} 墩；实战 ${made} 个完成、${down} 个宕掉，不能用完成的单桌结果反推这个定约本来可成。`);
  }

  const sacrifice = sacrificeCandidates[0];
  if (sacrifice) {
    const sideRows = rows.filter(r => SIDE[r.contract.declarer] === sacrifice.side);
    const lead = sideRows.length === 1 ? `${sacrifice.side} 唯一的实际定约` : `${sacrifice.side} 的 ${sacrifice.contract}`;
    let note = `${lead}是 ${humanContract(sacrifice.contract)}，该方得分 ${signedScore(sacrifice.scoreForSide)}`;
    if (sacrifice.parMatch) note += "，并且与本副 Par 得分一致";
    const range = sacrifice.opponentMadeGameScoreRange;
    if (range) {
      note += `；相较 ${sacrifice.opponent} 完成成局时该方的 ${formatRange(range)}，这个结果更像有利的牺牲，而不是尝试完成本方成局`;
    } else {
      note += "；对方双明手有成局，而本方这个定约双明手不可成，因此更像牺牲叫";
    }
    out.push(`${note}。`);
  }

  if (rows.some(r => r.contract.double)) {
    out.push(`实际定约中有 ${rows.filter(r => r.contract.double).length} 个加倍或红加倍结果。`);
  }
  return out;
}

function openingLeads(rows) {
  const cards = [];
  for (const r of rows) {
    const opening = r.openingLead || {};
    const card = String(opening.card || "").trim()
      || `${String(opening.suit || "").trim()}${String(opening.rank || "").trim()}`.trim();
    if (card) cards.push(card.toUpperCase());
  }
  return { count: cards.length, distribution: sortedCountRows(groupCount(cards, x => x), cards.length) };
}

function groupRows(rows, keyFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = grouped.get(key) || [];
    group.push(row);
    grouped.set(key, group);
  }
  return grouped;
}

function gameContract(strain) {
  if (strain === "NT") return "3NT";
  if (strain === "H" || strain === "S") return `4${strain}`;
  return `5${strain}`;
}

function contractName(level, strain) {
  return `${level}${({ C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" })[strain] || strain}`;
}

function humanContract(display) {
  return String(display).replace(/(\d)(C|D|H|S|NT)/, (_, level, strain) => contractName(level, strain));
}

function sideScore(scoreNS, side) {
  return side === "NS" ? scoreNS : -scoreNS;
}

function signedScore(value) {
  return value > 0 ? `+${value}` : String(value);
}

function formatRange({ min, max }) {
  return min === max ? signedScore(min) : `${signedScore(min)} 至 ${signedScore(max)}`;
}
