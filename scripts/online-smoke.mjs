import { spawnSync } from "node:child_process";

const boardUrl =
  "http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba";
const eventUrl =
  "http://www.gembridge.cn/score/SectionSwiss?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&byrank=true&from=ccba";
const matchUrl =
  "http://www.gembridge.cn/score/TeamRoundResultAndRank?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&seg=0&from=ccba";

const cases = [
  ["board", ["board", boardUrl, "--quiet"], /# R1 B2/],
  [
    "match",
    ["match", matchUrl, "--table", "61", "--boards", "1-2", "--quiet"],
    /15–24 IMP/,
  ],
  ["round", ["round", eventUrl, "--quiet"], /# 第7轮/],
  [
    "team",
    ["team", eventUrl, "--team", "24", "--rounds", "1-2", "--quiet"],
    /U16上海胡荣华公开红队/,
  ],
  [
    "player",
    ["player", eventUrl, "--player", "082034", "--rounds", "1", "--quiet"],
    /总XIMP：\+55，12 副/,
  ],
  ["standings", ["standings", eventUrl, "--quiet"], /第7轮后排名/],
  ["butler", ["butler", eventUrl, "--quiet"], /修正Butler/],
  ["event", ["event", eventUrl, "--rounds", "1-2", "--quiet"], /赛事概览/],
  [
    "fetch board",
    ["fetch", boardUrl, "--scope", "board", "--strict", "--quiet"],
    snapshotIs("board"),
  ],
  [
    "fetch round",
    ["fetch", eventUrl, "--scope", "round", "--strict", "--quiet"],
    snapshotIs("round"),
  ],
  [
    "fetch event",
    [
      "fetch",
      eventUrl,
      "--scope",
      "event",
      "--rounds",
      "1-2",
      "--strict",
      "--quiet",
    ],
    snapshotIs("event"),
  ],
];

let failures = 0;
for (const [name, args, verify] of cases) {
  const result = spawnSync(
    process.execPath,
    ["src/cli.mjs", ...args, "--no-cache"],
    {
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
    },
  );
  const ok =
    result.status === 0 &&
    result.stdout.length > 0 &&
    verifyOutput(verify, result.stdout);
  console.log(
    `${name.padEnd(14)} ${ok ? "PASS" : "FAIL"} (${result.stdout.length} bytes)`,
  );
  if (!ok) {
    failures++;
    process.stderr.write(result.stderr || "no error output\n");
  }
}

if (failures) process.exitCode = 1;

function snapshotIs(scope) {
  return (text) => {
    const snapshot = JSON.parse(text);
    return (
      snapshot.schemaVersion === "1.1.0" &&
      snapshot.scope === scope &&
      snapshot.dataQuality.summary.errors === 0
    );
  };
}

function verifyOutput(verify, output) {
  if (verify instanceof RegExp) return verify.test(output);
  if (typeof verify === "function") {
    try {
      return Boolean(verify(output));
    } catch {
      return false;
    }
  }
  return true;
}
