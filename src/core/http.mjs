import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { JsonCache } from "./cache.mjs";

export function resolveProxy(explicit){return explicit||process.env.GEMBRIDGE_PROXY||process.env.HTTP_PROXY||process.env.http_proxy||null}

export class HttpJsonClient {
  constructor({proxy,timeoutMs=15000,retries=2,cacheDir='.cache/gembridge-analyzer',cacheTtlMs=5*60*1000,cache=true,refresh=false}={}){
    this.proxy=resolveProxy(proxy); this.timeoutMs=timeoutMs; this.retries=retries; this.refresh=refresh;
    this.cache=new JsonCache({dir:cacheDir,ttlMs:cacheTtlMs,enabled:cache});
  }
  async get(url,{cache=true,headers={}}={}){
    if(cache&&!this.refresh){const hit=await this.cache.read(url); if(hit)return {data:unwrapJson(hit.data),meta:{url,fromCache:true,fetchedAt:hit.fetchedAt}}}
    let last;
    for(let a=0;a<=this.retries;a++){
      try{
        const res=await requestBuffer(url,{proxy:this.proxy,timeoutMs:this.timeoutMs,headers:{Accept:'application/json','Accept-Encoding':'gzip, deflate',Origin:'http://www.gembridge.cn',Referer:'http://www.gembridge.cn/',...headers}});
        if(res.statusCode<200||res.statusCode>=300) throw new Error(`HTTP ${res.statusCode} ${res.statusMessage||''} - ${url}`);
        const ct=String(res.headers['content-type']||''); if(!ct.includes('json')) throw new Error(`接口未返回 JSON (${ct||'unknown'}): ${url}`);
        const data=unwrapJson(JSON.parse(res.body.toString('utf8'))); if(cache)await this.cache.write(url,data);
        return {data,meta:{url,fromCache:false,fetchedAt:new Date().toISOString()}};
      }catch(e){last=e;if(a<this.retries)await new Promise(r=>setTimeout(r,350*(2**a)))}
    }
    if(cache){const stale=await this.cache.read(url,{allowStale:true}); if(stale)return {data:unwrapJson(stale.data),meta:{url,fromCache:true,stale:true,fetchedAt:stale.fetchedAt,error:String(last?.message||last)}}}
    throw last;
  }
}

export function unwrapJson(value){
  let current=value;
  for(let i=0;i<2&&typeof current==='string';i++){
    try{current=JSON.parse(current)}catch{return current}
  }
  return current;
}

function requestBuffer(targetUrl,{proxy,timeoutMs,headers}){
  const target=new URL(targetUrl);
  if(proxy){
    const p=new URL(proxy); if(p.protocol!=='http:') throw new Error(`当前零依赖代理客户端只支持 http:// 代理，收到 ${p.protocol}`);
    if(target.protocol!=='http:') throw new Error('代理模式当前只用于本项目的 HTTP CCBA 接口');
    return doReq(http,{hostname:p.hostname,port:p.port||80,method:'GET',path:target.href,headers:{Host:target.host,...headers}},timeoutMs);
  }
  const client=target.protocol==='https:'?https:http;
  return doReq(client,{hostname:target.hostname,port:target.port||(target.protocol==='https:'?443:80),method:'GET',path:target.pathname+target.search,headers:{Host:target.host,...headers}},timeoutMs);
}
function doReq(client,opts,timeoutMs){
  return new Promise((resolve,reject)=>{const req=client.request(opts,res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{try{let body=Buffer.concat(chunks);const enc=String(res.headers['content-encoding']||'').toLowerCase();if(enc==='gzip')body=zlib.gunzipSync(body);else if(enc==='deflate')body=zlib.inflateSync(body);resolve({statusCode:res.statusCode||0,statusMessage:res.statusMessage||'',headers:res.headers,body})}catch(e){reject(e)}})});req.setTimeout(timeoutMs,()=>req.destroy(new Error(`请求超时 ${timeoutMs}ms`)));req.on('error',reject);req.end()})
}
