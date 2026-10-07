'use strict';
// Future updates always use a fresh empty batch folder before verified whole-release activation.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const {prepareReviewRelease,activateReviewRelease}=require('./review-release.cjs');
const [inputRoot,materialRoot,workRoot,electronBinary,reviewRound,count]=process.argv.slice(2),expectedPosts=Number(count);
if(![inputRoot,materialRoot,workRoot,electronBinary].every(p=>p&&path.isAbsolute(p))||!/^[a-zA-Z0-9_-]{1,80}$/.test(reviewRound||'')||!Number.isInteger(expectedPosts)||expectedPosts<1)throw Error('Arguments: absolute input/material/work/electron paths, round ID, expected whole-post count');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),roundWork=path.join(path.resolve(workRoot),reviewRound),fresh=path.join(roundWork,'fresh-batch'),stage=path.join(roundWork,'ready-release');
if(fs.existsSync(roundWork))throw Error('회차 작업 폴더가 이미 있습니다. 실행 기록을 확인하세요.');fs.mkdirSync(roundWork,{recursive:true});
const child=cp.spawn(electronBinary,[path.join(__dirname,'feedback-rework-run.cjs'),fresh,inputRoot],{cwd:roundWork,windowsHide:true,stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(roundWork,'full-production.log'));child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
child.on('error',e=>{console.error(e.stack);process.exitCode=1});
child.on('close',async code=>{try{log.end();if(code!==0)throw Error('전체 제작 실패: '+code);const ready=await prepareReviewRelease(fresh,stage,{reviewRound,expectedPosts});const status=fs.readFileSync(path.join(materialRoot,'06_자동 제작 결과/status.json')),ratings=fs.readFileSync(path.join(materialRoot,'07_사용자 평가/평가 기록.json'));const applied=await activateReviewRelease(materialRoot,stage,{expectedStatusSha256:hash(status),expectedFeedbackSha256:hash(ratings)});fs.writeFileSync(path.join(roundWork,'delivery-result.json'),JSON.stringify({ready,applied},null,2));console.log(JSON.stringify(applied));}catch(e){fs.writeFileSync(path.join(roundWork,'delivery-error.txt'),e.stack);console.error(e.stack);process.exitCode=1}});
