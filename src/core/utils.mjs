export const DIRS = ["N", "E", "S", "W"];
export const STRAINS = ["C", "D", "H", "S", "NT"];

export function num(v, fallback = null) {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
export function str(v, fallback = "") { return v == null ? fallback : String(v); }
export function bool(v) { return Boolean(v); }
export function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
export function mean(xs) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null; }
export function median(xs) {
  if (!xs.length) return null;
  const a=[...xs].sort((x,y)=>x-y), m=Math.floor(a.length/2);
  return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
}
export function stdev(xs) {
  if (xs.length < 2) return 0;
  const m=mean(xs); return Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/xs.length);
}
export function stats(xs) {
  const a=xs.filter(Number.isFinite);
  return {count:a.length,min:a.length?Math.min(...a):null,max:a.length?Math.max(...a):null,mean:mean(a),median:median(a),stdev:stdev(a)};
}
export function pct(x, digits=1) { return `${(Number(x||0)*100).toFixed(digits)}%`; }
export function signed(x, digits=null) {
  if (x == null || !Number.isFinite(Number(x))) return "?";
  const n=Number(x), s=digits==null?String(n):n.toFixed(digits);
  return n>0?`+${s}`:s;
}
export function fmt(x, digits=2) {
  if (x == null || !Number.isFinite(Number(x))) return "?";
  return Number(x).toFixed(digits).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
export function groupCount(items, keyFn) {
  const m=new Map(); for (const x of items){ const k=keyFn(x); m.set(k,(m.get(k)||0)+1); } return m;
}
export function sortedCountRows(map,total) {
  return [...map.entries()].map(([key,count])=>({key,count,pct:total?count/total:0})).sort((a,b)=>b.count-a.count||String(a.key).localeCompare(String(b.key),'zh-CN'));
}
export function entropyFromCounts(counts) {
  const t=counts.reduce((a,b)=>a+b,0); if(!t)return 0;
  return counts.reduce((h,c)=>{const p=c/t; return h-(p? p*Math.log2(p):0)},0);
}
export function unique(xs) { return [...new Set(xs)]; }
export function sum(xs) { return xs.reduce((a,b)=>a+(Number(b)||0),0); }
export function byAbsDesc(a,b,key='value'){return Math.abs(b[key])-Math.abs(a[key]);}
export function normalizeName(s){return str(s).trim().replace(/\s+/g,' ')}
export function safeJson(v){ try{return JSON.stringify(v)}catch{return String(v)} }
export function nowIso(){return new Date().toISOString()}
