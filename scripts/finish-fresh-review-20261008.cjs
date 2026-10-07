'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const round='review-20261008-0311-photo',work='D:/A_KJ/AI/Workspace/Threads/'+round;
const material='D:/A_KJ/AI/Projects/Threads/자료';
const code='D:/A_KJ/AI/Workspace/Threads/continuation-20261007-Sol/current-review-source';
const repo='C:/Users/user/.codex/.chatgpt-projects/g-p-6aa6c7d10bbc81918d0ad763cb190ac2/Threads-feedback-20261006';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const result=read(path.join(work,'result.json'));
assert.equal(result.posts,399);assert.equal(result.activeScores,0);assert(result.wholeFreshProduction);
assert.equal(read(path.join(material,'review-current.json')).reviewRound,round);
const report=read(path.join(material,'06_자동 제작 결과/status.json')),rows=report.entries.filter(e=>e.outputFolder&&e.images?.length);
assert.equal(rows.length,399);assert(rows.every(r=>r.reviewRound===round));
let checked=0;
for(const row of rows)for(const image of row.images){const bytes=fs.readFileSync(path.join(material,'06_자동 제작 결과',row.outputFolder,image.name));assert.equal(hash(bytes),image.sha256);checked++;}
assert.equal(checked,result.pages);
const night=rows.find(r=>r.id==='source-b3c0ae54265490');
const plan=read(path.join(material,'06_자동 제작 결과',night.outputFolder,'production-plan.json'));
assert.equal(plan.templateId,'photo_cover');assert(plan.pages[0].operations.some(o=>o.kind==='image'&&o.sourceId==='s0'));
assert(plan.pages[0].operations.some(o=>o.kind==='text'&&o.highlights?.includes('담배')&&o.highlights?.includes('도둑맞은')));
const original='D:/A_KJ/AI/Projects/Threads/자료/05_이전 작업/리뷰 과거/before-review-20261008-012244/07_사용자 평가/평가 기록.json';
assert.equal(hash(fs.readFileSync(original)),result.historicalHash);
assert.equal(read(original).evaluations.length,67);
const guidance=`# Threads 프로젝트 사용안내\n\n2026-10-08: 전체 ${result.posts}글·${result.pages}장을 새로 생성해 현재 리뷰에 연결했습니다. 새 회차는 점수·메모가 없는 상태로 시작하며 과거 평가67건은 별도 보관합니다.\n\nD:\\A_KJ\\AI\\Launchers\\Threads 게시글 평가.lnk 또는 D:\\A_KJ\\AI\\Projects\\Threads\\자료\\프로그램 실행.lnk를 열어 주세요. 기존 방식으로 넘기기·세로 읽기·1~10점·메모 자동 저장을 사용합니다. 과거 점수는 새 글 화면에 표시하지 않습니다.\n\n| 용도 | 위치 |\n|---|---|\n| 실제 리뷰 앱 | D:\\A_KJ\\AI\\Applications\\ThreadsReview\\0.3.15 |\n| 최신 전체 제작물 | D:\\A_KJ\\AI\\Projects\\Threads\\자료\\06_자동 제작 결과 |\n| 현재 사용자 평가 | 자료\\07_사용자 평가\\평가 기록.json |\n| 이전 제작물·점수·메모 | 자료\\05_이전 작업\\리뷰 과거 |\n| 원본과 레퍼런스 | 자료\\01_후보 기록 및 02_레퍼런스 |\n| 이번 실행·검증 | D:\\A_KJ\\AI\\Workspace\\Threads\\${round} |\n| 소통 | C:\\KJ\\Github\\Threads\\_통합소통 |\n\n편의점 사진을 글 캡처로 오인하던 편집 계획을 고쳐 사용자가 고른 사진 표지를 복구했습니다. [이번 전달 기록](docs/REVIEW_REDELIVERY_2026-10-08.md)을 우선합니다. 바탕화면의 구형 프로그램·자료는 보존 대상으로 남았으므로 현재 리뷰는 위 D 실행기로 엽니다.\n\n검증: 전체 PNG 해시·장수·폭·계획 규칙·복사 바이트, 빈 리뷰·이전 점수 숨김·넘기기·세로 읽기·점수/메모 저장·새로 고침·닫고 재열기. 실제 사용자 평가에 시험 점수를 쓰지 않았습니다. 전체 내용 품질 승인·외부 게시와 구분합니다.\n`;
fs.writeFileSync(path.join(repo,'프로젝트_사용안내.md'),guidance);
const doc=path.join(repo,'docs/REVIEW_REDELIVERY_2026-10-08.md');
let text=fs.readFileSync(doc,'utf8');
text=text.replace(/2026-10-08 03:11 KST:.*?갱신한다\./s,`완료: ${result.completedAt} (UTC). 최종 회차 \`${round}\`의 ${result.posts}글·${result.pages}장을 전량 새로 생성해 실제 현재 리뷰에 적용했다. 첫 회차와 그 평가도 과거로 보관했다. 이전 평가67건의 원본 해시를 대조했고 새 회차의 점수·메모·이전 점수 표시가0인 상태, 넘기기·세로 읽기·저장·닫고 재열기를 검증했다. 최종 현재 폴더의 ${checked}PNG 해시를 다시 대조했다. 복구된 가게 사진 표지의 실제 PNG도 직접 확인했다.`);
fs.writeFileSync(doc,text);
const communication='C:/KJ/Github/Threads/_통합소통',input=path.join(work,'task_exchange-input.json');
if(fs.existsSync(input)){
 const task=read(input);
 const sent=path.join(communication,'보낼자료');
 const previous=fs.readdirSync(sent).filter(n=>/^task-.*-r\d+\.json$/.test(n)).map(n=>read(path.join(sent,n))).filter(t=>t.recordId===task.recordId&&t.actorId===task.actorId&&t.projectId===task.projectId&&t.sessionId===task.sessionId);
 task.revision=Math.max(0,...previous.map(t=>t.revision))+1;task.updatedAt=new Date().toISOString();task.status='completed';
 task.response={summary:'전체 생성·사진 복구·빈 리뷰 검증 완료, 최종 답변 대기',details:'실제로 전달한 진행 답변 요약. 사용자 리뷰와 전체 내용 승인은 이후 별도.',source:'current_assistant_commentary'};
 task.workDone=[...new Set([...task.workDone,`최종 새 회차 ${round}: ${result.posts}글 ${result.pages}PNG, 기존67평가 원본 보존, 현재 초기점수·메모0`])];
 task.verification[1]={name:'최종 전량 새 생성·사진 복구·현재 리뷰',result:'pass',evidence:[path.join(work,'result.json'),path.join(work,'delivery-audit.json')]};
 task.nextActions=[];task.blockers=[];
 fs.writeFileSync(input,JSON.stringify(task,null,2));
 const helper=cp.spawnSync('D:/AI/envs/cosyvoice/python.exe',[path.join(communication,'기록도우미.py'),'--root',communication,'record','--input',input],{windowsHide:true,encoding:'utf8'});
 assert.equal(helper.status,0,helper.stderr||helper.stdout);
}
// Remove only our isolated UI copies after preserving their verification receipt.
const cleaned=[];
for(const id of ['review-20261008-0304',round]){
 const own=path.resolve('D:/A_KJ/AI/Workspace/Threads',id),fixture=path.resolve(own,'ui-check');
 assert(path.relative(own,fixture)==='ui-check');assert(fs.existsSync(path.join(own,'result.json')));
 if(fs.existsSync(fixture)){
  assert(!fs.lstatSync(fixture).isSymbolicLink());
  fs.copyFileSync(path.join(fixture,'current-round-ui.json'),path.join(own,'current-round-ui.json'));
  fs.rmSync(fixture,{recursive:true});cleaned.push(fixture);
 }
}
const audit={checkedAt:new Date().toISOString(),reviewRound:round,posts:399,pages:checked,allCurrentPNGHashVerified:true,restoredPhotoCover:true,historicalEvaluations:67,historicalHashUnchanged:true,fixtureCopiesCleaned:cleaned,desktopModified:false};
fs.writeFileSync(path.join(work,'delivery-audit.json'),JSON.stringify(audit,null,2));
// Repository bookkeeping runs in the Codex checkout. Its .git is virtualized
// and is not available to the native PC bridge; production verification is.
console.log(JSON.stringify(audit));
