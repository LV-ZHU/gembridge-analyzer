export function analyzeStandings(swiss,{previousRanks=null}={}){
  const rows=[...swiss].sort((a,b)=>a.rank-b.rank);const prev=new Map((previousRanks||[]).map(x=>[x.teamNo,x.rank]));
  const enriched=rows.map(x=>({...x,rankChange:prev.has(x.teamNo)?prev.get(x.teamNo)-x.rank:null}));
  const penalties=enriched.filter(x=>(x.penalty||0)!==0);const ties=[];const byScore=new Map();for(const x of enriched){const k=String(x.vps);if(!byScore.has(k))byScore.set(k,[]);byScore.get(k).push(x)}for(const xs of byScore.values())if(xs.length>1)ties.push(xs);
  return {rows:enriched,top:enriched.slice(0,10),penalties,tiedScores:ties.map(xs=>({score:xs[0].vps,teams:xs.map(x=>({rank:x.rank,no:x.teamNo,name:x.teamName,impQ:x.impQ,avgVsVp:x.avgVsVp,winCount:x.winCount,tieCount:x.tieCount}))})),biggestClimbers:[...enriched].filter(x=>x.rankChange!=null).sort((a,b)=>b.rankChange-a.rankChange).slice(0,5),biggestDrops:[...enriched].filter(x=>x.rankChange!=null).sort((a,b)=>a.rankChange-b.rankChange).slice(0,5),provenance:{note:'IMP.Q / 平均对手分等按官方字段展示，不在本项目中反推公式。'}};
}
