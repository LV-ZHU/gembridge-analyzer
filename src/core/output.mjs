import fs from "node:fs/promises";import path from "node:path";
export async function writeOutput(value,{out,format='md'}={}){const text=format==='json'?JSON.stringify(value,null,2)+'\n':String(value).replace(/\s+$/,'')+'\n';if(out){const p=path.resolve(out);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,text,'utf8');console.error(`已写入 ${p}`)}else process.stdout.write(text)}
export async function loadJson(file){if(!file)return null;return JSON.parse(await fs.readFile(file,'utf8'))}
