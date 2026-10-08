import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import '../app/source-page-plan.js';
const sandbox={};
try {vm.runInNewContext(await fs.readFile(new URL('../app/universal-production-model.js',import.meta.url),'utf8'),sandbox);}catch(error){if(error.code!=='ENOENT')throw error;}
const U=sandbox.ThreadsUniversalProductionModel;
assert.equal(typeof U?.preparePlan,'function','universal model must expose source-preserving plan preparation');
const P=globalThis.ThreadsPagePlan,measure=(text,size)=>Array.from(text).length*size;
const raw={originalTitle:'[네이트판] First story',coverTitle:'[네이트판] First story',
  style:{fontId:'gothic',titleWeight:800,manualTitleLayout:true,coverSize:20},
  editorial:{templateId:'white_title',coverLines:['[네이트판] First story'],titleEvidence:'First story',
    annotations:[{kind:'commentary',text:'Separate editorial note'}]},
  segments:[{id:'first',kind:'text',selected:true,text:'First body paragraph must survive.'},
    {id:'last',kind:'text',selected:true,text:'A short final paragraph.'}],comments:[]};
const original=JSON.stringify(raw),prepared=U.preparePlan(raw);
assert.equal(JSON.stringify(raw),original,'raw source object is never mutated');
assert.equal(prepared.editorial.templateId,'mint_text');
assert.equal(prepared.coverTitle,'First story');
assert.equal(prepared.style.fontId,'gothic');
assert.equal(prepared.style.manualTitleLayout,false);
assert.deepEqual(JSON.parse(JSON.stringify(prepared.segments)),raw.segments);
assert.deepEqual(JSON.parse(JSON.stringify(prepared.editorial.annotations)),raw.editorial.annotations);
assert(!prepared.editorial.coverLines,'prefix removal must clear stale title wrapping');
const layout=P.compile(prepared,{},measure);
assert(layout.pages[0].operations.every(op=>op.role!=='body'),'dedicated cover cannot consume first body');
assert(layout.pages.slice(1).flatMap(p=>p.operations).some(op=>op.sourceId==='first'&&op.role==='body'));
assert(U.auditLayout(layout).ok,'white-title first body and final paragraph remain exact');
const photo={...raw,editorial:{templateId:'photo_cover'},style:{fontId:'sans'},segments:[
 {id:'photo',kind:'image',selected:true,mediaName:'original.jpg'},
 {id:'body',kind:'text',selected:true,text:'The original photo remains in the body.'}]};
const photoLayout=P.compile(U.preparePlan(photo),{'original.jpg':{width:800,height:600,analysis:{kind:'photo'}}},measure);
assert(photoLayout.pages.slice(1).flatMap(p=>p.operations).some(op=>op.kind==='image'&&op.sourceId==='photo'));
assert(!photoLayout.omitted.some(item=>item.reason==='already_shown_in_cover'));
assert(U.auditLayout(photoLayout).ok);
const change=fn=>{const copy=JSON.parse(JSON.stringify(layout));fn(copy);return U.auditLayout(copy);};
assert(!change(copy=>{const page=copy.pages.find(p=>p.operations.some(o=>o.role==='body'));page.operations=page.operations.filter(o=>o.sourceId!=='first');}).ok,'missing body fails');
assert(!change(copy=>{const page=copy.pages.find(p=>p.operations.some(o=>o.role==='body'));page.operations.push({...page.operations.find(o=>o.role==='body')});}).ok,'duplicate rendered fragment fails');
assert(!change(copy=>{const page=copy.pages.find(p=>p.operations.some(o=>o.role==='body'));page.operations.find(o=>o.role==='body').y=page.height;}).ok,'text outside page fails');
assert(!change(copy=>{const page=copy.pages.find(p=>p.operations.some(o=>o.sourceId==='first'));const first=page.operations.filter(o=>o.sourceId==='first'),last=page.operations.filter(o=>o.sourceId==='last');page.operations=[...last,...first];}).ok,'source order inversion fails');
const duplicated=P.compile(U.preparePlan({...raw,segments:[...raw.segments,{...raw.segments[0],id:'duplicate'}]}),{},measure);
assert(U.auditLayout(duplicated).ok,'compiler duplicate omission is allowed only with its recorded reason');
const unexplained=JSON.parse(JSON.stringify(duplicated));unexplained.omitted=unexplained.omitted.filter(item=>item.sourceId!=='duplicate');
assert(!U.auditLayout(unexplained).ok,'an unexplained omitted source unit fails');
const comments=P.compile(U.preparePlan({...raw,comments:[{id:'comment',selected:true,text:'A selected source comment remains exact.'}]}),{},measure);
assert(U.auditLayout(comments).ok);
const dropped=JSON.parse(JSON.stringify(comments));for(const p of dropped.pages)p.operations=p.operations.filter(o=>o.role!=='comment');
assert(!U.auditLayout(dropped).ok,'lost selected comments fail');
const note=P.compile(U.preparePlan({...raw,segments:[{...raw.segments[0],after:{note:'Actual trailing editorial note.',gap:10}},raw.segments[1]]}),{},measure);
assert(note.pages.flatMap(p=>p.operations).some(o=>o.role==='note'&&o.text.includes('Actual trailing')));
assert(U.auditLayout(note).ok,'editorial notes cannot contaminate exact body comparison');
console.log('universal cover source preservation and exact layout audit passed');

const staleWrapping=U.preparePlan({...raw,coverTitle:'First story',editorial:{templateId:'white_title',coverLines:['Firststory']}});
assert(!staleWrapping.editorial.coverLines,'character-equivalent but whitespace-invalid cover lines must be cleared');
const transcribedRaw={originalTitle:'Verified screenshot',segments:[{id:'capture',kind:'image',selected:true,mediaName:'capture.jpg'}],comments:[],editorial:{templateId:'photo_cover',transcriptions:{capture:{mediaName:'capture.jpg',sha256:'a'.repeat(64),verifiedBy:'manual_visual_two_pass',segments:[{kind:'text',text:'Exact visually verified source body.'},{kind:'comment',text:'Exact visually verified source comment.',visibleLikes:20}]}}}};
const transcribedLayout=P.compile(U.preparePlan(transcribedRaw),{'capture.jpg':{width:800,height:1200,sha256:'a'.repeat(64)}},measure);
const transcribedAudit=U.auditLayout(transcribedLayout);
assert(transcribedAudit.ok,'verified editorial transcriptions survive universal preparation');
assert.equal(transcribedAudit.body[0].originalSourceId,'capture');
assert.equal(transcribedAudit.comments[0].originalSourceId,'capture');
