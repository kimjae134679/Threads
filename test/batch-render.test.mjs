import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);let R={};try{R=require('../desktop/batch-render.cjs');}catch{}
assert.equal(typeof R.assertExactIntake,'function','shared renderer must audit original full body and comments');
const raw={segments:[{id:'s0',kind:'text',text:'원문 전체 문장'}],comments:[{id:'c0',text:'첫 댓글'},{id:'c1',text:'둘째 댓글'}]};
const plan={safeMargin:0,sourceUnits:raw.segments,selectedComments:raw.comments,pages:[{width:1080,height:1920,role:'body',operations:[{kind:'text',role:'body',sourceId:'s0',text:'원문 전체 문장',x:70,y:70,size:52,lineHeight:78},{kind:'text',role:'comment',sourceId:'c0',text:'첫 댓글',x:70,y:170,size:52,lineHeight:78},{kind:'text',role:'comment',sourceId:'c1',text:'둘째 댓글',x:70,y:270,size:52,lineHeight:78}]}]};
assert.equal(R.assertExactIntake(raw,plan).ok,true);
const cut=structuredClone(plan);cut.pages[0].operations[0].text='원문 문장';assert.throws(()=>R.assertExactIntake(raw,cut),/무결성/);
const dropped=structuredClone(plan);dropped.selectedComments=dropped.selectedComments.slice(0,1);dropped.pages[0].operations.pop();assert.throws(()=>R.assertExactIntake(raw,dropped),/원문 전체/);
const reversed=structuredClone(plan);reversed.pages[0].operations.reverse();assert.throws(()=>R.assertExactIntake(raw,reversed),/무결성|원문 전체/);
console.log('Shared batch renderer rejects cut body, dropped comments and reordered source: PASS');
