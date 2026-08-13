export function canonicalDouble(v){const s=String(v??'').trim().toUpperCase();return s==='X'||s==='XX'?s:(s?'?':'')}
export function resultOffset(v){const s=String(v??'').trim();if(!s||s==='=')return 0;if(/^[+-]\d+$/.test(s))return Number(s);return null}
export function actualTricks(level,result){const l=Number(level),o=resultOffset(result);return Number.isInteger(l)&&l>=1&&l<=7&&o!=null?6+l+o:null}
export function scoreNS(row){const ns=Number(row.tpNS??0),ew=Number(row.tpEW??0);if(Number.isFinite(ns)&&Number.isFinite(ew))return ns-ew;const tp=Number(row.tp);return Number.isFinite(tp)?tp:null}
export function contractDisplay(row){
  const l=Number(row.contractTrick),s=String(row.contractSuit??'').toUpperCase(),d=String(row.declarer??'').toUpperCase(),x=canonicalDouble(row.contractDouble),r=String(row.result??'').trim()||'=';
  if(Number.isInteger(l)&&l>=1&&s)return `${d} ${l}${s}${x} ${r}`.trim();
  return String(row.declarerContractResult??row.contract??'').trim()||'NO CONTRACT / ADJUSTED';
}
export function isGame(level,strain){const l=Number(level),s=String(strain).toUpperCase();return (s==='NT'&&l>=3)||((s==='H'||s==='S')&&l>=4)||((s==='C'||s==='D')&&l>=5)}
export function isSlam(level){return Number(level)>=6}
export function impFromDiff(diff){
  const n=Number(diff);if(!Number.isFinite(n))return null;const a=Math.abs(n);const bounds=[[20,0],[50,1],[90,2],[130,3],[170,4],[220,5],[270,6],[320,7],[370,8],[430,9],[500,10],[600,11],[750,12],[900,13],[1100,14],[1300,15],[1500,16],[1750,17],[2000,18],[2250,19],[2500,20],[3000,21],[3500,22],[4000,23]];let imp=24;for(const [b,v] of bounds){if(a<b){imp=v;break}}return n<0?-imp:imp
}
