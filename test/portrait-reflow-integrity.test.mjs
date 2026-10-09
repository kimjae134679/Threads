import assert from 'node:assert/strict';import test from 'node:test';import {createRequire} from 'node:module';
const {reflowSourceBundle}=createRequire(import.meta.url)('../desktop/cover-reproduction-run.cjs');
const plan=()=>({safeMargin:132,sourceUnits:[{id:'text',kind:'text',text:'원문 그대로'},{id:'photo',kind:'image',mediaName:'photo.png'}],selectedComments:[],omitted:[],imageRegions:{photo:{x:0,y:0,width:100,height:100}},pages:[
 {number:1,role:'cover',width:1080,height:1440,operations:[]},
 {number:2,role:'body',width:1080,height:1440,operations:[{kind:'text',role:'body',sourceId:'text',text:'원문 그대로',x:132,y:132,size:52,lineHeight:78},{kind:'image',sourceId:'photo',name:'photo.png',x:132,y:300,width:100,height:100,sourceX:0,sourceY:0,sourceWidth:100,sourceHeight:100}]}]});
const run=(next,old=plan())=>reflowSourceBundle({loadFile:async()=>{},webContents:{executeJavaScript:async()=>({plan:next,images:[]})}},Buffer.from('source'),old);
test('reflow rejects missing or partial rendered images despite unchanged declarations',async()=>{
 const missing=plan();missing.pages[1].operations.pop();await assert.rejects(()=>run(missing),/무결성/);
 const cut=plan();cut.pages[1].operations[1].sourceHeight=50;await assert.rejects(()=>run(cut),/무결성/);
});
test('reflow preserves combined text/image order, not merely separate text order',async()=>{
 const reordered=plan();reordered.pages[1].operations.reverse();await assert.rejects(()=>run(reordered),/무결성/);
});
test('declared page operations cannot stand in for missing exported PNGs',async()=>{
 await assert.rejects(()=>run(plan()),/이미지 수/);
});
