import { impFromDiff } from "../bridge/scoring.mjs";
import { signed } from "../core/utils.mjs";

export function analyzeMatch(match,boards){
  const boardRows=[];let aCum=0,bCum=0,prevSign=0,leadChanges=0;
  const low=match.boardRange.low??1,high=match.boardRange.high??Math.max(...boards.map(b=>b.hand.board));
  for(let bn=low;bn<=high;bn++){
    const b=boards.find(x=>x.hand.board===bn);if(!b)continue;const rs=b.results.filter(r=>r.table===match.table);const r1=rs.find(r=>r.room===1),r2=rs.find(r=>r.room===2);if(!r1||!r2)continue;
    const rawDiff=r1.scoreNS-r2.scoreNS;const derived=impFromDiff(rawDiff);const official=(r1.matchImpNS||0)-(r1.matchImpEW||0);const signedImp=official!==0?official:derived;
    if(signedImp>=0)aCum+=signedImp;else bCum+=-signedImp;const sign=Math.sign(aCum-bCum);if(prevSign&&sign&&sign!==prevSign)leadChanges++;if(sign)prevSign=sign;
    boardRows.push({board:bn,teamAGain:signedImp,absImp:Math.abs(signedImp),room1:{contract:r1.contract.display,scoreNS:r1.scoreNS,ximp:r1.ximp},room2:{contract:r2.contract.display,scoreNS:r2.scoreNS,ximp:r2.ximp},cause:classifySwing(r1,r2),cumulative:{teamA:aCum,teamB:bCum},boardData:b,provenance:{kind:official!==0?'raw_api+derived':'derived'}});
  }
  const margin=match.nsTeam.imps-match.ewTeam.imps;const top=[...boardRows].sort((a,b)=>b.absImp-a.absImp).slice(0,6);const biggest=top[0]?.absImp??0;
  return {table:match.table,round:match.round,teamA:{...match.nsTeam},teamB:{...match.ewTeam},lineup:match.lineup,final:{teamAImp:match.nsTeam.imps,teamBImp:match.ewTeam.imps,teamAVp:match.nsTeam.vp,teamBVp:match.ewTeam.vp,margin},boards:boardRows,topSwings:top,leadChanges,largestSwing:biggest,largestSwingShareOfFinalMargin:Math.abs(margin)?biggest/Math.abs(margin):null,validation:{derivedTeamA:aCum,derivedTeamB:bCum,officialTeamA:match.nsTeam.imps,officialTeamB:match.ewTeam.imps,netMatches:(aCum-bCum)===margin},provenance:{derived:['board room pairing','signed board IMP for room1 NS team','cumulative score','swing classification']}};
}
function classifySwing(a,b){const ca=a.contract,cb=b.contract;if(ca.double||cb.double)return '加倍相关';if(ca.level>=6||cb.level>=6)return '满贯相关';const ga=isGameLike(ca),gb=isGameLike(cb);if(ga!==gb)return '成局/部分定约';if(ca.level===cb.level&&ca.strain===cb.strain&&ca.result!==cb.result)return '同定约不同结果';if(ca.strain!==cb.strain)return '定约选择不同';return '结果差异'}
function isGameLike(c){return (c.strain==='NT'&&c.level>=3)||(['H','S'].includes(c.strain)&&c.level>=4)||(['C','D'].includes(c.strain)&&c.level>=5)}
