import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const java=name=>fs.readFileSync(path.join(root,'java/kr/threads/review',name),'utf8');
test('system bar, cutout, keyboard and redispatch geometry uses JVM literal fixtures',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'threads-native-insets-'));
 try {
  assert.ok(fs.existsSync(path.join(root,'java/kr/threads/review/WindowInsetPadding.java')),'Missing native inset geometry');
  let result=spawnSync('javac',['-encoding','UTF-8','--release','8','-d',out,path.join(root,'java/kr/threads/review/WindowInsetPadding.java'),path.join(root,'test/NativeInsetsTest.java')],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  result=spawnSync('java',['-cp',out,'kr.threads.review.NativeInsetsTest'],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Native insets JVM PASS/);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('static native integration: root owns bars and consumes child insets',()=>{
 for(const name of ['ConnectionActivity.java','ReviewActivity.java']){
  assert.match(java(name),/NativeWindowInsets\.apply\(this,\s*root\)/,name);
  assert.match(java(name),/NativeWindowInsets\.setTheme\(this\);\s*super\.onCreate/,`${name}: select theme before creating views`);
 }
 const source=java('NativeWindowInsets.java');
 assert.match(source,/WindowInsets\.Type\.systemBars\(\)/);
 assert.match(source,/WindowInsets\.Type\.displayCutout\(\)/);
 assert.match(source,/WindowInsets\.Type\.ime\(\)/);
 assert.match(source,/return WindowInsets\.CONSUMED/);
 assert.match(source,/WindowInsetsController\.APPEARANCE_LIGHT_STATUS_BARS/);
 assert.match(source,/WindowInsetsController\.APPEARANCE_LIGHT_NAVIGATION_BARS/);
});
test('static native palettes maintain readable body, management and button contrast',()=>{
 const luminance=hex=>{
  const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 };
 const source=java('ConnectionActivity.java');
 const palette=name=>{
  const match=source.match(new RegExp(`${name}=Color\\.parseColor\\(dark\\?"(#[0-9a-f]{6})":"(#[0-9a-f]{6})"\\)`));
  assert.ok(match,`Missing explicit ${name} color pair`);return match.slice(1);
 };
 const background=java('NativeWindowInsets.java').match(/dark\(activity\)\?"(#[0-9a-f]{6})":"(#[0-9a-f]{6})"/).slice(1);
 const foreground=palette('foreground'),muted=palette('muted'),accent=palette('accent'),paper=palette('paper');
 const primary=source.match(/NativeWindowInsets\.dark\(this\)\?"(#[0-9a-f]{6})":"(#[0-9a-f]{6})"/).slice(1);
 for(let mode=0;mode<2;mode++)for(const [label,fg,bg] of [['body',foreground[mode],background[mode]],['management',muted[mode],background[mode]],['button',foreground[mode],paper[mode]],['login',primary[mode],accent[mode]]]){
  const values=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);const ratio=(values[0]+.05)/(values[1]+.05);
  assert.ok(ratio>=4.5,`${label} mode ${mode}: contrast ${ratio.toFixed(2)} below 4.5`);
 }
});
test('static connection security/display regression: no unapproved login affordance or action',()=>{
 const source=java('ConnectionActivity.java');
 assert.match(source,/if\s*\(ConnectionConfig\.approved\(\)\)\s*\{[\s\S]*?login\s*=/,'Login is constructed only inside approval gate');
 assert.match(source,/private void startLogin\(\)\s*\{\s*if\s*\(!ConnectionConfig\.approved\(\)\s*\|\|/,'Action rechecks approval');
 assert.match(source,/private void logout\(\)\s*\{\s*if\s*\(!ConnectionConfig\.approved\(\)\s*\|\|/,'Logout rechecks approval');
 assert.match(source,/management\.setVisibility\(View\.GONE\)/,'Technical details start collapsed');
 assert.match(source,/cancel\.setVisibility\(View\.GONE\)/,'Cancel starts hidden');
 assert.match(source,/session\.vault\.hasSaved\(\)/,'Logout shown only for an actual saved session');
 assert.doesNotMatch(source,/\uFFFD|private GitHub App|webhook|Device Flow|Contents 읽기/,'Readable Korean and no developer setup copy');
 assert.match(source,/destroyed=true;invalidate\(\);worker\.shutdown\(\)/,'Destroy invalidates pending work');
 const review=java('ReviewActivity.java');
 assert.match(review,/setBlockNetworkLoads\(true\)/);
 assert.match(review,/setAllowFileAccess\(false\)/);
 assert.match(review,/setAllowContentAccess\(false\)/);
 assert.match(review,/MIXED_CONTENT_NEVER_ALLOW/);
});
test('static approved login handoff: returns to review and resumes packaged sync only',()=>{
 const connection=java('ConnectionActivity.java');
 assert.match(connection,/if\(result\.equals\("pending"\)\)schedulePoll\(id\);else show\(id,\(\)->\{updateActions\(false\);status\.setText\([^;]+;finish\(\);\}\)/,'Completed login returns to the review activity');
 const review=java('ReviewActivity.java');
 assert.match(review,/onResume\(\)\{super\.onResume\(\);if\(view!=null\)view\.evaluateJavascript\("window\.dispatchEvent\(new CustomEvent\('review-connection-changed'\)\)"/,'Resume notifies packaged app without credentials');
});
