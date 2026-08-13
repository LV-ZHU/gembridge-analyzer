export function parseRange(spec, {min=0,max=9999}={}) {
  if (Array.isArray(spec)) return [...new Set(spec.map(Number))].filter(n=>Number.isInteger(n)&&n>=min&&n<=max).sort((a,b)=>a-b);
  const s=String(spec??'').trim(); if(!s) return [];
  const out=[];
  for(const part of s.split(',')){
    const p=part.trim(); if(/^\d+$/.test(p)) out.push(Number(p));
    else { const m=p.match(/^(\d+)-(\d+)$/); if(!m) throw new Error(`无效范围: ${p}`); const a=Number(m[1]),b=Number(m[2]); for(let n=a;n<=b;n++)out.push(n); }
  }
  return [...new Set(out)].filter(n=>n>=min&&n<=max).sort((a,b)=>a-b);
}
export function intArg(v,name,{min=0,max=1e9}={}){
  const n=Number(v); if(!Number.isInteger(n)||n<min||n>max) throw new Error(`${name} 必须是 ${min}~${max} 的整数`); return n;
}
