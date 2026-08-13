import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boardUrl = 'http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2025-08-12&tour=32053&event=bb9294eb-d322-45d7-ae8f-855dc42f3c94&section=dfc366b1-966f-413b-a7ca-73bb5544f664&round=1&seg=0&board=1&from=ccba';

test('CLI --help and doctor start cleanly', () => {
  for (const args of [['src/cli.mjs', '--help'], ['src/cli.mjs', 'doctor']]) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.length > 0);
  }
});

test('CLI accepts a full URL pasted without quotes after the prompt (offline cache)', () => {
  withFixtureCache((cacheDir) => {
    const result = runCli(['board', '--no-reveal', '--cache-dir', cacheDir], { input: `${boardUrl}\n` });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /请直接粘贴完整的 CCBA \/ GemBridge 赛事链接（不需要引号）/);
    assert.match(result.stdout, /# R1 B1/);
    assert.match(result.stdout, /全场结果暂时隐藏/);
  });
});

test('CLI reports an unknown option without a stack trace', () => {
  const result = runCli(['board', '--wrod']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /参数错误: 未知参数: --wrod/);
  assert.doesNotMatch(result.stderr, /at parseArgs|ModuleJob/);
});

test('CLI creates a real DOCX with --word from offline cache', () => {
  withFixtureCache((cacheDir) => {
    const out = path.join(os.tmpdir(), `gembridge-cli-test-word-${process.pid}.docx`);
    const result = runCli(['board', boardUrl, '--word', '--cache-dir', cacheDir, '--out', out]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.statSync(out).size > 5000);
    assert.equal(fs.readFileSync(out).subarray(0, 2).toString(), 'PK');
    fs.rmSync(out, { force: true });
  });
});

function runCli(args, options = {}) {
  return spawnSync(process.execPath, ['src/cli.mjs', ...args], { cwd: root, encoding: 'utf8', ...options });
}

function withFixtureCache(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gembridge-cache-'));
  try {
    for (const name of ['hand-2025-r1b1-cache.json', 'board-2025-r1b1-cache.json']) {
      const fixture = JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
      const key = crypto.createHash('sha256').update(fixture.url).digest('hex');
      fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify({ ...fixture, fetchedAt: new Date().toISOString() }), 'utf8');
    }
    callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
