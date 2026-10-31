import pathlib,json,hashlib,shutil,re,os,html,urllib.parse,collections,base64,datetime
ROOT=pathlib.Path(r"C:\KJ\Github\Threads")
RUNTIME=pathlib.Path(r"D:\A_KJ\AI\Workspace\Threads\unified-moneti-20261014")
AUDIT=pathlib.Path(r"D:\A_KJ\AI\Workspace\organization-20261031\content-organization")
STAGE=ROOT/"99_작업영역/로컬보관/자료내용정리_stage"
assert not STAGE.exists(),"stage already exists"
STAGE.mkdir(parents=True)
copied=[];catalog=[];provenance=[];warnings=[];names={}
image_ext={".png",".jpg",".jpeg",".webp",".gif",".bmp"}
PROTECTED=["local-private/operating-studio/state.json","local-private/operating-studio/final-review-decisions.json","local-private/migration-manifest.json"]
guard={x:hashlib.sha256((RUNTIME/x).read_bytes()).hexdigest() for x in PROTECTED}
(AUDIT/"content-protected-before.json").write_text(json.dumps(guard,indent=2),encoding="utf-8")
def sha(b):return hashlib.sha256(b).hexdigest()
def safe(t):
 t=re.sub(r"^(?:C\d[-_ ]*A\d[-_ ]*P\d[-_ ]*)","",str(t)).strip()
 t=re.sub(r"\.(txt|jpe?g|png|webp)$","",t,flags=re.I)
 t=re.sub(r'[<>:"/\\|?*\x00-\x1f]',' ',t)
 t=re.sub(r"\s+"," ",t).strip(" .")
 t=t[:78].rstrip(" .") or "제목 미확인"
 if t.upper() in {"CON","PRN","AUX","NUL",*(f"COM{i}" for i in range(1,10)),*(f"LPT{i}" for i in range(1,10))}:t="자료_"+t
 return t
def folder(parent,title):
 key=(str(parent),safe(title).casefold());n=names.get(key,0)+1;names[key]=n
 p=parent/(safe(title)+(f" ({n})" if n>1 else ""));p.mkdir(parents=True)
 return p
def write(p,t):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(str(t).rstrip()+"\n",encoding="utf-8-sig" if p.suffix==".txt" else "utf-8")
def copy(src,dst,expected=None):
 src=pathlib.Path(src);assert src.is_file() and not src.is_symlink(),str(src)
 b=src.read_bytes();h=sha(b)
 if expected:assert h==expected,("source hash mismatch",str(src))
 dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(b)
 assert sha(dst.read_bytes())==h
 copied.append({"source":str(src),"relative":dst.relative_to(STAGE).as_posix(),"bytes":len(b),"sha256":h})
 return len(b)
def record(kind,title,p,**extra):
 row={"kind":kind,"title":title,"file":(p/"읽기.html").relative_to(STAGE).as_posix(),**extra};catalog.append(row)
def href(p,base):
 return urllib.parse.quote(os.path.relpath(p,base).replace("\\","/"),safe="/._-()")
