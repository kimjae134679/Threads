import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { acquisitionId } from './scripts/acquire-existing-sources.mjs';

const RESULT_STATES = new Set(['converted','needs_verbatim_check','needs_media',
  'needs_comment_check','needs_comment_ranking','needs_source','ready_to_render','excluded_severe','failed']);
const mediaType = name => ({ '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.gif':'image/gif' })[path.extname(name).toLowerCase()] || 'application/octet-stream';
const readJson = async file => { try { return JSON.parse(await fs.readFile(file,'utf8')); } catch (e) {
  if (e.code === 'ENOENT') return null; throw e;
} };
const names = async dir => { try { return new Set(await fs.readdir(dir)); } catch (e) {
  if (e.code === 'ENOENT') return new Set(); throw e;
} };
const heading = value => /^#\s+(.+)$/m.exec(value)?.[1]?.trim() ||
  /^-\s*exactObservedTitle:\s*(.+)$/m.exec(value)?.[1]?.trim() || '';

export class SourceWorkflow {
  constructor(root, options = {}) {
    this.root = root;
    this.acquired = options.acquired || path.join(root,'data/runtime/source_pipeline/acquired');
    this.results = options.results || path.join(root,'data/runtime/source_pipeline/results');
    this.queuePath = options.queuePath || path.join(root,'data/_system/source-work-queue.json');
    this.spawn = options.spawn || spawn;
    this.child = null;
    this.job = {running:false,processed:0,total:0,current:null,error:null};
    this.entriesPromise = null;
  }
  async entries() {
    if (!this.entriesPromise) this.entriesPromise = readJson(this.queuePath).then(async q => {
      if (!Array.isArray(q?.entries)) throw new Error('source_work_queue_missing');
      const result=[];
      for (let i=0;i<q.entries.length;i+=48) {
        result.push(...await Promise.all(q.entries.slice(i,i+48).map(async e => {
          const candidate=e.candidate, file=path.resolve(this.root,candidate);
          if (!file.startsWith(this.root+path.sep) || !candidate.endsWith('.md'))
            throw new Error('invalid_queue_candidate');
          const markdown=await fs.readFile(file,'utf8').catch(error => {
            if (error.code==='ENOENT') return ''; throw error;
          });
          return {candidate,id:acquisitionId(candidate),title:heading(markdown)||path.basename(candidate,'.md')};
        })));
      }
      return result;
    });
    return this.entriesPromise;
  }
  async entry(candidate) {
    const found = (await this.entries()).find(e => e.candidate === candidate);
    if (!found) throw Object.assign(new Error('작업 대기열에 없는 파일입니다.'),{status:404,code:'unknown_candidate'});
    return found;
  }
  async status() {
    const entries = await this.entries(), rows=[];
    const [acquiredNames,resultNames]=await Promise.all([names(this.acquired),names(this.results)]);
    for (let i=0;i<entries.length;i+=48) {
      const batch=entries.slice(i,i+48);
      rows.push(...await Promise.all(batch.map(async e => {
        const [acquisition,result]=await Promise.all([
          acquiredNames.has(e.id)?readJson(path.join(this.acquired,e.id,'acquisition.json')):null,
          resultNames.has(e.id+'.json')?readJson(path.join(this.results,e.id+'.json')):null]);
        return {candidate:e.candidate,id:e.id,title:e.title,acquisition:acquisition?.state || 'queued',
          conversion:result?.state || 'not_converted',pages:result?.pages || 0,
          resultFile:result?.file || null,note:result?.note || acquisition?.reason || '',
          mediaFiles:acquisition?.media?.map(m=>m.file).filter(Boolean) || []};
      })));
    }
    const counts={total:rows.length,converted:0,excluded:0,needsReview:0,blocked:0,queued:0,savedHtml:0};
    for (const row of rows) {
      if (row.conversion==='converted') counts.converted++;
      else if (row.conversion==='excluded_severe') counts.excluded++;
      else if (row.conversion!=='not_converted') counts.needsReview++;
      if (row.acquisition==='blocked' || row.acquisition==='needs_exact_url') counts.blocked++;
      else if (row.acquisition==='saved_html') counts.savedHtml++;
      else counts.queued++;
    }
    return {entries:rows,counts,job:{...this.job},resultsFolder:this.results};
  }
  async start() {
    if (this.child) return {started:false,job:{...this.job}};
    const total=(await this.entries()).length;
    this.job={running:true,processed:0,total,current:null,error:null};
    const child=this.spawn(process.execPath,['scripts/acquire-existing-sources.mjs','--all'],
      {cwd:this.root,stdio:['ignore','pipe','pipe'],windowsHide:true});
    this.child=child;
    let buffer='';
    child.stdout.on('data', chunk => {
      buffer+=chunk.toString('utf8');
      for (;;) {
        const end=buffer.indexOf('\n'); if (end<0) break;
        const line=buffer.slice(0,end).trim(); buffer=buffer.slice(end+1);
        const match=/^\[(\d+)\/(\d+)\]\s+\S+\s+(.*)$/.exec(line);
        if (match) { this.job.processed=Number(match[1]); this.job.total=Number(match[2]); this.job.current=match[3]; }
      }
    });
    child.stderr.on('data',chunk=>{this.job.error=((this.job.error||'')+chunk).slice(-700);});
    child.on('error',error=>{this.job.error=error.message;});
    child.on('exit',code=>{this.child=null;this.job.running=false;
      if (code!==0 && !this.job.error) this.job.error='수집 프로세스 종료: '+code;
    });
    return {started:true,job:{...this.job}};
  }
  stop() { if (!this.child) return {stopped:false}; this.child.kill(); return {stopped:true}; }
  async source(candidate,file) {
    const e=await this.entry(candidate);
    const acquisition=await readJson(path.join(this.acquired,e.id,'acquisition.json'));
    if (acquisition?.state!=='saved_html') throw Object.assign(new Error('저장된 원문이 없습니다.'),{status:404});
    const allowed=new Set(['source.html',...(acquisition.media||[]).map(m=>m.file).filter(Boolean)]);
    if (!allowed.has(file) || file!=='source.html' && !/^media\/[^/\\]+$/.test(file))
      throw Object.assign(new Error('등록되지 않은 파일입니다.'),{status:404});
    const data=await fs.readFile(path.join(this.acquired,e.id,file));
    const media=acquisition.media?.find(m=>m.file===file);
    return {data,contentType:file==='source.html'?acquisition.contentType||'text/html':media?.contentType||mediaType(file)};
  }
  async save(candidate, state, pages, zip, note='') {
    const e=await this.entry(candidate);
    if (!RESULT_STATES.has(state)) throw Object.assign(new Error('잘못된 변환 상태입니다.'),{status:400});
    if (zip && (state==='excluded_severe' || state==='failed')) throw Object.assign(new Error('제외 항목에 결과 ZIP을 저장할 수 없습니다.'),{status:400});
    if (!zip && !['excluded_severe','failed'].includes(state)) throw Object.assign(new Error('ZIP 결과가 필요합니다.'),{status:400});
    await fs.mkdir(this.results,{recursive:true});
    let file=null;
    if (zip) {
      const digest=createHash('sha256').update(zip).digest('hex').slice(0,12);
      file=e.id+'-'+digest+'.zip';
      const target=path.join(this.results,file);
      try { await fs.access(target); } catch { await fs.writeFile(target,zip,{flag:'wx'}); }
    }
    const record={candidate,state,pages:Number.isInteger(pages)?pages:0,file,
      note:String(note).slice(0,500),savedAt:new Date().toISOString(),publicationAllowed:false};
    const target=path.join(this.results,e.id+'.json');
    const tmp=target+'.tmp-'+randomUUID();
    await fs.writeFile(tmp,JSON.stringify(record,null,2)+'\n'); await fs.rename(tmp,target);
    return record;
  }
  async openFolder() {
    await fs.mkdir(this.results,{recursive:true});
    const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
    await new Promise((resolve,reject) => {
      const child=this.spawn(command,[this.results],{detached:true,stdio:'ignore',windowsHide:false});
      child.once('error',reject);
      child.once('spawn',()=>{child.unref?.();resolve();});
    });
    return {folder:this.results};
  }
  async openItem(candidate) {
    const e=await this.entry(candidate);
    const result=await readJson(path.join(this.results,e.id+'.json'));
    const valid=result?.file && result.file.startsWith(e.id+'-') &&
      /^[A-Za-z0-9._-]+\.zip$/.test(result.file);
    const target=valid?path.join(this.results,result.file):path.join(this.root,e.candidate);
    await fs.access(target);
    const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['/select,'+target]:[path.dirname(target)];
    await new Promise((resolve,reject) => {
      const child=this.spawn(command,args,{detached:true,stdio:'ignore',windowsHide:false});
      child.once('error',reject);
      child.once('spawn',()=>{child.unref?.();resolve();});
    });
    return {file:target,kind:valid?'result':'candidate'};
  }
}
