#!/usr/bin/env node
import { parseArgs } from "./core/args.mjs";
import { parseRange, intArg } from "./core/range.mjs";
import { mapLimit } from "./core/concurrency.mjs";
import { writeOutput, loadJson } from "./core/output.mjs";
import { parseGemBridgeUrl, withMeta } from "./gembridge/url.mjs";
import { GemBridgeApi } from "./gembridge/api.mjs";
import { normalizeBoardBundle, normalizeRoundMeta, normalizeRoundTable, normalizeRoundRank, normalizeSwissTeam, normalizeDatumRound, normalizeButler } from "./gembridge/normalize.mjs";
import { analyzeBoard } from "./analyzers/board.mjs";
import { analyzeMatch } from "./analyzers/match.mjs";
import { analyzeStandings } from "./analyzers/standings.mjs";
import { analyzeButler } from "./analyzers/butler.mjs";
import { analyzePlayer } from "./analyzers/player.mjs";
import { analyzeTeam } from "./analyzers/team.mjs";
import { analyzeRound } from "./analyzers/round.mjs";
import { analyzeEvent } from "./analyzers/event.mjs";
import { boardMarkdown, matchMarkdown, standingsMarkdown, butlerMarkdown, playerMarkdown, teamMarkdown, roundMarkdown, eventMarkdown } from "./reports/markdown.mjs";

const {pos,opts}=parseArgs(process.argv.slice(2));const [cmd,url]=pos;
if(opts.help||!cmd||['help','-h','--help'].includes(cmd)){help();process.exit(0)}
if(cmd==='doctor'){doctor();process.exit(0)}
if(!url)die('需要一个 GemBridge score URL');
const meta=parseGemBridgeUrl(url);const format=opts.json?'json':(opts.format||'md');const api=new GemBridgeApi({proxy:opts.proxy,timeoutMs:Number(opts.timeout||15000),retries:Number(opts.retries||2),cacheDir:opts['cache-dir']||'.cache/gembridge-analyzer',cacheTtlMs:Number(opts['cache-ttl']||300000),cache:!opts['no-cache'],refresh:Boolean(opts.refresh)});const concurrency=Number(opts.concurrency||5);
const progress=opts.quiet?()=>{}:({done,total})=>process.stderr.write(`\r获取 ${done}/${total}${done===total?'\n':''}`);

try{
  if(cmd==='board') await runBoard();
  else if(cmd==='match') await runMatch();
  else if(cmd==='standings') await runStandings();
  else if(cmd==='butler') await runButler();
  else if(cmd==='player') await runPlayer();
  else if(cmd==='team') await runTeam();
  else if(cmd==='round') await runRound();
  else if(cmd==='event') await runEvent();
  else if(cmd==='fetch') await runFetch();
  else die(`未知命令: ${cmd}`);
}catch(e){console.error(`\n错误：${e.message||e}`);process.exit(1)}

async function fetchBoard(m){const raw=await api.getBoard(m);return normalizeBoardBundle({meta:m,hand:raw.hand,results:raw.results})}
async function fetchBoards(m,boards){return mapLimit(boards,concurrency,b=>fetchBoard(withMeta(m,{board:b})),progress)}
async function roundTables(m){const r=await api.getRoundTables(m);return (r.data||[]).map(x=>normalizeRoundTable(x,r.meta))}
async function swiss(m){const r=await api.getSwiss(m);return (r.data||[]).map(x=>normalizeSwissTeam(x,r.meta))}
async function ranks(m){const r=await api.getRoundRanks(m);return {round:m.round,rows:(r.data||[]).map(x=>normalizeRoundRank(x,r.meta))}}
async function datum(m){const r=await api.getDatumRound(m);return normalizeDatumRound(r.data,r.meta)}
async function butler(){const r=await api.getButler(meta);return normalizeButler(r.data,r.meta)}

