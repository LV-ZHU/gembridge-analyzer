export async function mapLimit(items, limit, fn, onProgress=()=>{}) {
  const arr=[...items], out=new Array(arr.length); let next=0,done=0;
  async function worker(){
    while(true){ const i=next++; if(i>=arr.length)return; out[i]=await fn(arr[i],i); done++; onProgress({done,total:arr.length,item:arr[i]}); }
  }
  await Promise.all(Array.from({length:Math.max(1,Math.min(Number(limit)||1,arr.length||1))},worker));
  return out;
}
