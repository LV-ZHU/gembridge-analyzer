import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/core/args.mjs';
import { unwrapJson } from '../src/core/http.mjs';

test('--word is a boolean option and does not require a value',()=>{
  const {pos,opts}=parseArgs(['board','https://example.test/','--word']);
  assert.deepEqual(pos,['board','https://example.test/']);
  assert.equal(opts.word,true);
});

test('--strict and --version are boolean options',()=>{
  const {opts}=parseArgs(['fetch','--strict','--version']);
  assert.equal(opts.strict,true);
  assert.equal(opts.version,true);
});

test('unknown options fail with a concise error',()=>{
  assert.throws(()=>parseArgs(['board','--wrod']),/未知参数: --wrod/);
});

test('value options support both space and equals forms',()=>{
  assert.equal(parseArgs(['match','--table','61']).opts.table,'61');
  assert.equal(parseArgs(['match','--table=61']).opts.table,'61');
});

test('double-encoded JSON API payloads are unwrapped',()=>{
  const payload={round:1,ximps:[{no:'082034'}]};
  assert.deepEqual(unwrapJson(JSON.stringify(payload)),payload);
  assert.deepEqual(unwrapJson(JSON.stringify(JSON.stringify(payload))),payload);
});
