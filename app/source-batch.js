(function () {
  'use strict';
  const C=window.ThreadsSourceBatchCore, U=window.ThreadsSourceCuration, Z=window.ThreadsSourceCutZip;
  const $=id=>document.getElementById(id), encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
  const base=p=>String(p).replaceAll('\\','/').split('/').pop();
  const safe=s=>String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,90)||'source';
  const bytes=s=>encoder.encode(String(s));
  let chosen=null, output=null, files=[], running=false;
  let previewUrls=[];
  const presetKey='threads-curated-style-v1';
  const family=id=>id==='gothic'?'"Cut Gothic"':'"Carousel Sans KR"';
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
  $('batchFont').addEventListener('change',weights);weights();refreshPresets();
  $('saveBatchPreset').addEventListener('click',()=>{
    const name=$('batchPresetName').value.trim();if(!name)return status('프리셋 이름을 입력하세요.');
    const all=presets();if(!all[name]&&Object.keys(all).length>=20)return status('프리셋은 20개까지 저장할 수 있습니다.');
    all[name]={fontId:$('batchFont').value,titleWeight:Number($('batchWeight').value)};
    try {localStorage.setItem(presetKey,JSON.stringify(all));refreshPresets();$('batchPreset').value=name;
      status('폰트·굵기 프리셋을 저장했습니다. 현재 원문 ZIP에도 선택 설정이 기록됩니다.');}
    catch {status('프리셋을 브라우저에 저장하지 못했습니다. 원문 ZIP에는 스타일이 기록됩니다.');}
  });
  $('applyBatchPreset').addEventListener('click',()=>{
    const p=presets()[$('batchPreset').value];if(!p)return status('프리셋을 먼저 선택하세요.');
    $('batchFont').value=p.fontId;weights();$('batchWeight').value=String(p.titleWeight);
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
    plan.input={name:source.name,path:filePath(source),sha256:await hash(await source.arrayBuffer())};
    plan.media=[];
    return {plan,source,all};
  }
  function renderReview(item) {
    clearUrls();chosen=item;const p=item.plan;
    $('curation').hidden=false;
    $('originalTitle').value=p.originalTitle||'';
    $('coverTitle').value=p.coverTitle||'';
    $('coverTitleEvidence').value=p.coverTitleEvidence||p.originalTitle||'';
    $('sourceName').textContent='원본: '+p.input.name+' · 후보 본문 '+p.segments.length+'개 · 댓글 '+p.comments.length+'개';
    $('bodyVerified').checked=p.review.bodyVerified;
    $('mediaVerified').checked=p.review.mediaVerified;
    $('commentsVerified').checked=p.review.commentsVerified;
    $('batchFont').value=p.style?.fontId||'sans';weights();$('batchWeight').value=String(p.style?.titleWeight||900);
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
    p.style={fontId:$('batchFont').value,titleWeight:Number($('batchWeight').value)};
    const s=p.segments.find(x=>x.id===$('coverSource').value);
    p.cover={kind:s?.kind||null,segmentId:s?.id||null};
    return p;
  }
  async function sourceZip(item) {
    const p=readReview(), raw=new Uint8Array(await item.source.arrayBuffer()), packed=[];
    p.media=[];
    const seenMedia=new Set();
    for(const s of p.segments.filter(s=>s.selected&&s.kind==='image')) {
      if(seenMedia.has(s.mediaName.toLowerCase()))continue;
      seenMedia.add(s.mediaName.toLowerCase());
      const file=nearby(item.all,item.source,s.mediaName);
      if(!file) continue;
      const name='raw/media/'+s.id+'-'+safe(file.name),data=new Uint8Array(await file.arrayBuffer());
      p.media.push({segmentId:s.id,name:s.mediaName,file:name,sha256:await hash(data)});
      packed.push({name,data});
    }
    const original='raw/'+safe(item.source.name);
    p.input.file=original;
    const bundle=Z.zip([{name:'bundle.json',data:bytes(JSON.stringify(p,null,2)+'\n')},
      {name:original,data:raw},...packed]);
    return {bundle,plan:p};
  }
  function download(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function unpack(file) {
    const entries=await window.ThreadsSourceBundleZip.read(file);
    const raw=entries.get('bundle.json');if(!raw) throw new Error('원문 ZIP에 bundle.json이 없습니다.');
    const plan=JSON.parse(decoder.decode(raw));
    if(plan.schema!==U.schema || !plan.input?.file || !entries.has(plan.input.file))
      throw new Error('원문/목록이 없는 ZIP입니다.');
    if(await hash(entries.get(plan.input.file))!==plan.input.sha256) throw new Error('원본 파일이 수정되었습니다.');
    const media=new Map();
    for(const m of plan.media||[]) {
      const data=entries.get(m.file);
      if(!data || await hash(data)!==m.sha256) throw new Error('선별 이미지 파일이 없거나 수정되었습니다: '+m.name);
      if(media.has(m.name.toLowerCase())) throw new Error('이미지 이름 중복: '+m.name);
      media.set(m.name.toLowerCase(),{name:m.name,data,type:/\.png$/i.test(m.name)?'image/png':/\.webp$/i.test(m.name)?'image/webp':'image/jpeg'});
    }
    const errors=U.validate(plan,new Set(media.keys()));
    if(errors.length) throw new Error(errors.join(' · '));
    const fontId=plan.style?.fontId||'sans',weight=plan.style?.titleWeight||900;
    const text=[plan.coverTitle,...plan.segments.filter(s=>s.selected&&s.kind==='text').map(s=>s.text),
      ...plan.segments.filter(s=>s.selected&&s.after?.note).map(s=>s.after.note),
      ...plan.comments.filter(c=>c.selected).map(c=>c.text)].join('\n');
    window.ThreadsSourceCut.assertFontText(text,fontId);
    await Promise.all([document.fonts.load((fontId==='gothic'?800:400)+' 43px '+family(fontId)),
      document.fonts.load(weight+' 83px '+family(fontId))]);
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
  async function renderCurated(plan,media) {
    const pages=[],W=1080,H=1350,pad=65,canvas=document.createElement('canvas');
    const fontId=plan.style?.fontId||'sans',font=family(fontId),weight=plan.style?.titleWeight||900;
    const bodyFont=(fontId==='gothic'?800:400)+' 43px '+font;
    canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    const used=plan.segments.filter(s=>s.selected),cover=used.find(s=>s.id===plan.cover.segmentId);
    const imageCache=new Map();for(const item of used.filter(s=>s.kind==='image'))
      imageCache.set(item.mediaName.toLowerCase(),await loadImage(media.get(item.mediaName.toLowerCase())));
    const finish=()=>pages.push(canvas.toDataURL('image/png'));
    if(cover.kind==='image') {
      const img=imageCache.get(cover.mediaName.toLowerCase()),scale=Math.max(W/img.naturalWidth,H/img.naturalHeight);
      ctx.drawImage(img,(W-img.naturalWidth*scale)/2,(H-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
      const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(0,0,0,.68)');shade.addColorStop(.55,'rgba(0,0,0,.10)');shade.addColorStop(1,'rgba(0,0,0,.08)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    } else {
      ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#dce4ec';ctx.fillRect(42,42,W-84,H-84);
      ctx.fillStyle='#172237';ctx.font=(fontId==='gothic'?800:400)+' 48px '+font;ctx.textBaseline='top';
      wrap(ctx,cover.text,W-180).slice(0,14).forEach((line,i)=>ctx.fillText(line,90,540+i*58));
      ctx.fillStyle='rgba(255,255,255,.93)';ctx.fillRect(48,48,W-96,460);
    }
    ctx.textBaseline='top';ctx.font=weight+' 83px '+font;
    const heading=wrap(ctx,plan.coverTitle,W-160);
    if(heading.length>4) throw new Error('대문 글씨가 길어 한눈에 들어오지 않습니다. 4줄 이하로 줄여주세요.');
    ctx.lineWidth=cover.kind==='image'?10:7;ctx.lineJoin='round';
    heading.forEach((line,i)=>{const x=80,y=130+i*103;ctx.strokeStyle=cover.kind==='image'?'#111827':'#fff';ctx.fillStyle=cover.kind==='image'?'#fff':'#172237';ctx.strokeText(line,x,y);ctx.fillText(line,x,y);});finish();
    function begin() {ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#171c26';ctx.font=bodyFont;ctx.textBaseline='top';}
    begin();let y=pad,has=false;
    function next() {if(has)finish();begin();y=pad;has=false;}
    for(const part of used) {
      if(part.kind==='text') {
        ctx.font=bodyFont;
        for(const line of wrap(ctx,part.text,W-2*pad)) {
          if(y+61>H-pad) next();
          if(line)ctx.fillText(line,pad,y);
          y+=61;has=true;
        }
        y+=24;
      } else {
        const img=imageCache.get(part.mediaName.toLowerCase());
        const scale=Math.min((W-2*pad)/img.naturalWidth,(H-2*pad)/img.naturalHeight);
        const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);
        if(y+h>H-pad) next();
        ctx.drawImage(img,(W-w)/2,y,w,h);y+=h+34;has=true;
      }
      const extra=part.after||{};
      if(extra.gap) {if(y+Number(extra.gap)>H-pad)next();y+=Number(extra.gap);has=true;}
      if(extra.note?.trim()) {
        ctx.font=bodyFont;
        for(const line of wrap(ctx,extra.note,W-2*pad-52)) {
          if(y+62>H-pad)next();
          ctx.fillStyle='#2470b6';if(line)ctx.fillText(line,pad+26,y);y+=62;has=true;
        }
        ctx.fillStyle='#171c26';y+=32;
      }
      if(pages.length>60) throw new Error('본문이 너무 길어 원문 ZIP을 나눠야 합니다.');
    }
    if(has)finish();
    const comments=plan.comments.filter(c=>c.selected);
    if(comments.length) {begin();y=pad;has=false;
      for(const c of comments) {
        ctx.font=weight+' 39px '+font;
        for(const line of wrap(ctx,c.text,W-2*pad)) {
          if(y+60>H-pad) next();
          ctx.fillText(line,pad,y);y+=60;has=true;
        }y+=75;
      }
      if(has)finish();
    }
    return pages.map((url,i)=>({name:'rendered/slide-'+String(i+1).padStart(3,'0')+'.png',
      data:Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0))}));
  }
  async function renderBundle(file) {
    const {plan,media}=await unpack(file);
    const pages=await renderCurated(plan,media);
    const manifest={schema:'threads-curated-output-v1',sourceZip:file.name,sourceSha256:await hash(await file.arrayBuffer()),
      sourceUrl:plan.sourceUrl,originalTitle:plan.originalTitle,cover:plan.cover,coverTitle:plan.coverTitle,
      coverTitleEvidence:plan.coverTitleEvidence,
      style:plan.style||{fontId:'sans',titleWeight:900},editorialNotes:plan.segments.filter(s=>s.selected&&s.after?.note?.trim())
        .map(s=>({afterSegment:s.id,note:s.after.note,gap:s.after.gap||0})),
      selectedSegments:plan.segments.filter(s=>s.selected).map(s=>({id:s.id,location:s.location,kind:s.kind})),
      selectedComments:plan.comments.filter(c=>c.selected).map(c=>({id:c.id,location:c.location})),
      renderedPages:pages.length,publicationAllowed:false};
    return {pages:pages.length,images:pages,zip:Z.zip([...pages,{name:'manifest.json',data:bytes(JSON.stringify(manifest,null,2)+'\n')},
      {name:'source-bundle.zip',data:new Uint8Array(await file.arrayBuffer())}]),title:plan.coverTitle,plan};
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
  $('renderBundle').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {status('원문 ZIP의 선별 근거와 파일을 검사하고 이미지를 제작하는 중입니다.');
      const result=await renderBundle(file);
      await saveFile(result.zip,safe(result.title)+'-images.zip');
      await saveWorkflow(result.plan,result.zip,'converted',result.pages);
      clearUrls();const area=$('renderedPreview');area.replaceChildren();
      for(const [i,page] of result.images.entries()) {
        const fig=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
        const url=URL.createObjectURL(new Blob([page.data],{type:'image/png'}));previewUrls.push(url);
        img.src=url;img.alt='제작 이미지 '+(i+1)+'장';caption.textContent=(i+1)+'장';fig.append(img,caption);area.append(fig);
      }
      status('게시용 PNG '+result.pages+'장 제작 완료. 원문 ZIP의 선별 근거도 결과에 포함했습니다.');
    }catch(error){status('제작 중단: '+error.message);}e.target.value='';
  });
  window.ThreadsSourceBatch=Object.freeze({prepare,sourceZip,renderBundle,review:renderReview});
})();
