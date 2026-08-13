import { groupCount, sortedCountRows, stats, entropyFromCounts, clamp, pct } from "../core/utils.mjs";
import { cardCount, sideFits } from "../bridge/hands.mjs";
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
  const slamOpportunities = slamOpportunitiesBySide(playedRows, dd, h.par);
  const sacrificeCandidates = findSacrificeCandidates(playedRows, dd, h.par);
  const notes = practicalNotes(playedRows, dd, destinations, h, slamOpportunities, sacrificeCandidates);
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
    slamOpportunities,
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
        "DD slam opportunities and field gap",
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

function slamOpportunitiesBySide(rows, dd, par) {
  const parsedPar = (par?.contracts || []).map(parseParContract).filter(Boolean);
  const out = [];
  for (const side of ["NS", "EW"]) {
    const ddSlams = ["C", "D", "H", "S", "NT"]
      .map(strain => {
        const tricks = dd[side][strain];
        if (!Number.isFinite(tricks) || tricks < 12) return null;
        const level = Math.min(7, tricks - 6);
        return { strain, tricks, level, contract: `${level}${strain}` };
      })
      .filter(Boolean)
      .sort((a, b) => b.level - a.level || strainOrder(a.strain) - strainOrder(b.strain));
    if (!ddSlams.length) continue;

    const sideRows = rows.filter(r => SIDE[r.contract.declarer] === side);
    const slamRows = sideRows.filter(r => isSlam(r.contract.level));
    const fieldDestinations = sortedCountRows(
      groupCount(sideRows, r => `${r.contract.level}${r.contract.strain}${r.contract.double || ""}`),
      sideRows.length,
    );
    out.push({
      side,
      ddSlams,
      parSlams: parsedPar.filter(x => x.side === side && x.level >= 6),
      fieldContractCount: sideRows.length,
      fieldSlamCount: slamRows.length,
      fieldSlamRate: sideRows.length ? slamRows.length / sideRows.length : 0,
      fieldDestinations,
      parScoreForSide: Number.isFinite(par?.scoreNS) ? sideScore(par.scoreNS, side) : null,
    });
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
      doubled: Boolean(c.double),
      double: c.double || "",
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

function practicalNotes(rows, dd, destinations, hand, slamOpportunities, sacrificeCandidates) {
  const out = [];

  for (const opportunity of slamOpportunities) {
    const ddText = opportunity.ddSlams.map(x => humanContract(x.contract)).join("、");
    const parText = opportunity.parSlams.map(x => humanContract(x.display)).join(" / ");
    const hcp = sideHcp(hand, opportunity.side);
    if (parText) {
      const parScore = Number.isFinite(hand.par?.scoreNS) ? signedScore(hand.par.scoreNS) : "未知";
      out.push(`Par 指向 ${parText}（NS视角 ${parScore}）；DD 显示 ${opportunity.side} 可做成 ${ddText}。技术上限已经到满贯，不能只停留在场上成局定约之间的比较。`);
    } else {
      out.push(`DD 显示 ${opportunity.side} 可做成 ${ddText}，技术上限已经到满贯。`);
    }
    if (opportunity.ddSlams.some(x => x.level === 7) && hcp < 30) {
      const assets = sideShapeAssets(hand, opportunity.side);
      out.push(`${opportunity.side} 合计 ${hcp} HCP 仍有双明手大满贯，说明这副不能只按点力判断${assets ? `；具体牌型资源包括 ${assets}` : "，还要结合牌型、配合与控制"}。`);
    }
    if (opportunity.fieldContractCount) {
      const fieldText = opportunity.fieldDestinations
        .slice(0, 4)
        .map(x => `${humanContract(x.key)} ${x.count} 个`)
        .join("、");
      if (opportunity.fieldSlamCount === 0) {
        out.push(`${opportunity.side} 的 ${opportunity.fieldContractCount} 个实际定约没有一个到满贯（${fieldText}）。DD/Par 是看见四手牌后的技术上限，不等于实战必须叫到；这里真正值得复盘的是如何确认将牌配合、短门和控制，并区分小满贯与大满贯。`);
      } else {
        out.push(`${opportunity.side} 的 ${opportunity.fieldContractCount} 个实际定约中有 ${opportunity.fieldSlamCount} 个到满贯（${fieldText}），可以比较到达满贯与停在成局的叫牌信息是否充分。`);
      }
    }
    const ntChoice = opportunity.fieldDestinations.find(x => /NT$/.test(x.key));
    if (ntChoice && (dd[opportunity.side].NT ?? -1) < 12) {
      out.push(`DD 中 ${opportunity.side} 无将最多 ${dd[opportunity.side].NT} 墩，套约却可做成 ${ddText}；场上仍有 ${ntChoice.count} 个 ${humanContract(ntChoice.key)}。这个主流成局落点拿分直接，但也容易掩盖套约的满贯空间。`);
    }
  }

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
    if (!slamOpportunities.some(x => x.side === side)) {
      out.push(`${side} 双明手可做成 ${contractName(level, strain)}；${rows.length} 个实际定约中有 ${mainstream.count} 个落在这个定约，这是场上的主流选择。`);
    }
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
    const contract = humanContract(sacrifice.contract);
    let note = sideRows.length === 1
      ? `${contract} 是 ${sacrifice.side} 唯一的实际定约，该方得分 ${signedScore(sacrifice.scoreForSide)}`
      : `${sacrifice.side} 的 ${contract} 得分 ${signedScore(sacrifice.scoreForSide)}`;
    if (sacrifice.parMatch) note += "，并且与本副 Par 得分一致";
    const range = sacrifice.opponentMadeGameScoreRange;
    if (range) {
      if (sacrifice.doubled) {
        note += `；相较 ${sacrifice.opponent} 完成成局时该方的 ${formatRange(range)}，加倍后的代价仍更低，结果上是有利的牺牲`;
      } else {
        note += `；相较 ${sacrifice.opponent} 完成成局时该方的 ${formatRange(range)}，结果上像有利的竞争或牺牲，但这个定约未被加倍`;
      }
    } else {
      note += "；对方双明手有成局，而本方这个定约双明手不可成，因此更像牺牲叫";
    }
    if (!sacrifice.doubled) note += "。没有叫牌记录时，不能据此确认叫牌原意，也不能忽略对方没有处罚到位的可能";
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

function parseParContract(display) {
  const text = String(display || "").trim();
  const match = /^(\d)(NT|C|D|H|S)(X{1,2})?\s+(NS|EW)(?:\s+(=|[+-]\d+))?/i.exec(text);
  if (!match) return null;
  const [, level, strain, double = "", side, result = ""] = match;
  return {
    display: text,
    level: Number(level),
    strain: strain.toUpperCase(),
    double: double.toUpperCase(),
    side: side.toUpperCase(),
    result,
  };
}

function strainOrder(strain) {
  return ["C", "D", "H", "S", "NT"].indexOf(strain);
}

function sideHcp(hand, side) {
  const directions = side === "NS" ? ["N", "S"] : ["E", "W"];
  return directions.reduce((sum, direction) => sum + (hand.hands[direction]?.hcp || 0), 0);
}

function sideShapeAssets(hand, side) {
  const fits = sideFits(hand.hands).filter(x => x.side === side);
  const fitText = fits.length
    ? `${fits.map(x => `${x.length}张${strainName(x.strain)}`).join('和')}${fits.length > 1 ? '双配合' : '配合'}`
    : "";
  const directions = side === "NS" ? ["N", "S"] : ["E", "W"];
  const voidText = directions
    .flatMap(direction => ["S", "H", "D", "C"]
      .filter(strain => cardCount(hand.hands[direction]?.[strain]) === 0)
      .map(strain => `${direction} 的${strainName(strain)}缺门`))
    .join("、");
  return [fitText, voidText].filter(Boolean).join("，");
}

function strainName(strain) {
  return ({ C: "梅花", D: "方块", H: "红心", S: "黑桃", NT: "无将" })[strain] || strain;
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
