import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function collectJavaScriptFiles(root){
 const files=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(mjs|js|cjs)$/.test(e.name)).map(e=>e.name);
 const skipped=new Set(['node_modules','dist','.local','local-private','.git']);
 function collect(directory){
  if(['desktop/production','desktop/production-editor','desktop/pc-review'].includes(directory.replaceAll('\\','/')))return;
  if(!fs.existsSync(path.join(root,directory)))return;
  for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})){
   if(entry.isSymbolicLink()||skipped.has(entry.name))continue;const file=path.join(directory,entry.name);
   if(entry.isDirectory())collect(file);else if(/\.(mjs|js|cjs)$/.test(entry.name))files.push(file);
  }
 }
 for(const directory of ['app','scripts','test','desktop','mobile','upload-studio','legacy-source'])collect(directory);
 return files.sort();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url)),files=collectJavaScriptFiles(root);
 for(const file of files){const result=spawnSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
 console.log(`Syntax checks passed for ${files.length} JavaScript files.`);
}
