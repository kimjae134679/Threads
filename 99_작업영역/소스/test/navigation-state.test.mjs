import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const load=()=>import('../upload-studio/navigation-state.mjs');const post={post_id:'existing',output_version:'version38',images:[{asset_id:'a'},{asset_id:'b'}]};
test('empty catalog navigation still saves and rejects a concurrent post appearing',async()=>{
 const {prepareNavigation}=await load();let p=null,saved=0;assert.equal(await prepareNavigation({getPost:()=>p,save:async()=>{saved++;},refresh:async()=>{},allowEmpty:true}),null);assert.equal(saved,1);
 await assert.rejects(prepareNavigation({getPost:()=>p,save:async()=>{},refresh:async()=>{p=post;},allowEmpty:true}),/navigation_version_changed/);
});
test('new-post, import, version restore and beforeunload include dirty numeric quality in their barrier',async()=>{
 const code=await fs.readFile(new URL('../upload-studio/public/studio.js',import.meta.url),'utf8');
 assert.match(code,/async function newPost\(\)\{await navigationSettled\(\)/);assert.match(code,/async function historyAction\(kind\)\{await navigationSettled\(\)/);
 assert.match(code,/bundle-file'\)\.addEventListener\('change'.*?await navigationSettled\(\)/);assert.match(code,/beforeunload.*?qualityDirty\|\|qualitySaving/);
});
test('every material navigation link is same-tab and participates in the save barrier',async()=>{
 const html=await fs.readFile(new URL('../upload-studio/public/index.html',import.meta.url),'utf8');
 for(const id of ['all-materials','current-materials','current-full-viewer']){const link=new RegExp('<a[^>]*id="'+id+'"[^>]*>').exec(html)?.[0];assert.ok(link);assert.match(link,/data-viewer-nav/);assert.doesNotMatch(link,/target="_blank"/);}
});
test('numeric save feedback and async read-page feedback have independent UI targets',async()=>{
 const html=await fs.readFile(new URL('../upload-studio/public/index.html',import.meta.url),'utf8');assert.match(html,/id="quality-status"/);assert.match(html,/id="quality-progress"/);
 const code=await fs.readFile(new URL('../upload-studio/public/studio.js',import.meta.url),'utf8'),visit=code.slice(code.indexOf('async function visitQualityPreview'),code.indexOf('async function loadQuality'));assert.doesNotMatch(visit,/\$\('quality-status'\)/);assert.match(visit,/\$\('quality-progress'\)/);
});
test('same post/version/image order restores slide, scroll and filters without attaching stale state',async()=>{
 const {captureOrigin,matchingOrigin}=await load(),origin=captureOrigin(post,{slide:1,scroll:490,filter:'hold',search:'검색',platform:'threads'});assert.equal(origin.output_version,'version38');assert.deepEqual(matchingOrigin(origin,post),origin);
 assert.equal(matchingOrigin(origin,{...post,output_version:'new'}),null);assert.equal(matchingOrigin(origin,{...post,post_id:'other'}),null);assert.equal(matchingOrigin(origin,{...post,images:[...post.images].reverse()}),null);assert.equal(matchingOrigin({post_id:'existing'},post),null);
});
test('read-page progress is bound to the decoded current image, not requested or stale slides',async()=>{
 const {captureOrigin,committedVisit}=await load(),origin=captureOrigin(post);
 assert.deepEqual(committedVisit(origin,post,{postId:post.post_id,outputVersion:post.output_version,assetId:'b',slide:1}),{post_id:'existing',output_version:'version38',page:2});
 assert.equal(committedVisit(origin,post,{postId:post.post_id,outputVersion:post.output_version,assetId:'a',slide:1}),null);
 assert.equal(committedVisit(origin,post,{postId:post.post_id,outputVersion:'old',assetId:'b',slide:1}),null);
 assert.equal(committedVisit(origin,{...post,images:[...post.images].reverse()},{postId:post.post_id,outputVersion:post.output_version,assetId:'b',slide:1}),null);
});
test('leave barrier stays on save failure or an async identity/version race',async()=>{
 const {prepareNavigation}=await load();let current=post,saved=0;const before=structuredClone(post);
 await assert.rejects(prepareNavigation({getPost:()=>current,save:async()=>{throw Error('save_failed');},refresh:async()=>{}}),/save_failed/);assert.deepEqual(current,before);
 await assert.rejects(prepareNavigation({getPost:()=>current,save:async()=>{saved++;},refresh:async()=>{current={...post,output_version:'new'};}}),/navigation_version_changed/);assert.equal(saved,1);
 current=post;assert.equal((await prepareNavigation({getPost:()=>current,save:async()=>{saved++;},refresh:async()=>{}})).post_id,post.post_id);
});

test('same-app post selection saves caption and quality without deadlocking a held per-ID verdict',async()=>{
 const code=await fs.readFile(new URL('../upload-studio/public/studio.js',import.meta.url),'utf8'),vm=await import('node:vm');
 const extract=name=>{const match=new RegExp('async function '+name+'\\(\\)\\{[^\\r\\n]*\\}').exec(code);assert.ok(match,'missing '+name);return match[0];};
 const calls=[],context={qualityDirty:true,settled:async()=>{calls.push('caption');},saveQuality:async()=>{calls.push('quality');context.qualityDirty=false;},visitQualityPreview:async()=>{calls.push('visit');},qualityVisitTail:Promise.resolve(),verdictWorkers:new Map([['held',new Promise(()=>{})]]),verdictPending:new Map([['held',{}]]),selected:'held',conflicted:false,saveFailed:false};
 const api=vm.runInNewContext(extract('postSelectionSettled')+';'+extract('navigationSettled')+';({postSelectionSettled,navigationSettled})',context);
 await api.postSelectionSettled();assert.deepEqual(calls,['caption','quality','visit']);assert.equal(context.verdictPending.size,1,'selection never consumes or approves a pending verdict');
 assert.equal(await Promise.race([api.navigationSettled().then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),10))]),false,'unmount/navigation still waits for the held write');
 assert.match(code,/button\.onclick=async\(\)=>\{try\{await postSelectionSettled\(\);clearMaterialContext\(\);selected=/);
 context.settled=async()=>{throw Error('caption_failed');};await assert.rejects(api.postSelectionSettled(),/caption_failed/);
 context.settled=async()=>{};context.qualityDirty=true;context.saveQuality=async()=>{throw Error('quality_failed');};await assert.rejects(api.postSelectionSettled(),/quality_failed/);
});
test('native preview commits loaded images without waiting for a suspended decode, while web still waits for decode',async()=>{
 const code=await fs.readFile(new URL('../upload-studio/public/studio.js',import.meta.url),'utf8'),{runInNewContext}=await import('node:vm'),start=code.indexOf('async function preparePreviewImage('),end=code.indexOf('// END_PREVIEW_IMAGE_READY',start);
 const inlineStart=code.indexOf('  const image=new Image();for(const attr of target.attributes)'),inlineEnd=code.indexOf('  ready.set(target,image);',inlineStart),body=start>=0?code.slice(start,end):'async function preparePreviewImage(target){'+code.slice(inlineStart,inlineEnd)+'return image;}';assert.ok(start>=0&&end>start||inlineStart>=0&&inlineEnd>inlineStart);
 const target={attributes:[{name:'src',value:'/assets/'+'a'.repeat(64)},{name:'alt',value:'1번째 이미지'}]},created=[];let events=0,decodeCalls=0,releaseDecode;
 class ImageDouble{constructor(){this.attributes={};this.complete=false;this.naturalWidth=0;created.push(this);}setAttribute(name,value){this.attributes[name]=value;if(name==='src'){this.complete=true;this.naturalWidth=1080;this.naturalHeight=1440;queueMicrotask(()=>{events++;this.onload?.();});}}decode(){decodeCalls++;return new Promise(resolve=>{releaseDecode=resolve;});}}
 const native=runInNewContext(body+';preparePreviewImage',{Image:ImageDouble,window:{ThreadsStudioShell:{}}});let committed=false;const ready=native(target).then(image=>{committed=true;return image;});for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(events,1);assert.equal(committed,true,'native onload success must settle even if decode would remain pending');const image=await ready;assert.equal(decodeCalls,0);assert.deepEqual(image.attributes,{src:target.attributes[0].value,alt:'1번째 이미지'});assert.equal(image.onload,null);assert.equal(image.onerror,null);
 const web=runInNewContext(body+';preparePreviewImage',{Image:ImageDouble,window:{}});let webReady=false;const pending=web(target).then(()=>{webReady=true;});for(let i=0;i<10;i++)await Promise.resolve();assert.equal(webReady,false,'web must retain its decode barrier');assert.equal(decodeCalls,1);releaseDecode();await pending;assert.equal(webReady,true);
});
test('native preview rejects failed image loading instead of committing a broken frame',async()=>{
 const code=await fs.readFile(new URL('../upload-studio/public/studio.js',import.meta.url),'utf8'),{runInNewContext}=await import('node:vm'),start=code.indexOf('async function preparePreviewImage('),end=code.indexOf('// END_PREVIEW_IMAGE_READY',start);assert.ok(start>=0&&end>start);
 let last;class FailedImage{constructor(){last=this;this.complete=false;this.naturalWidth=0;}setAttribute(name){if(name==='src')queueMicrotask(()=>this.onerror?.());}decode(){throw Error('native decode is forbidden');}}
 const prepare=runInNewContext(code.slice(start,end)+';preparePreviewImage',{Image:FailedImage,window:{ThreadsStudioShell:{}}});await assert.rejects(prepare({attributes:[{name:'src',value:'/assets/'+'b'.repeat(64)}]}),/preview_image_failed/);assert.equal(last.onload,null);assert.equal(last.onerror,null);
 const epoch=code.slice(code.indexOf('async function renderPreview'),code.indexOf('function setPreviewLoading'));assert.match(epoch,/generation!==previewGeneration\|\|selected!==postId/);assert.match(epoch,/if\(generation!==previewGeneration\)return/);assert.match(epoch,/이전 화면을 보존/);
});
