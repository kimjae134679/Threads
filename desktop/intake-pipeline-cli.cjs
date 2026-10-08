'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
function parse(args){const result={};for(let i=0;i<args.length;i++){const a=args[i];if(['--activate','--test-fixtures','--retry-held'].includes(a))result[a.slice(2)]=true;else if(['--input','--work','--material','--electron','--stop-after'].includes(a)){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('값이 없는 인수: '+a);result[a.slice(2)]=args[++i];}else throw Error('알 수 없는 인수: '+a);}return result;}
if(process.argv.includes('--help')){console.log('Offline Threads intake: --input ABS_INBOX --work ABS_WORK --material ABS_REVIEW_ROOT --electron ABS_ELECTRON_EXE [--activate] [--stop-after N] [--test-fixtures]\nsource.json verbatim + intake provenance/bodyStatus/commentsStatus/media/rights/safety required. Offline only; no publication. Same command resumes checkpoints.');process.exit(0);}
try{
 const flags=parse(process.argv.slice(2));if(!['input','work','material','electron'].every(k=>flags[k]&&path.isAbsolute(flags[k])))throw Error('입력·작업·리뷰·Electron의 절대 경로를 지정하세요.');if(!fs.existsSync(flags.electron))throw Error('Electron 실행파일 없음');
 const stopAfter=Number(flags['stop-after']||0);if(!Number.isInteger(stopAfter)||stopAfter<0)throw Error('stop-after는 0 이상의 정수입니다.');
 fs.mkdirSync(flags.work,{recursive:true});const config=path.join(flags.work,'cli-request-'+crypto.randomUUID()+'.json');fs.writeFileSync(config,JSON.stringify({input:flags.input,work:flags.work,materialRoot:flags.material,activate:!!flags.activate,allowTestFixtures:!!flags['test-fixtures'],retryHeld:!!flags['retry-held'],stopAfter}));
 const log=fs.createWriteStream(path.join(flags.work,'cli-last-run.log'));const child=cp.spawn(flags.electron,[path.join(__dirname,'intake-pipeline-run.cjs'),config],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log.write(data);process.stdout.write(data);});
 child.on('error',e=>{console.error(e.message);process.exitCode=1;log.end();});child.on('close',code=>{log.end();process.exitCode=code??1;});
}catch(e){console.error(e.message);process.exitCode=1;}
