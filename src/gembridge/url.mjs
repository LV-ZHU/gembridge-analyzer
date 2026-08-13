export function parseGemBridgeUrl(input){
  let u; try{u=new URL(input)}catch{throw new Error(`URL 无效: ${input}`)}
  if(!/(^|\.)gembridge\.cn$/i.test(u.hostname)) throw new Error(`需要 gembridge.cn 的 score URL，收到 ${u.hostname}`);
  const q=u.searchParams;
  const meta={
    sourceUrl:input, pathname:u.pathname, tourStart:q.get('tourStart'), tour:numParam(q,'tour'), event:q.get('event'),
    section:q.get('section'), round:numParam(q,'round'), seg:q.has('seg')?numParam(q,'seg'):0, board:q.has('board')?numParam(q,'board'):null,
    from:q.get('from')||'ccba', byrank:q.get('byrank')
  };
  if(!meta.section)throw new Error('URL 缺少 section');
  if(meta.round==null)throw new Error('URL 缺少 round');
  return meta;
}
function numParam(q,k){const v=q.get(k);if(v==null||v==='')return null;const n=Number(v);if(!Number.isInteger(n))throw new Error(`${k} 不是整数: ${v}`);return n}
export function withMeta(meta,patch){return {...meta,...patch}}
