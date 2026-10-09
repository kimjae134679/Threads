(function () {
  'use strict';
  const C=window.ThreadsSourceBatchCore, U=window.ThreadsSourceCuration, Z=window.ThreadsSourceCutZip;
  const $=id=>document.getElementById(id), encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
  const base=p=>String(p).replaceAll('\\','/').split('/').pop();
  const safe=s=>String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,90)||'source';
  const bytes=s=>encoder.encode(String(s));
  let chosen=null, output=null, files=[], running=false;
  let previewUrls=[];
  // Keep at most one plan's decoded assets, and consume them after rendering.
  const pendingPixelLimit=32000000;
  let pendingAssets=null;
  const presetKey='threads-curated-style-v1';
  const family=(id,fallback=false)=>(id==='gothic'?'"Cut Gothic"':'"Carousel Sans KR"')+(fallback?', "Malgun Gothic", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif':'');
  function weights() {
    const select=$('batchWeight'),before=select.value;select.replaceChildren();
    for(const weight of $('batchFont').value==='gothic'?[800]:[400,900])
      select.add(new Option(weight===400?'보통 · 400':'굵게 · '+weight,String(weight)));
    if([...select.options].some(o=>o.value===before))select.value=before;
  }
  function presets() {try {return JSON.parse(localStorage.getItem(presetKey))||{};} catch {return {};}}
  function refreshPresets() {
    const select=$('batchPreset'),current=select.value;select.replaceChildren(new Option('저장된 프리셋 선택',''));
    for(const name of Object.keys(presets()))select.add(new Option(name,name));select.value=current;
  }
  function titleControls() {
    for(const id of ['coverSize','coverTop','coverLeft']) $(id).disabled=!$('manualTitleLayout').checked;
  }
  $('manualTitleLayout').addEventListener('change',titleControls);titleControls();
  $('batchFont').addEventListener('change',weights);weights();refreshPresets();
  $('saveBatchPreset').addEventListener('click',()=>{
    const name=$('batchPresetName').value.trim();if(!name)return status('프리셋 이름을 입력하세요.');
    const all=presets();if(!all[name]&&Object.keys(all).length>=20)return status('프리셋은 20개까지 저장할 수 있습니다.');
    all[name]={fontId:$('batchFont').value,titleWeight:Number($('batchWeight').value),templateId:$('batchTemplate').value,canvas:$('batchCanvas').value,
      coverSize:Number($('coverSize').value),coverTop:Number($('coverTop').value),
      coverLeft:Number($('coverLeft').value),manualTitleLayout:$('manualTitleLayout').checked};
    try {localStorage.setItem(presetKey,JSON.stringify(all));refreshPresets();$('batchPreset').value=name;
      status('폰트·굵기 프리셋을 저장했습니다. 현재 원문 ZIP에도 선택 설정이 기록됩니다.');}
    catch {status('프리셋을 브라우저에 저장하지 못했습니다. 원문 ZIP에는 스타일이 기록됩니다.');}
  });
  $('applyBatchPreset').addEventListener('click',()=>{
    const p=presets()[$('batchPreset').value];if(!p)return status('프리셋을 먼저 선택하세요.');
    $('batchFont').value=p.fontId;weights();$('batchWeight').value=String(p.titleWeight);
    $('batchTemplate').value=p.templateId||'auto';$('batchCanvas').value=p.canvas||'threads';
    $('coverSize').value=String(p.coverSize||70);$('coverTop').value=String(p.coverTop??44);
    $('coverLeft').value=String(p.coverLeft??67);
    $('manualTitleLayout').checked=p.manualTitleLayout===true;
    titleControls();
    status('선택한 스타일 프리셋을 적용했습니다.');
  });
  function clearUrls() {for(const url of previewUrls)URL.revokeObjectURL(url);previewUrls=[];}
  const filePath=f=>(f.webkitRelativePath||f.name).replaceAll('\\','/');
  function status(message) { $('summary').textContent=message; }
  function sourceInput(f) {
    const path=filePath(f);
    if(/(^|\/)(data\/(candidates|candidate_batches|candidate_bundles|jev_results|_raw_batches|_system|source-packages)|01_DISCOVERY\/data|03_PRODUCTION\/_TEMP_TEST_ONLY_DO_NOT_PUBLISH|test|docs)\//.test(path)) return false;
    if(/(^|\/)(manifest|comments|candidate|README|content)\.(txt|json|md)$/i.test(path)) return false;
    return /\.html?$/i.test(path)||/\.txt$/i.test(path)||/(?:source|article|post|verbatim)\.json$/i.test(f.name);
  }
  async function readSource(file) {
    if(!/\.html?$/i.test(file.name)) return file.text();
    const data=new Uint8Array(await file.arrayBuffer());
    const prefix=String.fromCharCode(...data.subarray(0,4096));
    const label=/charset\s*=\s*["']?([\w-]+)/i.exec(file.type)?.[1]||
      /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(prefix)?.[1]||'utf-8';
    try { return new TextDecoder(label).decode(data); } catch {return new TextDecoder().decode(data);}
  }
  function nearby(all,source,name) {
    const target=base(name).toLowerCase(),folder=filePath(source).split('/').slice(0,-1).join('/');
    const found=all.filter(f=>base(filePath(f)).toLowerCase()===target &&
      (/\.(png|jpe?g|webp|gif)$/i.test(f.name)||/^image\/(png|jpeg|webp|gif)/i.test(f.type)));
    return found.find(f=>filePath(f).startsWith(folder+'/'))||found.length===1&&found[0]||null;
  }
  function parseExact(raw,ext) {
    if(ext==='txt') {
      const data=C.parseExactText(raw);
      if(!data) throw new Error('정확한 [TITLE]·[BODY] 원문 TXT가 필요합니다.');
      const comments=data.comments.trim()==='NONE'?[]:data.comments.split(/\r?\n/).flatMap((line,i)=>{
        const match=/^\[\+(\d+)\] (.+)$/.exec(line);return match?[{text:match[2],likes:Number(match[1]),sourceOrder:i}]:[];
      });
      return {title:data.title,body:data.body,comments};
    }
    const data=JSON.parse(raw);
    if(data.schema!=='threads-verbatim-source-v1'||data.verbatim!==true||
      typeof data.title!=='string'||typeof data.body!=='string')
      throw new Error('원문 JSON에 threads-verbatim-source-v1과 verbatim=true가 필요합니다.');
    return data;
  }
  async function hash(data) {
    const digest=await crypto.subtle.digest('SHA-256',data);
    return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function prepare(source,all) {
    const raw=await readSource(source),ext=source.name.toLowerCase().split('.').pop();
    const available=all.filter(f=>/\.(png|jpe?g|webp|gif)$/i.test(f.name)||
      /^image\/(png|jpeg|webp|gif)/i.test(f.type)).map(f=>f.name);
    const plan=/^html?$/.test(ext)?U.htmlDraft(raw,available):U.exactDraft(parseExact(raw,ext));
    U.suggest(plan,available);
    plan.input={name:source.name,path:filePath(source),sha256:await hash(await source.arrayBuffer())};
    plan.media=[];
    return {plan,source,all};
  }
  async function loadSavedFolder(all) {
    const roots=all.filter(file=>filePath(file).split('/').length===2);
    const manifestFile=roots.find(file=>file.name==='manifest.json');
    const noteFile=roots.find(file=>file.name==='SOURCE.md');
    if(!manifestFile&&!noteFile) throw new Error('개별 후보 폴더(manifest.json) 또는 Source Package(SOURCE.md)를 선택하세요.');
    let metadata, directory, listed=null;
    if(manifestFile) {
      const data=JSON.parse(await manifestFile.text());
      if(data.schema!=='threads-program-input-v1') throw new Error('지원하지 않는 후보 manifest.json입니다.');
      if(!Array.isArray(data.media)||!data.media.length) throw new Error('후보 manifest.json에 검증 가능한 원본 이미지 목록이 없습니다.');
      metadata={title:data.title,sourceUrl:data.sourceUrl};directory='media';listed=data.media;
    } else {
      const note=await noteFile.text();
      metadata={title:/^- exact observed title: `([^`\r\n]*)`/m.exec(note)?.[1]||'',
        sourceUrl:/^- source URL: (https:\/\/\S+)/m.exec(note)?.[1]||''};directory='original';
      const intake=roots.find(file=>file.name==='intake-manifest.json');
      if(intake) {
        const data=JSON.parse(await intake.text());
        if(data.type!=='SCREENSHOT_INTAKE_MANIFEST'||!Array.isArray(data.assets))
          throw new Error('원본 이미지 검증 목록을 읽을 수 없습니다.');
        listed=data.assets.map(asset=>({file:'original/'+asset.name,sha256:asset.sha256}));
      }
    }
    const source=manifestFile||noteFile;
    const images=all.filter(file=>filePath(file).split('/').length===3 &&
      filePath(file).split('/')[1]===directory && /\.(png|jpe?g|webp)$/i.test(file.name));
    if(!images.length) throw new Error(directory+' 폴더에 원문 이미지가 없습니다. 후보 요약만으로 제작할 수 없습니다.');
    if(images.length>30 || images.some(file=>file.size>25*1024*1024) ||
      images.reduce((n,file)=>n+file.size,0)>60*1024*1024) throw new Error('이미지는 30장, 각 25MB, 합계 60MB 이하여야 합니다.');
    const names=new Set(images.map(file=>file.name.toLowerCase()));
    if(names.size!==images.length) throw new Error('원문 이미지 파일명이 중복됩니다.');
    let ordered=images.sort((a,b)=>a.name.localeCompare(b.name,'ko',{numeric:true,sensitivity:'base'}));
    if(listed?.length) {
      if(listed.length!==images.length || new Set(listed.map(entry=>base(entry.file).toLowerCase())).size!==listed.length)
        throw new Error('원문 이미지 목록과 저장 파일의 개수 또는 이름이 다릅니다.');
      ordered=[];
      for(const entry of listed) {
        const file=images.find(item=>item.name.toLowerCase()===base(entry.file).toLowerCase());
        if(!file || !entry.sha256 || await hash(await file.arrayBuffer())!==entry.sha256)
          throw new Error('원문 이미지 누락 또는 변경: '+entry.file);
        ordered.push(file);
      }
    }
    const plan=U.savedMediaDraft({...metadata,mediaNames:ordered.map(file=>file.name)});
    U.suggest(plan,ordered.map(file=>file.name));
    plan.input={name:source.name,path:filePath(source),sha256:await hash(await source.arrayBuffer())};
    const item={plan,source,all:[source,...ordered]};renderReview(item);
    $('savedPreview').disabled=false;
    $('savedSourceStatus').textContent=`${ordered.length}장 불러옴 · 제목 확인 · 본문 글/댓글/이미지 위치 미확인 · 검수 전 미리보기 가능`;
    status('저장된 원문을 열었습니다. 이미지 순서를 확인하고 검수 전 미리보기를 만드세요.');
    return item;
  }
  function renderReview(item) {
    clearUrls();chosen=item;const p=item.plan;
    $('curation').hidden=false;
    $('originalTitle').value=p.originalTitle||'';
    $('coverTitle').value=p.editorial?.coverLines?.join('\n')||p.coverTitle||'';
    $('titleHighlights').value=(p.editorial?.titleHighlights||[]).join(', ');
    $('coverTitleEvidence').value=p.coverTitleEvidence||p.originalTitle||'';
    $('sourceName').textContent=p.sourceType==='saved-media'?
      '저장 자료: '+p.input.name+' · 원본 이미지 '+p.segments.length+'장 · 본문 글·댓글 원문 없음':
      '원본: '+p.input.name+' · 본문 '+p.segments.length+'개 · 댓글 '+p.comments.length+'개';
    const suggestion=p.suggestion;
    $('suggestionStatus').textContent=p.sourceType==='saved-media'?
      '저장된 이미지 파일명 순서만 임시로 표시했습니다. 본문 안의 실제 위치와 글·댓글은 확인되지 않았습니다. 이미지 순서와 내용을 원문과 대조하세요.':suggestion?
      `자동 초안: 본문 ${suggestion.body}개, 실제 파일이 있는 이미지 ${suggestion.images}개, 반응 근거가 있는 댓글 ${suggestion.comments}개 선택 · 이미지 파일 미확보 ${suggestion.missing}개. 원문과 대조해 불필요한 부분을 빼고 누락을 확인하세요.`:
      '저장한 선별 결과를 열었습니다. 원문과 대조한 뒤 확인 표시를 해 주세요.';
    $('bodyVerified').checked=p.review.bodyVerified;
    $('mediaVerified').checked=p.review.mediaVerified;
    $('commentsVerified').checked=p.review.commentsVerified;
    $('batchFont').value=p.style?.fontId||'sans';weights();$('batchWeight').value=String(p.style?.titleWeight||900);
    $('batchTemplate').value=p.style?.templateId||'auto';$('batchCanvas').value=p.style?.canvasMode==='instagram'?(p.style.aspectRatio||'4:5'):'threads';
    $('coverSize').value=String(p.style?.coverSize||70);$('coverTop').value=String(p.style?.coverTop??44);
    $('coverLeft').value=String(p.style?.coverLeft??67);
    $('manualTitleLayout').checked=p.style?.manualTitleLayout===true;
    titleControls();
    const areas=$('segmentChoices');areas.replaceChildren();
    for(const part of p.segments) {
      const div=document.createElement('div');div.className='choice';
      const label=document.createElement('label'), check=document.createElement('input');check.type='checkbox';check.checked=part.selected;
      check.addEventListener('change',()=>{part.selected=check.checked; updateCoverOptions();});
      label.append(check,document.createTextNode(part.kind==='image'?' 이미지: '+part.mediaName:' 글 조각: '+part.text.slice(0,140)));
      const loc=document.createElement('small');loc.textContent='원문 위치: '+part.location+(part.kind==='image'&&!nearby(item.all,item.source,part.mediaName)?' · 원본 파일 없음':'');
      div.append(label,loc);areas.append(div);
      if(part.kind==='image') {
        const original=nearby(item.all,item.source,part.mediaName);
        if(original){const image=document.createElement('img'),url=URL.createObjectURL(original);
          previewUrls.push(url);image.src=url;image.alt='원본 이미지 후보: '+part.mediaName;div.append(image);}
      } else if(part.text.length>140) {
        const details=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('p');
        title.textContent='원문 글 전체 보기';body.textContent=part.text;details.append(title,body);div.append(details);
      }
      const after=document.createElement('div');after.className='editorial-controls';
      const gapLabel=document.createElement('label'),gap=document.createElement('input');
      gap.type='number';gap.min='0';gap.max='400';gap.step='10';gap.value=String(part.after?.gap??0);
      gap.addEventListener('input',()=>{part.after={gap:Number(gap.value),note:part.after?.note||''};});
      gapLabel.append('뒤 여백(px)',gap);
      const noteLabel=document.createElement('label'),note=document.createElement('textarea');
      note.maxLength=500;note.placeholder='직접 쓰는 중간 의견 (원문 댓글과 구분)';note.value=part.after?.note||'';
      note.addEventListener('input',()=>{part.after={gap:Number(gap.value),note:note.value};});
      noteLabel.append('조각 뒤 내 의견',note);after.append(gapLabel,noteLabel);div.append(after);
    }
    const comments=$('commentChoices');comments.replaceChildren();
    for(const c of p.comments) {
      const div=document.createElement('div'),label=document.createElement('label'),check=document.createElement('input');
      div.className='choice';
      check.type='checkbox';check.checked=c.selected;check.addEventListener('change',()=>{c.selected=check.checked;});
      label.append(check,document.createTextNode(' '+c.text.slice(0,200)));
      const loc=document.createElement('small');loc.textContent='원문 위치: '+c.location+' · 반응 '+(c.best?'BEST':c.likes??'미확인');
      div.append(label,loc);comments.append(div);
    }
    updateCoverOptions();$('curation').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function updateCoverOptions() {
    const p=chosen.plan, select=$('coverSource');select.replaceChildren();
    select.add(new Option('첫 장에 사용할 원문 글/이미지 선택',''));
    for(const s of p.segments.filter(s=>s.selected))
      select.add(new Option((s.kind==='image'?'이미지 ':'본문 글 ')+(s.kind==='image'?s.mediaName:s.text.slice(0,65))+' · '+s.location,s.id));
    select.value=p.cover.segmentId||'';
    if(!select.value) p.cover={kind:null,segmentId:null};
  }
  function readReview() {
    const p=chosen.plan;
    p.originalTitle=$('originalTitle').value.trim();p.coverTitle=$('coverTitle').value.trim();
    p.coverTitleEvidence=$('coverTitleEvidence').value.trim();
    p.review={bodyVerified:$('bodyVerified').checked,mediaVerified:$('mediaVerified').checked,
      commentsVerified:$('commentsVerified').checked};
    p.style={...p.style,fontId:$('batchFont').value,titleWeight:Number($('batchWeight').value),
      templateId:$('batchTemplate').value,canvasMode:$('batchCanvas').value==='threads'?'threads':'instagram',aspectRatio:$('batchCanvas').value==='threads'?null:$('batchCanvas').value,
      coverSize:Number($('coverSize').value),coverTop:Number($('coverTop').value),
      coverLeft:Number($('coverLeft').value),manualTitleLayout:$('manualTitleLayout').checked,allowSystemFallback:p.style?.allowSystemFallback===true};
    p.editorial={...p.editorial,coverTitle:p.coverTitle,titleEvidence:p.coverTitleEvidence,templateId:p.style.templateId,
      coverLines:p.coverTitle.includes('\n')?p.coverTitle.split('\n').filter(line=>line.trim()):null,
        titleHighlights:$('titleHighlights').value.split(/(?<!\d),|,(?!\d)|[;\n]/).map(word=>word.trim()).filter(Boolean)};
    const s=p.segments.find(x=>x.id===$('coverSource').value);
    p.cover={kind:s?.kind||null,segmentId:s?.id||null};
    return p;
  }
  async function sourceZip(item) {
    const p=JSON.parse(JSON.stringify(readReview())), raw=new Uint8Array(await item.source.arrayBuffer()), packed=[];
    U.normalizeTitles(p);p.media=[];
    const seenMedia=new Set();
    for(const s of p.segments.filter(s=>s.selected&&s.kind==='image')) {
      if(seenMedia.has(s.mediaName.toLowerCase()))continue;
      seenMedia.add(s.mediaName.toLowerCase());
      const file=nearby(item.all,item.source,s.mediaName);
      if(!file) continue;
      const name=(s.coverOnly?'supplementary/':'raw/media/')+s.id+'-'+safe(file.name),data=new Uint8Array(await file.arrayBuffer());
      p.media.push({segmentId:s.id,name:s.mediaName,file:name,sha256:await hash(data)});
      packed.push({name,data});
    }
    const original='raw/'+safe(item.source.name);
    if(p.imageComposition){
      const assets=[];
      for(const asset of p.imageComposition.assets){
        const data=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),file='composition/'+asset.name;
        if(await hash(data)!==asset.sha256)throw new Error('합성 자산 hash mismatch');
        const {data:encoded,...metadata}=asset;
        assets.push({...metadata,file});packed.push({name:file,data});
      }
      p.imageComposition={...p.imageComposition,assets};
    }
    p.input.file=original;
    const bundle=Z.zip([{name:'bundle.json',data:bytes(JSON.stringify(p,null,2)+'\n')},
      {name:original,data:raw},...packed]);
    return {bundle,plan:p};
  }
  function download(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function unpack(file,{preview=false}={}) {
    const entries=await window.ThreadsSourceBundleZip.read(file);
    const raw=entries.get('bundle.json');if(!raw) throw new Error('원문 ZIP에 bundle.json이 없습니다.');
    const plan=JSON.parse(decoder.decode(raw));
    if(plan.schema!==U.schema || !plan.input?.file || !entries.has(plan.input.file))
      throw new Error('원문/목록이 없는 ZIP입니다.');
    if(await hash(entries.get(plan.input.file))!==plan.input.sha256) throw new Error('원본 파일이 수정되었습니다.');
    const media=new Map();
    for(const asset of plan.imageComposition?.assets||[]){
      const data=entries.get(asset.file);
      if(!data||await hash(data)!==asset.sha256)throw new Error('합성 이미지 파일 hash mismatch: '+asset.name);
      media.set(asset.name.toLowerCase(),{name:asset.name,data,type:asset.type});
    }
    for(const m of plan.media||[]) {
      const data=entries.get(m.file);
      if(!data || await hash(data)!==m.sha256) throw new Error('선별 이미지 파일이 없거나 수정되었습니다: '+m.name);
      if(media.has(m.name.toLowerCase())) throw new Error('이미지 이름 중복: '+m.name);
      media.set(m.name.toLowerCase(),{name:m.name,data,type:/\.png$/i.test(m.name)?'image/png':/\.webp$/i.test(m.name)?'image/webp':'image/jpeg'});
    }
    const errors=U.validate(plan,new Set(media.keys())).filter(error=>
      !preview || error!=='본문·이미지·댓글 확인 표시가 모두 필요합니다.');
    if(errors.length) throw new Error(errors.join(' · '));
    const fontId=plan.style?.fontId||'sans',weight=plan.style?.titleWeight||900;
    const text=[plan.coverTitle,...plan.segments.filter(s=>s.selected&&s.kind==='text').map(s=>s.text),
      ...plan.segments.filter(s=>s.selected&&s.after?.note).map(s=>s.after.note),
      ...plan.comments.filter(c=>c.selected).map(c=>c.text)].join('\n');
    try {window.ThreadsSourceCut.assertFontText(text,fontId);} catch(error) {
      if(!plan.style?.allowSystemFallback)throw error;
      plan.fontFallback='unsupported source glyphs use local system fonts';
    }
    await Promise.all([document.fonts.load((fontId==='gothic'?800:400)+' 43px '+family(fontId)),
      document.fonts.load(weight+' 88px '+family(fontId)),
      ...(preview?[document.fonts.load('900 26px "Carousel Sans KR"')]:[])]);
    const screen=C.severeScreen({title:plan.coverTitle,body:plan.segments.filter(s=>s.selected&&s.kind==='text').map(s=>s.text).join('\n'),
      popularComments:plan.comments.filter(c=>c.selected)},window.ThreadsViralModel.comfortScan);
    if(screen.excluded) throw new Error('심한 소재 제외: '+screen.reasons.join(', '));
    return {plan,media,original:file};
  }
  async function reopenBundle(file) {
    const entries=await window.ThreadsSourceBundleZip.read(file);
    const data=entries.get('bundle.json');
    if(!data) throw new Error('선별 기록 bundle.json이 없습니다.');
    const plan=JSON.parse(decoder.decode(data));
    if(plan.schema!==U.schema || !plan.input?.file) throw new Error('지원하지 않는 원문 ZIP입니다.');
    const raw=entries.get(plan.input.file);
    if(!raw || await hash(raw)!==plan.input.sha256) throw new Error('원본 파일이 없거나 변경되었습니다.');
    const source=new File([raw],plan.input.name), all=[source];
    for(const item of plan.media||[]) {
      const media=entries.get(item.file);
      if(!media || await hash(media)!==item.sha256) throw new Error('원본 이미지가 변경되었습니다: '+item.name);
      all.push(new File([media],item.name));
    }
    if(plan.imageComposition)for(const asset of plan.imageComposition.assets){
      const data=entries.get(asset.file);if(!data||await hash(data)!==asset.sha256)throw new Error('합성 이미지 hash mismatch');
      let raw='';for(let i=0;i<data.length;i+=16384)raw+=String.fromCharCode(...data.subarray(i,i+16384));asset.data=btoa(raw);
    }
    renderReview({plan,source,all});
  }
  async function loadImage(media) {
    const url=URL.createObjectURL(new Blob([media.data],{type:media.type}));
    try {const img=new Image();img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>80000000)
      throw new Error('원본 이미지가 너무 큽니다: '+media.name);return img;
    } finally {URL.revokeObjectURL(url);}
  }
  function wrap(ctx,text,width) {
    const result=[];
    for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')) {
      if(!paragraph) {result.push('');continue;}
      let line='';
      for(const char of paragraph) {
        if(line && ctx.measureText(line+char).width>width) {result.push(line);line=char;} else line+=char;
      }
      result.push(line);
    }
    return result;
  }
  async function layoutFor(plan,media,{preserveBodyPlan=null}={}) {
    const images=new Map(),dimensions={};
    try {for(const item of plan.segments.filter(s=>!preserveBodyPlan&&s.selected&&s.kind==='image')) {
      const name=item.mediaName.toLowerCase();if(images.has(name))continue;
      const img=await loadImage(media.get(name));images.set(name,img);
      dimensions[name]={width:img.naturalWidth,height:img.naturalHeight,sha256:plan.media?.find(m=>m.name?.toLowerCase()===name)?.sha256,
        analysis:window.ThreadsImageAnalysis.inspect(img)};
    }
    const ctx=document.createElement('canvas').getContext('2d'),font=family(plan.style?.fontId||'sans',plan.style?.allowSystemFallback);
    const layout=preserveBodyPlan?JSON.parse(JSON.stringify(preserveBodyPlan)):window.ThreadsPagePlan.compile(plan,dimensions,(text,size,weight=400)=>{ctx.font=weight+' '+size+'px '+font;return ctx.measureText(text).width;});
    if(preserveBodyPlan){layout.bodyRuleVersion=layout.ruleVersion;layout.ruleVersion=window.ThreadsPagePlan.VERSION;layout.bodyPreserved=true;}
    for(const asset of plan.imageComposition?.assets||[]){
      const name=asset.name.toLowerCase(),img=await loadImage(media.get(name));images.set(name,img);
      dimensions[name]={width:img.naturalWidth,height:img.naturalHeight,sha256:asset.sha256};
    }
    if(plan.imageComposition||plan.completeCover)window.ThreadsImageComposition.applyComposition(layout,plan,dimensions,(text,size,weight=900)=>{ctx.font=weight+' '+size+'px '+font;return ctx.measureText(text).width;},window.ThreadsPagePlan);
    layout.imageAnalysis=dimensions;
    return {layout,images,font};
    }catch(error){releaseImages(images);throw error;}
  }
  function releaseImages(images) {for(const image of images.values())image.src='';images.clear();}
  function releasePending() {
    if(pendingAssets)releaseImages(pendingAssets.images);
    pendingAssets=null;
  }
  async function planBundle(file,{preview=false,universalCover=false,preserveBodyPlan=null}={}) {
    releasePending();
    const {plan,media}=await unpack(file,{preview});
    U.normalizeTitles(plan);
    const productionSource=universalCover?window.ThreadsUniversalProductionModel.preparePlan(plan):plan;
    const prepared=await layoutFor(productionSource,media,{preserveBodyPlan});
    try {prepared.layout.bundleSha256=await hash(await file.arrayBuffer());}
    catch(error){releaseImages(prepared.images);throw error;}
    const pixels=[...prepared.images.values()].reduce((sum,image)=>sum+image.naturalWidth*image.naturalHeight,0);
    releasePending();
    if(pixels<=pendingPixelLimit)pendingAssets={...prepared,file};
    else releaseImages(prepared.images);
    return prepared.layout;
  }
  async function renderAssets(plan,media,productionPlan,file,coverOnly=false) {
    if(pendingAssets?.file===file&&pendingAssets.layout===productionPlan) {
      const prepared=pendingAssets;pendingAssets=null;return prepared;
    }
    releasePending();
    if(!productionPlan)return layoutFor(plan,media);
    const images=new Map();
    try {
      for(const page of coverOnly?productionPlan.pages.slice(0,1):productionPlan.pages)for(const op of page.operations) {
        if(op.kind!=='image'||images.has(op.name))continue;
        const source=media.get(op.name);
        if(!source)throw new Error('제작 계획의 원본 이미지가 없습니다: '+op.name);
        images.set(op.name,await loadImage(source));
      }
      return {layout:productionPlan,images,font:family(plan.style?.fontId||'sans',plan.style?.allowSystemFallback)};
    }catch(error){releaseImages(images);throw error;}
  }
  async function renderCurated(plan,media,{preview=false,watermark=true,productionPlan=null,file=null,coverOnly=false}={}) {
    if(productionPlan&&productionPlan.ruleVersion!==window.ThreadsPagePlan.VERSION)
      throw new Error('제작 계획의 처리 규칙이 변경되었습니다. 다시 계획하세요.');
    const prepared=await renderAssets(plan,media,productionPlan,file,coverOnly),layout=prepared.layout;
    const {images,font}=prepared;
    if(layout.ruleVersion!==window.ThreadsPagePlan.VERSION)throw new Error('제작 계획의 기준 버전이 오래되었습니다. 다시 계획하세요.');
    const titlePolicy=window.ThreadsPagePlan;if(titlePolicy.titleInfo&&titlePolicy.titleInfo(layout.coverTitle||plan.coverTitle).sourceLabels.length)throw new Error('제목 출처 정제가 누락되어 렌더를 보류합니다.');
    plan.productionPlan=layout;
    const output=[];
    try {for(const page of coverOnly?layout.pages.slice(0,1):layout.pages) {
      const canvas=document.createElement('canvas');canvas.width=page.width;canvas.height=page.height;
      const ctx=canvas.getContext('2d');ctx.fillStyle=page.background||'#fff';ctx.fillRect(0,0,page.width,page.height);
      ctx.textBaseline='top';
      for(const op of page.operations) {
        if(op.kind==='image'){
          const img=images.get(op.name);
          if(op.sourceHeight)ctx.drawImage(img,op.sourceX||0,op.sourceY,op.sourceWidth||img.naturalWidth,op.sourceHeight,op.x,op.y,op.width,op.height);
          else ctx.drawImage(img,op.x,op.y,op.width,op.height);
        }else if(op.kind==='rect'){ctx.fillStyle=op.color;ctx.fillRect(op.x,op.y,op.width,op.height);
        }else if(op.kind==='gradient'){
          const gradient=ctx.createLinearGradient(0,op.y,0,op.y+op.height);
          gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(0.4,'rgba(0,0,0,0.6)');gradient.addColorStop(1,'rgba(0,0,0,0.9)');
          ctx.fillStyle=gradient;ctx.fillRect(op.x,op.y,op.width,op.height);
        }else{
          if(op.runs){
            ctx.textAlign='left';let x=op.x;
            for(const run of op.runs){ctx.font=run.weight+' '+run.size+'px '+font;ctx.fillStyle=run.color;const y=op.y+Math.max(0,op.size*1.06-run.size)*.8;
              if(op.stroke){ctx.strokeStyle=op.stroke;ctx.lineWidth=op.strokeWidth||2;ctx.lineJoin='round';ctx.strokeText(run.text,x,y);}ctx.fillText(run.text,x,y);x+=ctx.measureText(run.text).width;}
            continue;
          }
          ctx.textAlign=op.align||'left';ctx.font=op.weight+' '+op.size+'px '+font;ctx.fillStyle=op.color||'#171c26';
          if(op.stroke){ctx.strokeStyle=op.stroke;ctx.lineWidth=op.strokeWidth||2;ctx.lineJoin='round';ctx.strokeText(op.text,op.x,op.y);}
          ctx.fillText(op.text,op.x,op.y);
          if(op.highlights?.length){
            const width=ctx.measureText(op.text).width,left=op.align==='center'?op.x-width/2:op.x;
            ctx.textAlign='left';ctx.fillStyle=op.highlightColor;
            for(const word of op.highlights){let at=op.text.indexOf(word);while(at>=0){
              ctx.fillText(word,left+ctx.measureText(op.text.slice(0,at)).width,op.y);at=op.text.indexOf(word,at+word.length);
            }}
          }
        }
      }
      if(preview&&watermark){ctx.fillStyle='#9f1239';ctx.font='900 20px "Carousel Sans KR"';ctx.textAlign='right';
        ctx.fillText('검수 전 · 게시 금지',page.width-24,page.height-32);}
      const url=canvas.toDataURL('image/png');
      output.push({name:'rendered/slide-'+String(page.number).padStart(3,'0')+'.png',data:Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0))});
    }
    }finally{releaseImages(images);}
    return output;
  }
  async function renderBundle(file,{preview=false,watermark=true,productionPlan=null,coverOnly=false}={}) {
    try {
    const {plan,media}=await unpack(file,{preview});
    const bundleData=await file.arrayBuffer(),bundleSha256=await hash(bundleData);
    if(productionPlan&&productionPlan.bundleSha256!==bundleSha256)throw new Error('제작 계획과 원문 ZIP이 다릅니다.');
    const pages=await renderCurated(plan,media,{preview,watermark,productionPlan,file,coverOnly});
    const manifest={schema:preview?'threads-curated-preview-v1':'threads-curated-output-v1',sourceZip:file.name,sourceSha256:bundleSha256,
      sourceUrl:plan.sourceUrl,originalTitle:plan.originalTitle,displayTitle:plan.displayTitle,captionInputTitle:plan.captionInputTitle,titleSourceLabels:plan.titleSourceLabels,cover:plan.cover,coverTitle:plan.coverTitle,
      coverTitleEvidence:plan.coverTitleEvidence,
      style:plan.style||{fontId:'sans',titleWeight:900},editorialNotes:plan.segments.filter(s=>s.selected&&s.after?.note?.trim())
        .map(s=>({afterSegment:s.id,note:s.after.note,gap:s.after.gap||0})),
      selectedSegments:plan.segments.filter(s=>s.selected).map(s=>({id:s.id,location:s.location,kind:s.kind})),
      selectedComments:plan.comments.filter(c=>c.selected).map(c=>({id:c.id,location:c.location})),
      imageComposition:plan.productionPlan?.imageComposition||null,
      productionPlan:plan.productionPlan,renderedPages:pages.length,fontFallback:plan.fontFallback||null,publicationAllowed:false,previewOnly:preview};
    return {pages:pages.length,images:pages,zip:Z.zip([...pages,{name:'manifest.json',data:bytes(JSON.stringify(manifest,null,2)+'\n')},
      {name:'source-bundle.zip',data:new Uint8Array(bundleData)}]),title:plan.coverTitle,plan};
    }catch(error){releasePending();throw error;}
  }
  async function saveFile(blob,name) {
    if(output) {
      try {await output.getFileHandle(name);name=name.replace(/\.zip$/i,'-'+Date.now()+'.zip');}
      catch(e){if(e.name!=='NotFoundError')throw e;}
      const handle=await output.getFileHandle(name,{create:true});
      const writer=await handle.createWritable();
      try {await writer.write(blob);await writer.close();return;} catch(e){await writer.abort().catch(()=>{});throw e;}
    }
    download(blob,name);
  }
  async function saveWorkflow(plan,blob,state,pages) {
    if(!plan.candidate)return;
    const params=new URLSearchParams({candidate:plan.candidate,state,pages:String(pages),
      note:state==='needs_selection'?'원문 ZIP 저장, 선별 확인 및 제작 대기':'선별 원문 ZIP으로 PNG 제작'});
    const response=await fetch('/api/source-workflow/result?'+params,{method:'POST',
      headers:{'content-type':'application/zip'},body:blob});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error('결과 폴더 기록 실패: '+(data.message||data.error||response.status));
  }
  $('savedSourceFolder').addEventListener('change',async e=>{
    $('savedPreview').disabled=true;chosen=null;$('curation').hidden=true;
    try {await loadSavedFolder([...e.target.files]);}
    catch(error) {$('savedSourceStatus').textContent='불러오기 실패: '+error.message;}
    e.target.value='';
  });
  $('savedPreview').addEventListener('click',()=>$('previewCurrent').click());
  $('sources').addEventListener('change',e=>{
    files=[...e.target.files];$('rows').replaceChildren();
    $('start').disabled=!files.some(sourceInput);
    status('원본 '+files.length+'개를 선택했습니다. 먼저 한 건씩 선별해 원문 ZIP을 만드세요.');
  });
  $('output').addEventListener('click',async()=>{
    try {output=await showDirectoryPicker({mode:'readwrite'});$('outputName').textContent='결과 폴더: '+output.name;}
    catch(e){status('폴더 선택 실패: '+e.message);}
  });
  $('start').addEventListener('click',async()=>{
    if(running)return;running=true;$('start').disabled=true;
    const sources=files.filter(sourceInput);$('rows').replaceChildren();
    for(const f of sources) {
      const row=document.createElement('tr');
      for(const text of [filePath(f),'원문 후보','선별 대기','0'])
        {const cell=document.createElement('td');cell.textContent=text;row.append(cell);}
      const cell=document.createElement('td'),button=document.createElement('button');
      button.textContent='이 원문 선별';button.type='button';
      button.addEventListener('click',async()=>{
        try {renderReview(await prepare(f,files));status('원본을 열었습니다. 사용할 조각을 고르세요: '+f.name);}
        catch(e){status('원문 읽기 실패: '+e.message);}
      });cell.append(button);row.append(cell);$('rows').append(row);
    }
    $('progress').max=Math.max(1,sources.length);$('progress').value=sources.length;
    status('원문 후보 '+sources.length+'건을 표시했습니다. 각 행의 선별 버튼으로 검토하세요.');
    running=false;$('start').disabled=false;
  });
  $('applySuggestion').addEventListener('click',()=>{
    if(!chosen)return;
    U.suggest(chosen.plan,chosen.all.filter(file=>/\.(png|jpe?g|webp|gif)$/i.test(file.name)).map(file=>file.name));
    renderReview(chosen);status('자동 초안을 다시 적용했습니다. 기존 선택과 확인 표시는 초기화됐습니다.');
  });
  $('previewCurrent').addEventListener('click',async()=>{
    if(!chosen)return;
    try {const {bundle,plan}=await sourceZip(chosen);
      await makeImages(new File([bundle],safe(plan.originalTitle)+'-source.zip'),true);
    }catch(e){status('미리보기 실패: '+e.message);}
  });
  $('renderCurrent').addEventListener('click',async()=>{
    if(!chosen)return;
    try {const {bundle,plan}=await sourceZip(chosen);
      const name=safe(plan.originalTitle)+'-source.zip';
      await saveFile(bundle,name);
      await makeImages(new File([bundle],name),false);
    }catch(e){status('제작 실패: '+e.message);}
  });
  $('saveBundle').addEventListener('click',async()=>{
    if(!chosen)return;
    try {const {bundle,plan}=await sourceZip(chosen),name=safe(plan.originalTitle)+'-source.zip';
      await saveFile(bundle,name);await saveWorkflow(plan,bundle,'needs_selection',0);
      status('원문 ZIP 저장: '+name+' · 이제 ZIP을 아래에서 열고 이미지를 만드세요.');
    }catch(e){status('원문 ZIP 저장 실패: '+e.message);}
  });
  $('openBundle').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {await reopenBundle(file);status('저장한 원문 ZIP의 선별 기준을 열었습니다. 수정 후 새 ZIP으로 저장하세요.');}
    catch(error){status('원문 ZIP 열기 실패: '+error.message);}e.target.value='';
  });
  async function makeImages(file,preview) {
    try {status('원문 ZIP의 선별 근거와 파일을 검사하고 이미지를 제작하는 중입니다.');
      const result=await renderBundle(file,{preview});
      await saveFile(result.zip,safe(result.title)+(preview?'-review-preview.zip':'-images.zip'));
      if(!preview)await saveWorkflow(result.plan,result.zip,'converted',result.pages);
      clearUrls();const area=$('renderedPreview');area.replaceChildren();
      for(const [i,page] of result.images.entries()) {
        const fig=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
        const url=URL.createObjectURL(new Blob([page.data],{type:'image/png'}));previewUrls.push(url);
        img.src=url;img.alt='제작 이미지 '+(i+1)+'장';caption.textContent=(i+1)+'장';fig.append(img,caption);area.append(fig);
      }
      status(preview?'검수 전 예시 '+result.pages+'장. 게시 금지 표시가 들어갔고 제작 완료로 기록하지 않았습니다.':
        '검수 표시된 PNG '+result.pages+'장 제작 완료. 게시 승인과 권리·개인정보 확인은 별도입니다.');
    }catch(error){status('제작 중단: '+error.message);}
  }
  for(const [id,preview] of [['previewBundle',true],['renderBundle',false]])
    $(id).addEventListener('change',async e=>{
      const file=e.target.files[0];if(file)await makeImages(file,preview);e.target.value='';
    });
  window.ThreadsSourceBatch=Object.freeze({prepare,loadSavedFolder,sourceZip,planBundle,renderBundle,review:renderReview});
})();
