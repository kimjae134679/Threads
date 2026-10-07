'use strict';
// Package from the already installed official Electron distribution; no downloads.
const fs=require('node:fs'),path=require('node:path');
const asar=require('@electron/asar');
(async()=>{
 const home=path.resolve(__dirname),metadata=JSON.parse(fs.readFileSync(path.join(home,'package.json')));
 const dest=path.join(home,'dist','Threads-Cut-Editor-'+metadata.version+'-preview'),stage=path.resolve(home,'../data/runtime/feedback-rework/package-stage');
 const electronDist=process.argv[2];if(!electronDist)throw Error('Specify installed Electron distribution.');
 fs.mkdirSync(stage,{recursive:true});for(const name of metadata.build.files)fs.copyFileSync(path.join(home,name),path.join(stage,name));
 fs.cpSync(electronDist,dest,{recursive:true});fs.renameSync(path.join(dest,'electron.exe'),path.join(dest,'Threads Cut Editor.exe'));
 await asar.createPackage(stage,path.join(dest,'resources/app.asar'));fs.cpSync(path.resolve(home,'../app'),path.join(dest,'resources/editor'),{recursive:true});
 fs.writeFileSync(path.join(dest,'검토 버전 안내.txt'),metadata.version+' 검토 패키지. 설치 교체는 완료하지 않았습니다. 실제 PNG 제작 검증 결과는 프로젝트 인수인계에 기록합니다. 사용자 기록은 보존하며 이전 버전 평가를 새 버전 점수로 옮기지 않습니다.\n');
 const archive=path.join(dest,'resources/app.asar'),files=asar.listPackage(archive);for(const name of metadata.build.files)if(!asar.extractFile(archive,name).equals(fs.readFileSync(path.join(home,name))))throw Error('Packaged file mismatch: '+name);
 console.log(JSON.stringify({directory:dest,version:metadata.version,sourceOnlyVerification:true,installed:false,uiSmokePassed:false,files:files.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
