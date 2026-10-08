import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
const {finishQa,reportAndFinishQa}=createRequire(import.meta.url)('../desktop/qa-electron-lifecycle.cjs');
test('failed QA destroys its owned windows before exiting without requesting draft save',()=>{
 const events=[],window={isDestroyed:()=>false,destroy:()=>events.push('destroy'),close:()=>assert.fail('Closing would invoke draft-save UI')};
 finishQa({app:{exit:code=>events.push('exit:'+code)},BrowserWindow:{getAllWindows:()=>[window]},exitCode:1});
 assert.deepEqual(events,['destroy','exit:1']);
});
test('successful QA ignores already destroyed windows and keeps its success exit code',()=>{
 const events=[];finishQa({app:{exit:code=>events.push(code)},BrowserWindow:{getAllWindows:()=>[{isDestroyed:()=>true,destroy:()=>assert.fail('Already destroyed')}]},exitCode:0});assert.deepEqual(events,[0]);
});
test('diagnostic write failure still destroys the QA window and returns failure',async()=>{
 const events=[];const error=await reportAndFinishQa({report:async()=>{events.push('report');throw Error('Write failed');},onReportError:()=>events.push('report-error'),app:{exit:code=>events.push('exit:'+code)},BrowserWindow:{getAllWindows:()=>[{isDestroyed:()=>false,destroy:()=>events.push('destroy')}]},exitCode:1});assert.equal(error.message,'Write failed');assert.deepEqual(events,['report','report-error','destroy','exit:1']);
});
test('window cleanup failure cannot leave the QA process running',()=>{
 let exit;assert.throws(()=>finishQa({app:{exit:code=>{exit=code;}},BrowserWindow:{getAllWindows:()=>[{isDestroyed:()=>false,destroy:()=>{throw Error('Destroy failed');}}]},exitCode:1}),/Destroy failed/);assert.equal(exit,1);
});