async function runBoard(){if(meta.board==null)die('board 命令需要 URL 中的 board');const b=await fetchBoard(meta),manual=await loadJson(opts.notes),a=analyzeBoard(b,{manual});await writeOutput(format==='json'?{board:b,analysis:a}:boardMarkdown(b,a,{reveal:!opts['no-reveal'],seat:opts.seat?.toUpperCase()}),{out:opts.out,format})}
async function runMatch(){const table=intArg(opts.table||'', 'table',{min:1});const tables=await roundTables(meta),m=tables.find(x=>x.table===table);if(!m)die(`第${meta.round}轮未找到 ${table}桌`);const boards=parseRange(opts.boards||`${m.boardRange.low||1}-${m.boardRange.high||12}`,{min:1,max:99}),bs=await fetchBoards(meta,boards),a=analyzeMatch(m,bs);await writeOutput(format==='json'?{match:m,analysis:a}:matchMarkdown(a),{out:opts.out,format})}
async function runStandings(){const s=await swiss(meta);let prev=null;if(meta.round>1){const p=await api.getSwiss(withMeta(meta,{round:meta.round-1}));prev=(p.data||[]).map(x=>normalizeSwissTeam(x,p.meta))}const a=analyzeStandings(s,{previousRanks:prev});await writeOutput(format==='json'?a:standingsMarkdown(a,meta.round),{out:opts.out,format})}
async function runButler(){const b=await butler(),a=analyzeButler(b);await writeOutput(format==='json'?{butler:b,analysis:a}:butlerMarkdown(a),{out:opts.out,format})}
async function runPlayer(){const rounds=parseRange(opts.rounds||`1-${meta.round}`,{min:1,max:99}),ds=await mapLimit(rounds,concurrency,r=>datum(withMeta(meta,{round:r})),progress),b=await butler();const a=analyzePlayer({memberNo:opts.player,name:opts.name,datumRounds:ds,butler:b});if(!a.name&&!a.memberNo)die('未找到牌手；用 --player 会员号 或 --name 姓名');await writeOutput(format==='json'?a:playerMarkdown(a),{out:opts.out,format})}
async function runTeam(){const no=intArg(opts.team||'', 'team',{min:1});const rounds=parseRange(opts.rounds||`1-${meta.round}`,{min:1,max:99});const finalMeta=withMeta(meta,{round:Math.max(...rounds)});const finalSwiss=await swiss(finalMeta),t=finalSwiss.find(x=>x.teamNo===no);if(!t)die(`未找到队号 ${no}`);const rankSnapshots=await mapLimit(rounds,concurrency,r=>ranks(withMeta(meta,{round:r})),progress);const tableByRound=await mapLimit(rounds,concurrency,async r=>(await roundTables(withMeta(meta,{round:r}))).map(x=>({...x,round:r})),progress);const tables=tableByRound.flat();let deep=[];if(opts.deep){for(const r of rounds){const tm=tables.find(x=>x.round===r&&(x.nsTeam.no===no||x.ewTeam.no===no));if(!tm)continue;const bs=await fetchBoards(withMeta(meta,{round:r}),parseRange(`${tm.boardRange.low||1}-${tm.boardRange.high||12}`,{min:1,max:99}));const ma=analyzeMatch(tm,bs);ma.teamPerspectiveNo=no;for(const b of ma.boards)b.teamGain=(tm.nsTeam.no===no?b.teamAGain:-b.teamAGain);deep.push(ma)}}const a=analyzeTeam({team:t,rankSnapshots,roundTables:tables,deepMatches:deep});await writeOutput(format==='json'?a:teamMarkdown(a),{out:opts.out,format})}
async function runRound(){const [rmR,tables,s]=await Promise.all([api.getRoundMeta(meta),roundTables(meta),swiss(meta)]);const rm=normalizeRoundMeta(rmR.data,rmR.meta);let bas=[],mas=[];if(opts.deep){const low=Math.min(...tables.map(t=>t.boardRange.low).filter(Number.isFinite),1),high=Math.max(...tables.map(t=>t.boardRange.high).filter(Number.isFinite),12);const boards=parseRange(opts.boards||`${low}-${high}`,{min:1,max:99});const bs=await fetchBoards(meta,boards);bas=bs.map(b=>analyzeBoard(b));mas=tables.map(t=>analyzeMatch(t,bs))}const stand=analyzeStandings(s);const a=analyzeRound({roundMeta:rm,tables,boardAnalyses:bas,matchAnalyses:mas,standings:stand});await writeOutput(format==='json'?a:roundMarkdown(a),{out:opts.out,format})}
async function runEvent(){const rounds=parseRange(opts.rounds||`1-${meta.round}`,{min:1,max:99}),finalMeta=withMeta(meta,{round:Math.max(...rounds)}),finalSwiss=await swiss(finalMeta),rankSnapshots=await mapLimit(rounds,concurrency,r=>ranks(withMeta(meta,{round:r})),progress),b=await butler(),ba=analyzeButler(b);const summaries=[];for(const r of rounds){const m=withMeta(meta,{round:r});const [rmR,tables]=await Promise.all([api.getRoundMeta(m),roundTables(m)]);const rm=normalizeRoundMeta(rmR.data,rmR.meta);let bas=[],mas=[];if(opts.deep){const low=Math.min(...tables.map(t=>t.boardRange.low).filter(Number.isFinite),1),high=Math.max(...tables.map(t=>t.boardRange.high).filter(Number.isFinite),12);const boards=parseRange(opts.boards||`${low}-${high}`,{min:1,max:99}),bs=await fetchBoards(m,boards);bas=bs.map(x=>analyzeBoard(x));mas=tables.map(t=>analyzeMatch(t,bs))}summaries.push(analyzeRound({roundMeta:rm,tables,boardAnalyses:bas,matchAnalyses:mas}))}const a=analyzeEvent({finalSwiss,rankSnapshots,roundSummaries:summaries,butlerAnalysis:ba});await writeOutput(format==='json'?a:eventMarkdown(a),{out:opts.out,format})}
async function runFetch(){const scope=opts.scope||'board';let data;if(scope==='board')data=await fetchBoard(meta);else if(scope==='round')data={meta:normalizeRoundMeta((await api.getRoundMeta(meta)).data),tables:await roundTables(meta),ranks:await ranks(meta),swiss:await swiss(meta),datum:await datum(meta)};else if(scope==='event')data={swiss:await swiss(meta),butler:await butler()};else die('--scope 支持 board|round|event');await writeOutput(data,{out:opts.out,format:'json'})}
function doctor(){console.log(`Node ${process.version}\n代理: ${process.env.GEMBRIDGE_PROXY||process.env.HTTP_PROXY||'(未设置)'}\n状态: CLI 可启动。运行 npm test 做完整离线测试。`)}
function die(s){console.error(s);help();process.exit(2)}
function help(){console.log(`gembridge-analyzer 1.0\n\n命令:\n  board URL                 单副牌学习/技术分析\n  match URL --table 61      一场12副对抗\n  round URL [--deep]        一整轮；--deep 时抓逐副牌\n  team URL --team 24 [--deep]\n  player URL --player 082034\n  standings URL             排名与tie-break\n  butler URL                Butler/AOB/修正Butler\n  event URL [--deep]        赛事总览；--deep 时抓所有逐副牌\n  fetch URL --scope board|round|event\n  doctor\n\n常用参数:\n  --proxy URL      可选的HTTP代理\n  --rounds 1-8   --boards 1-12   --concurrency 5\n  --json          输出JSON\n  --out FILE      写文件\n  --refresh       忽略缓存重新请求\n  --no-cache      禁用缓存\n  --no-reveal     board学习模式隐藏全场结果\n  --seat S        board学习模式只先显示指定座位\n  --notes FILE    人工补录auction/首攻/打法\n\n例子:\n  node src/cli.mjs board "<TeamRoundBoards URL>"\n  node src/cli.mjs match "<TeamRoundResultAndRank URL>" --table 61\n  node src/cli.mjs event "<SectionSwiss URL>" --rounds 1-8 --deep --out reports/event.md`)}
