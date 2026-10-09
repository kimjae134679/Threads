import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url),{coverHtml}=require('../desktop/universal-cover.cjs');
const module={exports:{}};vm.runInNewContext(fs.readFileSync(new URL('../app/source-cover-typography.js',import.meta.url),'utf8'),{module});const typography=module.exports;
const pageModule={exports:{}};vm.runInNewContext(fs.readFileSync(new URL('../app/source-page-plan.js',import.meta.url),'utf8'),{module:pageModule});
test('both photo and text covers use white and bright yellow on a dark background',()=>{
 for(const photo of [true,false]){const s=typography.style('돈 안 내는 여친',{photo,emphasis:'돈 안 내는',sizeEmphasis:'안 내는',explicitEmphasis:true});assert.equal(s.palette.ink,'#ffffff');assert.equal(s.palette.accent,'#f2e34c');assert.equal(s.palette.background,'#101116');assert.equal(s.emphasisScale,1.03);}
});
test('shared program cover requires the selected SB font instead of a silent fallback',()=>{const html=coverHtml({id:'fixture',title:'돈 안 내는 여친',typography:true,aspectRatio:'square',fontUrl:'fonts/CutGothic-ExtraBold.woff'});assert.match(html,/font-family:SB_Aggro_B/);assert.match(html,/fonts\/SB_Aggro_B\.ttf/);assert.match(html,/필수 표지 글꼴/);});
test('input line breaks preserve the full phrase and cannot split Korean words',()=>{
 const title='돈 안 내는 여친',s=typography.style(title,{emphasis:'돈 안 내는',sizeEmphasis:'안 내는',sizeScale:1.2,explicitEmphasis:true,lineBreaks:['돈 안 내는','여친']});const fit=typography.fit(title,{width:900,height:440},(text,size)=>text.length*size*.65,pageModule.exports,s,140);assert.equal(fit.lines.join('|'),'돈 안 내는|여친');assert.throws(()=>typography.style(title,{lineBreaks:['돈 안 내','는 여친']}),/줄바꿈/);
});
test('strong nested size emphasis is independent from the whole yellow phrase',()=>{
 const s=typography.style('내 방 달라는 딸 대처법.jpg',{emphasis:'내 방 달라는 딸',sizeEmphasis:'달라는',sizeScale:1.2,explicitEmphasis:true});const r=typography.runs('내 방 달라는 딸',100,s,0,1);assert.equal(r.filter(x=>x.emphasized).map(x=>x.text).join(''),'내 방 달라는 딸');assert.equal(r.filter(x=>x.sizeEmphasized).map(x=>x.text).join(''),'달라는');assert(r.filter(x=>x.sizeEmphasized).every(x=>x.size===120));assert(r.filter(x=>!x.sizeEmphasized).every(x=>x.size===100));
});
