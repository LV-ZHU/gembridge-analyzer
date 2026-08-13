import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('CLI --help and doctor start cleanly',()=>{for(const args of [['src/cli.mjs','--help'],['src/cli.mjs','doctor']]){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.length>0)}});
