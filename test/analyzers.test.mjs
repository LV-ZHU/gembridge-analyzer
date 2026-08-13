import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {normalizeHand,normalizeBoardResult,normalizeRoundTable,normalizeDatumRound,normalizeButler} from '../src/gembridge/normalize.mjs';import {analyzeMatch} from '../src/analyzers/match.mjs';import {analyzeButler} from '../src/analyzers/butler.mjs';import {analyzePlayer} from '../src/analyzers/player.mjs';
import {analyzeBoard} from '../src/analyzers/board.mjs';import {boardMarkdown} from '../src/reports/markdown.mjs';
const j=n=>JSON.parse(fs.readFileSync(new URL(`./fixtures/${n}`,import.meta.url),'utf8'));
test('table68 room pairing gives +8 IMP to room1 NS team',()=>{const h=normalizeHand(j('board-r1b2-hand.json')),results=j('board-r1b2-results.json').map(r=>normalizeBoardResult(r,h));const board={hand:h,results};const m=normalizeRoundTable({...j('round7-table61.json'),round:1,table:68,ns:1,nsName:'A',ew:2,ewName:'B',impsNS:8,impsEW:0,vpNS:12.61,vpEW:7.39,lowBoard:2,highBoard:2,boardCompleteCount:1});const a=analyzeMatch(m,[board]);assert.equal(a.boards[0].board,2);assert.equal(a.boards[0].teamAGain,8);assert.equal(a.boards[0].room1.scoreNS-a.boards[0].room2.scoreNS,350)});
test('Butler analyzer validates official formula',()=>{const a=analyzeButler(normalizeButler(j('butler.json')));assert.equal(a.validation[0].butlerOk,true);assert.equal(a.validation[0].correctedOk,true)});
test('player analyzer aggregates datum round',()=>{const d=normalizeDatumRound(j('datum-r1.json'));const b=normalizeButler(j('butler.json'));const a=analyzePlayer({memberNo:'082034',datumRounds:[d],butler:b});assert.equal(a.totalXimp,55);assert.equal(a.boardCount,12);assert.equal(a.validation.datumSumEqualsRoundTotals,true);assert.equal(a.partners[0].name,'范浥尘');assert.equal(a.partners[0].boards,12)});
test('2025 R1 B1 excludes empty placeholders and treats 4SX as a sacrifice',()=>{
  const handCache=j('hand-2025-r1b1-cache.json'),resultCache=j('board-2025-r1b1-cache.json');
  const hand=normalizeHand(handCache.data,{url:handCache.url});
  const results=resultCache.data.map(row=>normalizeBoardResult(row,hand,{url:resultCache.url}));
  const board={hand,results},analysis=analyzeBoard(board),markdown=boardMarkdown(board,analysis);
  assert.equal(results.filter(r=>r.recordKind==='empty-placeholder').length,3);
  assert.equal(results.filter(r=>r.recordKind==='no-play').length,1);
  assert.equal(analysis.allResultCount,14);
  assert.equal(analysis.fieldResultCount,11);
  assert.equal(analysis.playedResultCount,10);
  assert.equal(analysis.noPlayCount,1);
  assert.equal(analysis.excludedResultCount,3);
  assert.deepEqual(analysis.destinations.map(({key,count})=>[key,count]),[['EW 4H',7],['EW 3NT',2],['NoPlay',1],['NS 4SX',1]]);
  assert.equal(analysis.gameCount,10);
  assert.equal(analysis.madeGameCount,8);
  assert.equal(analysis.sacrificeCandidates[0].parMatch,true);
  assert.match(analysis.notes.join('\n'),/有利的牺牲/);
  assert.doesNotMatch(analysis.notes.join('\n'),/NS 双明手没有标准成局可成/);
  assert.match(markdown,/11 个 room，其中 10 个实际定约、1 个 NoPlay/);
  assert.match(markdown,/121\|1\/2（两室相同）\|E 4H \+2/);
  assert.doesNotMatch(markdown,/NO CONTRACT \/ ADJUSTED/);
});

test('2025 R1 B11 surfaces the 7C par gap and does not invent a double',()=>{
  const hand={
    round:1,board:11,dealer:'S',vulnerability:'None',
    hands:{
      N:{hcp:7,S:'AQJT94',H:'T62',D:'7',C:'T73'},
      E:{hcp:12,S:'K63',H:'43',D:'QJT3',C:'AQ96'},
      S:{hcp:7,S:'8752',H:'KJ7',D:'K864',C:'54'},
      W:{hcp:14,S:'-',H:'AQ985',D:'A952',C:'KJ82'},
    },
    doubleDummyTricks:{
      N:{C:0,D:0,H:1,S:6,NT:2},E:{C:13,D:12,H:12,S:7,NT:11},
      S:{C:0,D:0,H:1,S:6,NT:2},W:{C:13,D:12,H:12,S:7,NT:11},
    },
    par:{contracts:['7C EW ='],scoreNS:-1440},
  };
  const results=[
    played(121,1,'N',3,'S','X','-3',6,-500,-60,-2),
    played(121,2,'E',3,'NT','','+2',11,-460,-20,-1),
    played(122,1,'E',3,'NT','','+2',11,-460,-20,-1),
    played(122,2,'W',4,'H','','+2',12,-480,-40,-1),
    played(123,1,'W',5,'C','','=',11,-400,40,1),
    played(123,2,'E',3,'NT','','+1',10,-430,10,0),
    played(124,1,'E',3,'NT','','+2',11,-460,-20,-1),
    played(124,2,'E',3,'NT','','+1',10,-430,10,0),
    played(125,1,'W',5,'C','','+1',12,-420,20,1),
    played(125,2,'N',4,'S','','-3',7,-150,290,7),
  ];
  const board={hand,results},analysis=analyzeBoard(board),markdown=boardMarkdown(board,analysis);
  const slam=analysis.slamOpportunities.find(x=>x.side==='EW');
  assert.deepEqual(slam.ddSlams.map(x=>x.contract),['7C','6D','6H']);
  assert.deepEqual(slam.parSlams.map(x=>x.display),['7C EW =']);
  assert.equal(slam.fieldContractCount,8);
  assert.equal(slam.fieldSlamCount,0);
  assert.equal(analysis.sacrificeCandidates[0].contract,'N 4S -3');
  assert.equal(analysis.sacrificeCandidates[0].doubled,false);
  assert.match(analysis.notes.join('\n'),/Par 指向 7♣ EW =/);
  assert.match(analysis.notes.join('\n'),/8 个实际定约没有一个到满贯/);
  assert.match(analysis.notes.join('\n'),/8张方块和8张梅花双配合，W 的黑桃缺门/);
  assert.match(analysis.notes.join('\n'),/无将最多 11 墩，套约却可做成 7♣、6♦、6♥/);
  assert.match(markdown,/## 满贯机会/);
  assert.match(markdown,/\|EW\|7♣、6♦、6♥\|7♣ EW =\|0\/8\|/);
  assert.match(markdown,/N 4♠ -3 未被加倍/);
  assert.doesNotMatch(markdown,/N 4♠ -3 被加倍/);
  assert.doesNotMatch(markdown,/N 4S -3是 N 4♠ -3/);
});

function played(table,room,declarer,level,strain,double,result,actualTricks,scoreNS,datumDifference,ximp){
  return {
    table,room,recordKind:'played-contract',flags:{},scoreNS,datumDifference,ximp,
    contract:{declarer,level,strain,double,result,actualTricks,display:`${declarer} ${level}${strain}${double} ${result}`},
  };
}
