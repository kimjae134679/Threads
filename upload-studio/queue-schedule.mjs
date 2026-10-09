import {localTiming,contentBasis} from './domain.mjs';
export const DEFAULT_WINDOWS=Object.freeze([{start:'08:00',end:'11:00'},{start:'12:00',end:'14:00'},{start:'17:00',end:'21:00'}]);
export const DEFAULT_SCHEDULE=Object.freeze({timezone:'Asia/Seoul',interval_minutes:30,windows:DEFAULT_WINDOWS});
const fail=code=>{throw Object.assign(new Error(code),{code,status:code==='revision_conflict'?409:400});};
const clone=x=>JSON.parse(JSON.stringify(x));
export function dailySlots(config){
 if(!config||config.timezone!=='Asia/Seoul'||!/^\d{4}-\d{2}-\d{2}$/.test(config.date||'')||!Number.isInteger(config.interval_minutes)||config.interval_minutes<10||config.interval_minutes%10!==0||config.interval_minutes>1440||!Array.isArray(config.windows)||!config.windows.length||config.windows.length>12)fail('invalid_schedule_window');
 localTiming({mode:'planned',local:config.date+'T00:00',offset_minutes:-540});
 const slots=[],occupied=new Set();let last=-1;
 for(const window of config.windows){
  const minute=x=>{if(!/^\d{2}:\d{2}$/.test(x||''))fail('invalid_schedule_window');const[h,m]=x.split(':').map(Number);if(h>23||m>59)fail('invalid_schedule_window');return h*60+m;};
  const start=minute(window.start),end=minute(window.end);if(start>=end||start<last)fail('invalid_schedule_window');last=end;
  for(let n=start;n<end;n+=config.interval_minutes){if(occupied.has(n))fail('invalid_schedule_window');occupied.add(n);const local=config.date+'T'+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');slots.push(localTiming({mode:'planned',local,offset_minutes:-540}));}
 }
 return slots;
}
export function previewQueueSchedule(state,config){
 const slots=dailySlots(config),cursors={instagram:0,threads:0},assignments=[],overflow=[];
 const jobs=state.jobs.filter(j=>['waiting','scheduled'].includes(j.state)&&!j.stale);
 for(const job of jobs){const post=state.posts.find(p=>p.post_id===job.post_id);if(!post||job.output_version!==post.output_version||job.basis!==contentBasis(post))continue;const times={};
  for(const target of job.targets){const i=cursors[target]++;if(i<slots.length)times[target]=slots[i];else overflow.push({job_id:job.id,post_id:job.post_id,platform:target});}
  if(Object.keys(times).length)assignments.push({job_id:job.id,post_id:job.post_id,slots:times});
 }
 return {state_revision:state.revision,config:clone(config),capacity_per_platform:slots.length,counts:Object.fromEntries(Object.keys(cursors).map(k=>[k,{assigned:Math.min(cursors[k],slots.length),overflow:Math.max(0,cursors[k]-slots.length)}])),assignments,overflow,externalCalls:0};
}
export function applyQueueSchedule(state,config,expectedRevision){
 if(state.revision!==expectedRevision)fail('revision_conflict');
 const plan=previewQueueSchedule(state,config),s=clone(state);
 for(const assignment of plan.assignments){const j=s.jobs.find(x=>x.id===assignment.job_id),p=s.posts.find(x=>x.post_id===j.post_id);j.planned_slots=clone(assignment.slots);j.timing=clone(Object.values(assignment.slots)[0]);p.timing=clone(j.timing);p.revision++;p.approval=null;p.publication_approval=null;j.post_revision=p.revision;j.basis=contentBasis(p);j.key=JSON.stringify([p.post_id,p.output_version,p.revision,p.targets,p.accounts,p.timing]);j.state='scheduled';}
 // Overflow targets have no planned slot. They cannot inherit an older slot silently.
 for(const item of plan.overflow){const j=s.jobs.find(x=>x.id===item.job_id);if(!plan.assignments.some(x=>x.job_id===j.id)){delete j.planned_slots;j.timing={mode:'now',local:'',offset_minutes:null,due_at:null};j.state='waiting';}}
 s.schedule_defaults=clone(config);s.revision++;return s;
}
