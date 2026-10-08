import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../desktop/universal-reproduction.cjs';
const row=(id)=>({id,title:id,outputFolder:'현재 결과/'+id,images:[{name:'rendered/slide-001.png'}],status:'generated'});
test('manifest covers every existing output and preserves unsupported-source triage',()=>{
 const report={entries:[row('a'),row('news'),row('held'),row('repair'),{id:'blocked',status:'needs_access'}]};
 const inventory={rows:[{id:'a',disposition:'eligible'},{id:'news',disposition:'eligible'},{id:'held',disposition:'held',reasonCode:'source_insufficient'},{id:'repair',disposition:'held',reasonCode:'production_error'}]};
 const result=model.buildManifest(report,inventory,{findings:[{id:'news',recommendation:'reject',reasonCode:'press_news_reprint',evidence:[{excerpt:'real article URL'}]}]});
 assert.deepEqual(result.jobs.map(x=>x.id),['a','repair']);
 assert.equal(result.decisions.length,4);
 assert.equal(result.decisions.find(x=>x.id==='held').disposition,'held');
 assert.equal(result.decisions.find(x=>x.id==='news').evidence[0].excerpt,'real article URL');
 assert.equal(report.entries[1].outputFolder,'현재 결과/news');
});
test('duplicate IDs and uncovered outputs fail closed',()=>{
 assert.throws(()=>model.buildManifest({entries:[row('a'),row('a')]},{rows:[{id:'a',disposition:'eligible'}]},{findings:[]}),/중복/);
 assert.throws(()=>model.buildManifest({entries:[row('a')]},{rows:[]},{findings:[]}),/누락/);
});
test('PNG dimensions and title geometry reject clipped render',()=>{
 const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(1080,16);b.writeUInt32BE(1920,20);
 assert.deepEqual(model.pngSize(b),{width:1080,height:1920});
 assert.throws(()=>model.assertCoverGeometry({title:'원문',size:64,lines:['다른'],box:{x:108,y:500,width:864,height:200}}),/제목/);
 assert.throws(()=>model.assertCoverGeometry({title:'원문',size:64,lines:['원문'],box:{x:108,y:1850,width:864,height:200}}),/범위/);
 assert.doesNotThrow(()=>model.assertCoverGeometry({title:'원문 제목',size:80,lines:['원문','제목'],box:{x:108,y:500,width:864,height:200}}));
});


test('infrastructure loss is fatal while source audit failures remain per-post holds',()=>{
 assert.equal(model.isInfrastructureFailure({code:'ENOSPC'}),true);
 assert.equal(model.isInfrastructureFailure(Error('Object has been destroyed')),true);
 assert.equal(model.isInfrastructureFailure(Error('source audit'),{rendererDestroyed:true}),true);
 assert.equal(model.isInfrastructureFailure(Error('generic rejection'),{rendererGone:true,rendererDestroyed:false}),true);
 assert.equal(model.isInfrastructureFailure(Error('본문 무결성 검증 실패')),false);
});