STYLE="body{font:16px/1.7 'Malgun Gothic',sans-serif;background:#f6f7f9;color:#202630;margin:0;padding:24px}main{max-width:980px;margin:auto;background:white;padding:24px;border-radius:12px}h1{font-size:26px;line-height:1.4}pre{white-space:pre-wrap;font:inherit}img{display:block;max-width:100%;height:auto;margin:16px auto}a{color:#2458a6}.note{background:#eef2f7;padding:12px}.meta{color:#667085}details{margin:16px 0}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #ccd2da;border-radius:8px}li{margin:8px 0}"
def page(p,title,body):
 write(p/"읽기.html",'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+STYLE+'</style><main><h1>'+html.escape(title)+'</h1>'+body+'</main></html>')
def rawtxt(file):
 t=pathlib.Path(file).read_text(encoding="utf-8-sig")
 return json.loads(t.rsplit("\n프로그램용 데이터들\n",1)[1])
def site(url,platform=""):
 host=(urllib.parse.urlsplit(url).hostname or "").lower()
 for needle,label in [("teamblind.com","블라인드"),("dcinside.com","디시인사이드"),("inven.co.kr","인벤"),("theqoo.net","더쿠"),("pann.nate.com","네이트판"),("ppomppu.co.kr","뽐뿌"),("ruliweb.com","루리웹"),("reddit.com","레딧"),("nate.com","네이트"),("instagram.com","인스타그램")]:
  if needle in host:return label
 return safe(host or platform or "출처 미확인")
def status_text(k):
 return {"verbatim":"전문 보관 · 별도 검증 기록 확인","summary":"요약 메모 · 원문 전문 아님","preserved":"보존 기록 · 원문 전문 검증 미확인","unavailable":"본문 미확보 · 확인 필요"}.get(k,"확인 필요")
def prog(z):
 (AUDIT/"export-progress.json").write_text(json.dumps(z,ensure_ascii=False,indent=2),encoding="utf-8")
 print(json.dumps(z,ensure_ascii=True),flush=True)
posts=json.loads((AUDIT/"posts.json").read_text(encoding="utf-8"))
decisions={"unreviewed":"01_미검토","passed":"02_사용자통과","discard":"03_폐기","revise":"04_수정필요","hold":"05_보류","reviewing":"06_검토중"}
postbase=STAGE/"02_자료/01_현재제작본"
eval_lines=["현재 제작본의 사용자 평가 기록","이 기록은 출력 시점의 사본이며 프로그램의 실제 점수·메모를 변경하지 않습니다.",""]
for n,p in enumerate(sorted(posts["rows"],key=lambda p:(p["decision"],p["publicationTitle"] or p["title"])),1):
 title=p["publicationTitle"] or p["title"];state=decisions.get(p["decision"],"01_미검토")
 dest=folder(postbase/state,title)
 meta="제목: "+title+"\n원제: "+p["title"]+"\n출처: "+p["sourceUrl"]+"\n제작 버전: "+p["version"]+"\n분류: "+state.split("_",1)[1]+"\n"
 write(dest/"게시글정보.txt",meta)
 captions=[]
 for platform,label in [("instagram","인스타그램"),("threads","스레드")]:
  text=p["captions"].get(platform,"")
  write(dest/(label+"_문안.txt"),text or "저장된 문안 없음")
  captions.append("<details><summary>"+label+" 문안</summary><pre>"+html.escape(text)+"</pre></details>")
 note=p.get("note") or "";quality=p.get("quality")
 ev="제목: "+title+"\n판정: "+state.split("_",1)[1]+"\n메모: "+(str(note) if note else "작성된 메모 없음")+"\n"
 if quality:ev+="저장된 품질 평가:\n"+json.dumps(quality,ensure_ascii=False,indent=2)+"\n"
 write(dest/"내평가.txt",ev);eval_lines.extend([ev,""])
 ims=[]
 for im in sorted(p["images"],key=lambda x:x["order"]):
  ext={"image/png":".png","image/jpeg":".jpg","image/webp":".webp"}[im["mime"]]
  name=f'{im["order"]:03d}_'+("표지" if im["order"]==1 else "본문")+ext
  copy(RUNTIME/"local-private/operating-studio/assets"/im["asset_id"],dest/name,im["asset_id"])
  ims.append('<img loading="lazy" src="'+urllib.parse.quote(name)+'" alt="'+str(im["order"])+'번째 장">')
 page(dest,title,'<p class="note">'+html.escape(state.split("_",1)[1])+' · '+str(len(p["images"]))+'장</p><pre>'+html.escape(ev)+'</pre>'+"".join(captions)+"".join(ims))
 record("현재 제작본",title,dest,status=state.split("_",1)[1],images=len(ims),id=p["id"],version=p["version"])
 provenance.append({"kind":"post","id":p["id"],"version":p["version"],"folder":dest.relative_to(STAGE).as_posix()})
 if n%40==0:prog({"phase":"current_posts","done":n,"total":len(posts["rows"])})
write(STAGE/"02_자료/04_내평가기록/평가_전체.txt","\n".join(eval_lines))
rows=[json.loads(t) for t in (AUDIT/"materials.jsonl").read_text(encoding="utf-8").splitlines()]
groups=collections.OrderedDict()
for row in sorted(rows,key=lambda x:(x["type"],x["url"],x["id"],"production-inputs" not in x["file"])):
 category="program" if row["type"]=="program-txt" else "candidate" if row["type"]=="candidate-md" else "manual"
 key=(category,row["id"] if category=="program" else row["url"] or row["id"])
 groups.setdefault(key,[]).append(row)
duplicate_records=0;raw_count=0;candidate_count=0;manual_count=0;html_count=0
for n,(key,entries) in enumerate(groups.items(),1):
 loaded=[(e,rawtxt(e["file"])) for e in entries]
 category=key[0];primary=max(loaded,key=lambda pair:(bool(pair[1]["records"].get("sourceDocument")),pair[1]["human"]["bodyKind"]!="unavailable",len(pair[1]["human"]["body"])))
 row,data=primary;h=data["human"];title=h["title"];doc=data["records"].get("sourceDocument")
 if category=="program":
  st="01_HTML원본보관" if doc else "02_참고기록_전문미확보"
  dest=folder(STAGE/"02_자료/02_원문보관"/st/site(h["sourceUrl"],row.get("platform")),title);raw_count+=1
 elif category=="candidate":
  st="01_요약메모" if any(d["human"]["bodyKind"]!="unavailable" for _,d in loaded) else "02_본문확인필요"
  dest=folder(STAGE/"02_자료/03_소재후보"/st/site(h["sourceUrl"],row.get("platform")),title);candidate_count+=1
 else:
  dest=folder(STAGE/"02_자료/05_수동문안",title);manual_count+=1
 variants={};parts=[]
 for ent,d in loaded:
  x=d["human"];sdoc=d["records"].get("sourceDocument")
  fingerprint=sha(json.dumps([x,sdoc.get("sha256") if sdoc else None],ensure_ascii=False,sort_keys=True).encode())
  if fingerprint in variants:
   duplicate_records+=1
   provenance.append({"kind":"duplicate_input","source":ent["file"],"sameAs":variants[fingerprint],"folder":dest.relative_to(STAGE).as_posix()})
   continue
  variants[fingerprint]=ent["file"]
  count=len(variants)
  text="제목: "+x["title"]+"\n출처: "+x["sourceUrl"]+"\n자료 상태: "+status_text(x["bodyKind"])+"\n\n"+(x["body"] or "확보된 본문 없음")
  write(dest/("읽을내용.txt" if count==1 else "추가보관내용_"+str(count)+".txt"),text)
  parts.append('<section><p class="note">'+html.escape(status_text(x["bodyKind"]))+'</p><pre>'+html.escape(x["body"] or "확보된 본문 없음")+'</pre></section>')
  provenance.append({"kind":"material","source":ent["file"],"id":ent["id"],"folder":dest.relative_to(STAGE).as_posix(),"bodyKind":x["bodyKind"]})
  if sdoc:
   b=base64.b64decode(sdoc["data"],validate=True)
   assert len(b)==sdoc["bytes"] and sha(b)==sdoc["sha256"]
   original=dest/"원본파일"/("source.html" if count==1 else "source_"+str(count)+".html")
   original.parent.mkdir(parents=True,exist_ok=True);original.write_bytes(b)
   copied.append({"source":ent["file"]+"#sourceDocument","relative":original.relative_to(STAGE).as_posix(),"bytes":len(b),"sha256":sha(b)})
   html_count+=1
   media=pathlib.Path(ent["file"]).parent/"source"
   if media.is_dir():
    for f in media.rglob("*"):
     if f.is_file() and not f.is_symlink() and f.suffix.lower() in image_ext and f.stat().st_size<=50*1024*1024:
      copy(f,dest/"원본파일"/f.relative_to(media))
  for platform,caption in x.get("platformCaptions",{}).items():
   if caption:write(dest/(("수동문안_" if category=="manual" else "보관문안_")+safe(platform)+f"_{count}.txt"),caption)
 write(dest/"출처와보관상태.txt","제목: "+title+"\n출처: "+h["sourceUrl"]+"\n원래 입력 기록: "+str(len(entries))+"개\n표시한 서로 다른 내용: "+str(len(variants))+"개\n상태: "+status_text(h["bodyKind"])+"\n")
 page(dest,title,'<p>'+html.escape(h["sourceUrl"])+'</p>'+"".join(parts))
 record({"program":"원문 보관","candidate":"소재 후보","manual":"수동 문안"}[category],title,dest,status=status_text(h["bodyKind"]),site=site(h["sourceUrl"],row.get("platform")),records=len(entries),versions=len(variants))
 if n%350==0:prog({"phase":"source_materials","done":n,"total":len(groups)})
# Reference images: retain verified original slide numbers, including gaps.
ref=RUNTIME/"local-private/project/자료/02_레퍼런스/게시물 보기/인스타_레퍼런스_2026-10-04"
reference=json.loads((ref/"archive-index.json").read_text(encoding="utf-8-sig"))
reference_count=0;reference_images=0
for row in reference["posts"]:
 title=row.get("title") or row.get("caption","").split("\n")[0] or "제목 미확인"
 completeness="전체보관" if row.get("carouselComplete") else "일부보관"
 dest=folder(STAGE/"03_참고자료/01_디자인레퍼런스/인스타그램"/safe(row["account"])/(completeness),title)
 notes=row.get("notes") or []
 text="계정: "+row["account"]+"\n제목: "+title+"\n출처: "+row.get("postUrl","")+"\n보관 상태: "+completeness+"\n\n"+row.get("caption","")
 if notes:text+="\n\n보관 메모:\n"+"\n".join(str(x) for x in notes)
 write(dest/"게시글내용.txt",text)
 imgs=[]
 for im in sorted(row.get("images",[]),key=lambda x:x["order"]):
  file=ref/im["localPath"];ext=file.suffix.lower()
  if ext not in image_ext or not file.is_file():warnings.append({"kind":"reference_image_missing","file":str(file)});continue
  name=f'{im["order"]:02d}_참고이미지'+ext
  copy(file,dest/name,im.get("sha256") or im.get("expectedSha256"))
  imgs.append('<img loading="lazy" src="'+urllib.parse.quote(name)+'" alt="'+str(im["order"])+'번째 원본 장">');reference_images+=1
 page(dest,title,'<p class="note">'+html.escape(completeness)+'</p><pre>'+html.escape(text)+'</pre>'+"".join(imgs))
 record("디자인 레퍼런스",title,dest,status=completeness,site=row["account"],images=len(imgs));reference_count+=1
# Copy the five editor-collected image sets without inventing missing titles.
ed=RUNTIME/"local-private/editor-references"
for i,d in enumerate(sorted(x for x in ed.iterdir() if x.is_dir()),1):
 dest=folder(STAGE/"03_참고자료/01_디자인레퍼런스/직접수집",f"편집기에서 모은 이미지 {i:02d}")
 imgs=[]
 for j,f in enumerate(sorted(x for x in d.iterdir() if x.is_file() and x.suffix.lower() in image_ext),1):
  name=f"{j:02d}_참고이미지"+f.suffix.lower();copy(f,dest/name);imgs.append('<img loading="lazy" src="'+urllib.parse.quote(name)+'">')
 write(dest/"보관정보.txt","기존 편집기에 보관된 이미지 모음입니다. 원래 제목·장 순서를 확인하지 못한 경우 임의로 내용을 붙이지 않았습니다.")
 page(dest,dest.name,"".join(imgs));record("직접 수집 이미지",dest.name,dest,status="기존 이미지 보관",images=len(imgs))
# Research and design documents are actual readable files, outside code.
code=ROOT/"99_작업영역/소스"
reference_docs={
"docs/03_참고조사/콘텐츠제작_도구조사.md":"03_참고자료/02_도구조사/콘텐츠제작_도구조사.txt",
"docs/03_참고조사/딸깍_v1.11.7_분석.md":"03_참고자료/02_도구조사/딸깍_프로그램_분석.txt",
"docs/02_제작기준/사용자_표지_선호기준.md":"03_참고자료/03_제작기준/사용자_표지_선호기준.txt",
"docs/02_제작기준/범용표지와_사용자평가.md":"03_참고자료/03_제작기준/범용표지와_평가기준.txt",
"docs/02_제작기준/인스타그램_레퍼런스_기준.md":"03_참고자료/03_제작기준/인스타그램_분석과_제작기준.txt"}
for src,dest in reference_docs.items():write(STAGE/dest,(code/src).read_text(encoding="utf-8-sig"))
# Searchable file catalog, using local files and no server.
sections=collections.OrderedDict()
for item in catalog:sections.setdefault(item["kind"],[]).append(item)
main='<p>제목 검색으로 글을 찾고, 제목을 누르면 실제 저장된 본문·이미지가 열립니다.</p><input id="q" placeholder="제목·사이트·상태 검색" aria-label="검색">'
for k,items in sections.items():
 main+='<details open><summary>'+html.escape(k)+' · '+str(len(items))+'건</summary><ul>'
 for item in items:
  dest=STAGE/item["file"]
  # The index is in 02_자료 and reference pages may be in 03_참고자료.
  url=href(dest,STAGE/"02_자료")
  desc=" · ".join(str(item.get(x,"")) for x in ["site","status"] if item.get(x))
  main+='<li data-search="'+html.escape((item["title"]+" "+desc).casefold(),quote=True)+'"><a href="'+url+'">'+html.escape(item["title"])+'</a> <span class="meta">'+html.escape(desc)+'</span></li>'
 main+='</ul></details>'
main+='<script>document.getElementById("q").addEventListener("input",e=>{let q=e.target.value.toLowerCase();for(let x of document.querySelectorAll("[data-search]"))x.hidden=!x.dataset.search.includes(q)})</script>'
write(STAGE/"02_자료/00_자료찾기.html",'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>수익화 자료 찾기</title><style>'+STYLE+'</style><main><h1>수익화 자료 찾기</h1>'+main+'</main></html>')
summary={"currentPosts":len(posts["rows"]),"currentImages":sum(len(p["images"]) for p in posts["rows"]),"decisions":dict(collections.Counter(p["decision"] for p in posts["rows"])),"originalInputRecords":len(rows),"sourceArticleFolders":raw_count,"candidateArticleFolders":candidate_count,"manualFolders":manual_count,"identicalInputCopiesGrouped":duplicate_records,"originalHtmlFiles":html_count,"referencePosts":reference_count,"referenceImages":reference_images,"copiedBytes":sum(x["bytes"] for x in copied),"copiedFiles":len(copied),"catalogEntries":len(catalog),"warnings":warnings,"stateRevision":posts["revision"],"createdAt":datetime.datetime.now(datetime.timezone.utc).isoformat()}
assert all(hashlib.sha256((RUNTIME/p).read_bytes()).hexdigest()==h for p,h in guard.items()),"runtime changed during export; do not overwrite it"
(AUDIT/"copy-verification.json").write_text(json.dumps(copied,ensure_ascii=False,indent=2),encoding="utf-8")
(AUDIT/"organization-provenance.json").write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding="utf-8")
(AUDIT/"catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding="utf-8")
(AUDIT/"content-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
prog({"phase":"staging_complete",**summary})
