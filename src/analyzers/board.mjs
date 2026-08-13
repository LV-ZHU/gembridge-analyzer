import { groupCount, sortedCountRows, stats, entropyFromCounts, clamp, pct } from "../core/utils.mjs";
import { sideFits } from "../bridge/hands.mjs";
import { isGame, isSlam } from "../bridge/scoring.mjs";
const SIDE={N:'NS',S:'NS',E:'EW',W:'EW'};
const GAME={NT:9,S:10,H:10,D:11,C:11};

export function analyzeBoard(board,{manual=null}={}){
  const rs=board.results.filter(r=>r.scoreNS!=null);const h=board.hand;
  const exact=sortedCountRows(groupCount(rs,r=>r.contract.display),rs.length);const dest=sortedCountRows(groupCount(rs,destinationKey),rs.length);const strains=sortedCountRows(groupCount(rs,r=>`${SIDE[r.contract.declarer]||'?'} ${r.contract.strain||'?'}`),rs.length);
  const x=rs.map(r=>r.ximp).filter(Number.isFinite),scores=rs.map(r=>r.scoreNS).filter(Number.isFinite);const fits=sideFits(h.hands);const dd=ddBySide(h);const notes=practicalNotes(rs,dd,dest);
  const doubles=rs.filter(r=>r.contract.double).length,games=rs.filter(r=>isGame(r.contract.level,r.contract.strain)).length,slams=rs.filter(r=>isSlam(r.contract.level)).length;
  const e=entropyFromCounts(dest.map(r=>r.count)),xr=x.length?Math.max(...x)-Math.min(...x):0,sr=scores.length?Math.max(...scores)-Math.min(...scores):0;
  const study=Math.round(100*(.24*clamp(e/3,0,1)+.28*clamp(xr/20,0,1)+.14*clamp(sr/1200,0,1)+.12*clamp(doubles/Math.max(1,rs.length*.12),0,1)+.12*clamp(games/Math.max(1,rs.length*.45),0,1)+.10*clamp(notes.length/3,0,1)));
  const leads=openingLeads(rs);
  return {board:h.board,round:h.round,dealer:h.dealer,vulnerability:h.vulnerability,hcp:{NS:(h.hands.N.hcp||0)+(h.hands.S.hcp||0),EW:(h.hands.E.hcp||0)+(h.hands.W.hcp||0)},fits,par:h.par,ddBySide:dd,resultCount:rs.length,tableCount:new Set(rs.map(r=>r.table).filter(Number.isFinite)).size,exactResults:exact,destinations:dest,sideStrains:strains,gameCount:games,gameRate:rs.length?games/rs.length:0,slamCount:slams,doubleCount:doubles,ximp:stats(x),scoreNS:stats(scores),outliers:[...rs].filter(r=>Number.isFinite(r.ximp)).sort((a,b)=>Math.abs(b.ximp)-Math.abs(a.ximp)).slice(0,10).map(compact),notes,openingLeads:leads,studyValue:{score:study,label:study>=75?'优先复盘':study>=50?'值得细看':study>=30?'快速过一遍':'低优先级',basis:'heuristic'},manual,provenance:{derived:['hcp totals','fits','field distributions','rates','studyValue','notes'],manual:manual?true:false}};
}
function destinationKey(r){const c=r.contract;if(!c.level||!c.strain)return r.recordKind==='played-contract'?'UNKNOWN':'NO CONTRACT / ADJUSTED';return `${SIDE[c.declarer]||'?'} ${c.level}${c.strain}${c.double||''}`}
function compact(r){return {table:r.table,room:r.room,contract:r.contract.display,scoreNS:r.scoreNS,datumDifference:r.datumDifference,ximp:r.ximp}}
function ddBySide(h){const out={NS:{},EW:{}};for(const [side,dirs] of [['NS',['N','S']],['EW',['E','W']]])for(const s of ['C','D','H','S','NT'])out[side][s]=Math.max(...dirs.map(d=>h.doubleDummyTricks[d]?.[s]??-99));return out}
function practicalNotes(rs,dd,dest){const out=[];for(const side of ['NS','EW']){const sideRows=rs.filter(r=>SIDE[r.contract.declarer]===side),games=sideRows.filter(r=>isGame(r.contract.level,r.contract.strain));const possible=Object.entries(GAME).filter(([s,t])=>(dd[side][s]??-1)>=t).map(([s])=>s==='NT'?'3NT':(s==='H'||s==='S'?`4${s}`:`5${s}`));const rate=sideRows.length?games.length/sideRows.length:0;if(possible.length&&sideRows.length>=3&&rate<.5)out.push(`${side} 双明手有成局（${possible.join('、')}），实战该方只有 ${pct(rate)} 的定约到成局高度。这里更值得看成局判断和定约选择。`);if(!possible.length&&rate>.25)out.push(`${side} 双明手没有标准成局可成，但实战有 ${pct(rate)} 的该方定约到了成局高度。不能只看最终是否完成来倒推叫牌。`)}if(dest.length>=3&&dest.slice(0,3).reduce((s,x)=>s+x.count,0)/Math.max(1,rs.length)<.7)out.push('场上落点比较分散，主流方案没有形成明显垄断。');if(rs.some(r=>r.contract.double))out.push(`全场有 ${rs.filter(r=>r.contract.double).length} 个加倍或红加倍结果。`);return out}
function openingLeads(rs){const cards=[];for(const r of rs){const o=r.openingLead||{};const card=String(o.card||'').trim()||`${String(o.suit||'').trim()}${String(o.rank||'').trim()}`.trim();if(card)cards.push(card.toUpperCase())}return {count:cards.length,distribution:sortedCountRows(groupCount(cards,x=>x),cards.length)}}
