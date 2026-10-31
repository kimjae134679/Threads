import pathlib,json,os,re,html,urllib.parse,collections,hashlib
ROOT=pathlib.Path(r"C:\KJ\Github\Threads");A=pathlib.Path(r"D:\A_KJ\AI\Workspace\organization-20261031\content-organization")
rows=[json.loads(x) for x in (A/"materials.jsonl").read_text(encoding="utf-8").splitlines()]
byfile={r["file"]:r for r in rows}
prov=json.loads((A/"organization-provenance.json").read_text(encoding="utf-8"))
catalog=json.loads((A/"catalog.json").read_text(encoding="utf-8"))
folderrows=collections.defaultdict(list)
for p in prov:
 if p.get("source") in byfile:folderrows[p["folder"]].append(byfile[p["source"]])
groups=collections.OrderedDict()
for f,items in folderrows.items():
 first=items[0];key=first["url"] or ("id:"+first["id"])
 groups.setdefault(key,[]).append((f,items))
base=ROOT/"02_자료/02_수집자료";assert not base.exists();base.mkdir(parents=True)
def safe(x):
 x=re.sub(r'[<>:"/\\|?*\x00-\x1f]',' ',x);x=re.sub(r"\s+"," ",x).strip(" .");return x[:78].rstrip(" .") or "제목 미확인"
def link(p,where):return urllib.parse.quote(os.path.relpath(p,where).replace("\\","/"),safe="/._-()")
def data(file):
 t=pathlib.Path(file).read_text(encoding="utf-8-sig");return json.loads(t.rsplit("\n프로그램용 데이터들\n",1)[1])
mapping={};merged=[];names=collections.Counter();publiccount=0
oldcat={str(pathlib.PurePosixPath(x["file"]).parent):x for x in catalog if x["kind"] in ["원문 보관","소재 후보","수동 문안"]}
for url,parts in groups.items():
 ranked=sorted(parts,key=lambda z:(not (ROOT/z[0]/"원본파일/source.html").exists(),z[1][0]["type"]!="program-txt",-max(r["bodyCharacters"] for r in z[1])))
 primary,firstrows=ranked[0];c=oldcat[primary]
 hashtml=any((ROOT/f/"원본파일/source.html").is_file() for f,_ in parts)
 hasbody=any(r["bodyKind"]!="unavailable" for _,rs in parts for r in rs)
 status="01_HTML원본보관" if hashtml else "02_요약과참고내용" if hasbody else "03_본문확인필요"
 parent=base/status/safe(c.get("site") or "출처 미확인");parent.mkdir(parents=True,exist_ok=True)
 title=c["title"];key=(str(parent),safe(title).casefold());names[key]+=1
 dest=parent/(safe(title)+(f" ({names[key]})" if names[key]>1 else ""))
 src=ROOT/primary
 assert src.is_dir() and not dest.exists() and ROOT/"02_자료" in src.parents and base in dest.parents
 os.rename(src,dest);mapping[primary]=dest.relative_to(ROOT).as_posix()
 additional=[];publicVariants=set();recordCount=sum(len(rs) for _,rs in parts);rolecount=collections.Counter()
 for n,(old,rs) in enumerate(ranked):
  role="원문보관" if any(r["type"]=="program-txt" for r in rs) else "소재후보" if any(r["type"]=="candidate-md" for r in rs) else "수동문안"
  rolecount[role]+=1
  if n:
   target=dest/"추가보관자료"/(role+(f"_{n}" if n>1 else ""))
   assert not target.exists();target.parent.mkdir(parents=True,exist_ok=True)
   os.rename(ROOT/old,target);mapping[old]=target.relative_to(ROOT).as_posix()
   additional.append('<li><a href="'+link(target/"읽기.html",dest)+'">'+html.escape(role)+'</a></li>')
  for row in rs:
   if row["type"]!="candidate-md":continue
   d=data(row["file"]);assert d["visibility"]=="public"
   h=d["human"];signature=hashlib.sha256(json.dumps(h,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
   if signature in publicVariants:continue
   publicVariants.add(signature);publiccount+=1
   label="공개_소재메모"+(f"_{len(publicVariants):02d}" if len(publicVariants)>1 else "")
   body="제목: "+h["title"]+"\n출처: "+h["sourceUrl"]+"\n상태: "+("요약 메모 · 원문 전문 아님" if h["bodyKind"]=="summary" else "본문 미확보 · 확인 필요")+"\n\n"+(h["body"] or "확보된 본문 없음")
   (dest/(label+".txt")).write_text(body.rstrip()+"\n",encoding="utf-8-sig")
 if additional:
  p=dest/"읽기.html";t=p.read_text(encoding="utf-8");t=t.replace("</main>","<h2>같은 출처의 추가 보관 기록</h2><ul>"+"".join(additional)+"</ul></main>");p.write_text(t,encoding="utf-8")
 (dest/"수집내역.txt").write_text("제목: "+title+"\n출처: "+url+"\n보존된 입력기록: "+str(recordCount)+"개\n구분: "+", ".join(f"{k} {v}묶음" for k,v in rolecount.items())+"\n같은 주소의 원문·요약·후보를 한곳에 모았으며 서로 다른 내용은 추가보관자료에 남겼습니다.\n",encoding="utf-8-sig")
 merged.append({"kind":"수집자료","title":title,"file":(dest/"읽기.html").relative_to(ROOT).as_posix(),"status":status.split("_",1)[1],"site":c.get("site",""),"url":url,"records":recordCount,"parts":len(parts)})
# Update every verified copy mapping and provenance after physical moves.
sortedmap=sorted(mapping.items(),key=lambda x:len(x[0]),reverse=True)
def remap(p):
 for a,b in sortedmap:
  if p==a or p.startswith(a+"/"):return b+p[len(a):]
 return p
copies=json.loads((A/"copy-verification.json").read_text(encoding="utf-8"))
for x in copies:x["relative"]=remap(x["relative"])
for x in prov:
 if "folder" in x:x["folder"]=remap(x["folder"])
(A/"copy-verification.json").write_text(json.dumps(copies,ensure_ascii=False,indent=2),encoding="utf-8")
(A/"organization-provenance.json").write_text(json.dumps(prov,ensure_ascii=False,indent=2),encoding="utf-8")
newcat=[x for x in catalog if x["kind"] not in ["원문 보관","소재 후보","수동 문안"]]+merged
(A/"catalog.json").write_text(json.dumps(newcat,ensure_ascii=False,indent=2),encoding="utf-8")
(A/"source-folder-remapping.json").write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding="utf-8")
# Remove only empty directory containers left by this operation.
for name in ["02_원문보관","03_소재후보","05_수동문안"]:
 old=ROOT/"02_자료"/name
 if old.is_dir():
  for d in sorted([x for x in old.rglob("*") if x.is_dir()],key=lambda x:len(x.parts),reverse=True):
   if not any(d.iterdir()):d.rmdir()
  if not any(old.iterdir()):old.rmdir()
summary=json.loads((A/"content-summary.json").read_text(encoding="utf-8"))
summary["sourceFoldersBeforeConsolidation"]=len(folderrows);summary["sourceFoldersAfterConsolidation"]=len(merged)
summary["sourceFoldersConsolidated"]=len(folderrows)-len(merged);summary["publicMemoFiles"]=publiccount
(A/"content-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"before":len(folderrows),"after":len(merged),"sameSourceFoldersConsolidated":len(folderrows)-len(merged),"publicMemoFiles":publiccount},ensure_ascii=True))
