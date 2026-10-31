import assert from 'node:assert/strict';
import '../app/source-batch-image-analysis.js';
const A=globalThis.ThreadsImageAnalysis;
function pixels(width,height,color){const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4){data.set([...color,255],i);}return data;}
function rect(data,width,x,y,w,h,color){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)data.set([...color,255],(yy*width+xx)*4);}
// The real i1410905329.jpg has a dominant dark background and saturated yellow chat bubbles.
const chat=pixels(200,200,[8,8,8]);
for(const y of [12,48,84,120]){rect(chat,200,100,y,96,24,[255,235,60]);rect(chat,200,112,y+9,60,4,[20,20,20]);}
const tinted=A.analyze(chat,200,200);
assert(tinted.colorRatio>.1);assert(tinted.dominantColorRatio>.5);
assert.equal(tinted.kind,'screenshot');assert.equal(tinted.photoScore,-1);
assert(tinted.flatBands>=3);
// A flat, saturated product/sky background alone is not evidence of text.
const photo=pixels(200,200,[30,140,210]);
for(let y=40;y<160;y++)for(let x=45;x<155;x++)rect(photo,200,x,y,1,1,[(x*3+y)%190,80+(x+y)%150,50+y%180]);
assert.equal(A.analyze(photo,200,200).kind,'photo');
// A single nonblank edge pixel must not be rounded away by the old .995 threshold.
const white=pixels(400,400,[255,255,255]);
for(const y of [100,180,260])rect(white,400,100,y,190,8,[20,20,20]);
rect(white,400,10,10,1,1,[80,80,80]);rect(white,400,390,390,1,1,[80,80,80]);
const bounds=A.analyze(white,400,400).bounds;
assert(bounds.x<=10&&bounds.y<=10);assert(bounds.x+bounds.width>390&&bounds.y+bounds.height>390);
// A pale but visible footer is content, not disposable whitespace.
rect(white,400,20,394,30,2,[238,238,238]);
const footer=A.analyze(white,400,400).bounds;
assert(footer.y+footer.height>=396);
const dark=pixels(400,400,[0,0,0]);
for(const y of [100,180,260])rect(dark,400,100,y,190,8,[240,240,240]);
rect(dark,400,10,10,1,1,[100,100,100]);rect(dark,400,390,390,1,1,[100,100,100]);
const d=A.analyze(dark,400,400);
assert.equal(d.kind,'screenshot');assert.equal(d.darkMode,true);
assert(d.bounds.x<=10&&d.bounds.y<=10);assert(d.bounds.x+d.bounds.width>390&&d.bounds.y+d.bounds.height>390);
// Blank margins still shrink with padding, preserving useful enlargement.
const clean=pixels(400,400,[249,249,249]);
for(const y of [100,180,260])rect(clean,400,100,y,190,8,[20,20,20]);
const c=A.analyze(clean,400,400,800,800).bounds;
assert.deepEqual(c,{x:192,y:192,width:396,height:352});
assert.equal(A.VERSION,'2026-10-04.4');
console.log('Image analysis: saturated dark chat, photo contrast, isolated edge marks, faint footer, safe blank crop PASS');
