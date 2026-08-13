import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export class JsonCache {
  constructor({dir='.cache/gembridge-analyzer', ttlMs=5*60*1000, enabled=true}={}) { this.dir=dir; this.ttlMs=ttlMs; this.enabled=enabled; }
  key(url){return crypto.createHash('sha256').update(url).digest('hex')}
  file(url){return path.join(this.dir,`${this.key(url)}.json`)}
  async read(url,{allowStale=false}={}){
    if(!this.enabled)return null;
    try{const x=JSON.parse(await fs.readFile(this.file(url),'utf8')); const age=Date.now()-Date.parse(x.fetchedAt); if(!allowStale&&age>this.ttlMs)return null; return x;}catch{return null}
  }
  async write(url,data){ if(!this.enabled)return; await fs.mkdir(this.dir,{recursive:true}); const x={url,fetchedAt:new Date().toISOString(),data}; await fs.writeFile(this.file(url),JSON.stringify(x,null,2),'utf8'); }
  async clear(){ if(!this.enabled)return; await fs.rm(this.dir,{recursive:true,force:true}); }
}
