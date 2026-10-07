'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const round = process.argv[2];
assert(/^review-20261008-[a-zA-Z0-9_-]+$/.test(round), 'Unique review round required');
const root = 'D:/A_KJ/AI/Workspace/Threads/' + round;
const repo = 'D:/A_KJ/AI/Workspace/Threads/continuation-20261007-Sol/current-review-source';
const materials = 'D:/A_KJ/AI/Projects/Threads/자료';
const inputs = 'C:/Users/user/.codex/.chatgpt-projects/g-p-6aa6c7d10bbc81918d0ad763cb190ac2/Threads-feedback-20261006/data/runtime/feedback-rework/inputs';
const electron = 'C:/KJ/Github/Threads/desktop/node_modules/electron/dist/electron.exe';
const install = 'D:/A_KJ/AI/Applications/ThreadsReview/0.3.15';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
assert(!fs.existsSync(root), 'Do not repeat an existing round');
fs.mkdirSync(root, {recursive:true});
function record(step, extra={}) {
  const report = {reviewRound:round, step, updatedAt:new Date().toISOString(), ...extra};
  fs.writeFileSync(path.join(root, 'progress.json'), JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
function exec(file,args,options={}) {
  return cp.execFileSync(file,args,{cwd:root,windowsHide:true,encoding:'utf8',timeout:600000,maxBuffer:20000000,...options});
}
async function main() {
  record('checking_source');
  const commit = exec('git',['rev-parse','HEAD'],{cwd:repo}).trim();
  assert.equal(commit,'f2025c12727a1ff3e5cf87b3dbb58abe39c1dbe4');
  assert.equal(exec('git',['status','--porcelain'],{cwd:repo}).trim(),'');
  for(const name of ['source-cut-post-review.js','source-cut-post-review.html','source-cut-post-review.css','source-page-plan.js']) {
    assert.equal(hash(fs.readFileSync(path.join(repo,'app',name))),hash(fs.readFileSync(path.join(install,'resources/editor',name))), 'Installed/source mismatch '+name);
  }
  const active = json(path.join(materials,'review-current.json'));
  const ratingsPath = path.join(materials,'07_사용자 평가/평가 기록.json');
  const initialRatings = fs.readFileSync(ratingsPath);
  const historical = path.join(materials,'05_이전 작업/리뷰 과거/before-review-20261008-012244/07_사용자 평가/평가 기록.json');
  assert.equal(json(historical).evaluations.length,67);
  const historicalHash = hash(fs.readFileSync(historical));
  fs.writeFileSync(path.join(root,'before.json'),JSON.stringify({at:new Date().toISOString(),activeRound:active.reviewRound,currentEvaluations:JSON.parse(initialRatings).evaluations.length,historicalEvaluations:67,historicalHash,commit},null,2));
  const snapshot = path.join(root,'inputs');
  record('snapshot_inputs');
  let files=0;
  function copyTree(from,to) {
    assert(!fs.lstatSync(from).isSymbolicLink());
    fs.mkdirSync(to,{recursive:true});
    for(const entry of fs.readdirSync(from,{withFileTypes:true})) {
      assert(!entry.isSymbolicLink());
      const a=path.join(from,entry.name), b=path.join(to,entry.name);
      if(entry.isDirectory())copyTree(a,b);
      else {const bytes=fs.readFileSync(a);fs.writeFileSync(b,bytes,{flag:'wx'});assert.equal(hash(bytes),hash(fs.readFileSync(b)));files++;}
    }
  }
  copyTree(inputs,snapshot);
  const fresh=path.join(root,'fresh'),stage=path.join(root,'stage'),fixture=path.join(root,'ui-check');
  record('regenerating',{inputFiles:files,expectedPosts:399,output:fresh});
  const fd=fs.openSync(path.join(root,'production.log'),'w');
  const child=cp.spawn(electron,[path.join(repo,'desktop/feedback-rework-run.cjs'),fresh,snapshot],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});
  const timer=setInterval(()=>{
    try {const s=json(path.join(fresh,'06_자동 제작 결과/status.json'));record('regenerating',{inputFiles:files,processed:s.processed||0,total:s.total||s.entries.length,generated:s.entries.filter(e=>e.status==='generated').length,expectedPosts:399,output:fresh});}catch{}
  },15000);
  let exit;
  try {exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}finally{clearInterval(timer);fs.closeSync(fd);}
  assert.equal(exit,0,'Fresh production failed; old review retained');
  const report=json(path.join(fresh,'06_자동 제작 결과/status.json'));
  const rows=report.entries.filter(e=>e.outputFolder&&e.images?.length);
  assert.equal(rows.length,399);
  assert.equal(report.processed,report.entries.length);
  assert(!report.entries.some(e=>e.status==='failed'));
  assert(rows.every(e=>e.status==='generated'&&e.ruleVersion==='2026-10-07.5'));
  record('verifying_all_images',{posts:399,pages:rows.reduce((n,e)=>n+e.images.length,0)});
  const {prepareReviewRelease,activateReviewRelease}=require(path.join(repo,'desktop/review-release.cjs'));
  const prepared=await prepareReviewRelease(fresh,stage,{reviewRound:round,expectedPosts:399});
  record('checking_review_controls',{posts:prepared.posts,pages:prepared.pages});
  exec(electron,[path.join(repo,'desktop/current-review-round-smoke.cjs'),stage,fixture,'--background-worker']);
  const ui=json(path.join(fixture,'current-round-ui.json'));
  assert.equal(ui.initialCurrentScores,0);assert.equal(ui.initialCurrentMemos,0);assert.equal(ui.previousDisplayed,0);
  assert(ui.scoreMemoSave&&ui.reloadRestore&&ui.closeReopenRestore&&ui.pageNext&&ui.allWindowsHidden);
  const oldStatus=fs.readFileSync(path.join(materials,'06_자동 제작 결과/status.json'));
  const oldRatings=fs.readFileSync(ratingsPath);
  // Stop before any data migration if the user rated during rendering.
  assert.equal(hash(oldRatings),hash(initialRatings),'User added ratings; reread before migration');
  record('activating_new_review',{posts:prepared.posts,pages:prepared.pages});
  const activated=await activateReviewRelease(materials,stage,{expectedStatusSha256:hash(oldStatus),expectedFeedbackSha256:hash(oldRatings)});
  assert.equal(hash(fs.readFileSync(path.join(activated.archive,'07_사용자 평가/평가 기록.json'))),hash(oldRatings));
  assert.equal(hash(fs.readFileSync(historical)),historicalHash);
  const {createPostReviewStore}=require(path.join(repo,'desktop/post-review-store.cjs'));
  const store=createPostReviewStore(materials),list=await store.list();
  assert.equal(list.entries.length,399);assert.equal(list.reviewRound,round);
  assert(list.entries.every(e=>!e.current&&!e.previous));
  assert.equal(json(ratingsPath).evaluations.length,0);
  const guidance='이번 전체 수정본 '+prepared.posts+'개 · '+prepared.pages+'장\r\n새 회차: '+round+'\r\n이전 점수와 메모는 과거 보관함으로 옮겼습니다. 지금 리뷰는 빈 평가로 시작합니다.\r\n프로그램 실행.lnk를 열어 넘기면서 점수와 메모를 남겨 주세요.\r\n';
  const guidePath=path.join(materials,'게시글 평가 사용안내.txt');
  if(fs.existsSync(guidePath))fs.copyFileSync(guidePath,path.join(activated.archive,'게시글 평가 사용안내.txt.before'));
  fs.writeFileSync(guidePath,guidance);
  const result={completedAt:new Date().toISOString(),reviewRound:round,posts:prepared.posts,pages:prepared.pages,wholeFreshProduction:true,activeScores:0,activeMemos:0,previousDisplayed:0,historicalRatingsPreserved:67,historicalHash,archive:activated.archive,sourceCommit:commit,version:'0.3.15',exe:path.join(install,'Threads Cut Editor.exe'),launcher:'D:/A_KJ/AI/Launchers/Threads 게시글 평가.lnk',ui,desktopModified:false,externalPublication:false,wholeContentQualityApproved:false};
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));
  record('completed',result);
}
main().catch(error=>{record('failed',{error:error.stack,completed:false});process.exitCode=1;});
