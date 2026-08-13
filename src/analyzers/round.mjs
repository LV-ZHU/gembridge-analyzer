import { mean } from "../core/utils.mjs";
export function analyzeRound({roundMeta,tables,boardAnalyses=[],matchAnalyses=[],standings=null}){
  const matches=[...tables].map(t=>({table:t.table,a:t.nsTeam.name,b:t.ewTeam.name,aImp:t.nsTeam.imps,bImp:t.ewTeam.imps,aVp:t.nsTeam.vp,bVp:t.ewTeam.vp,margin:Math.abs(t.nsTeam.imps-t.ewTeam.imps)}));
  const boardImpact=[];for(const ba of boardAnalyses){const swings=[];for(const m of matchAnalyses){const row=m.boards.find(x=>x.board===ba.board);if(row)swings.push(row.absImp)}boardImpact.push({board:ba.board,studyScore:ba.studyValue.score,avgAbsImp:mean(swings)||0,maxAbsImp:swings.length?Math.max(...swings):0,tenPlus:swings.filter(x=>x>=10).length,flat:swings.filter(x=>x===0).length})}
  return {round:roundMeta?.round??tables[0]?.round??null,meta:roundMeta,matches,largestWins:[...matches].sort((a,b)=>b.margin-a.margin).slice(0,8),closest:[...matches].sort((a,b)=>a.margin-b.margin).slice(0,8),boardImpact:[...boardImpact].sort((a,b)=>b.avgAbsImp-a.avgAbsImp),bestStudyBoards:[...boardImpact].sort((a,b)=>b.studyScore-a.studyScore).slice(0,8),standings,provenance:{derived:['match margins','board swing aggregation across tables']}};
}
