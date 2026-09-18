import fs from 'node:fs';
const [url,out,portArg='9222']=process.argv.slice(2);
if(!url||!out) throw new Error('usage: node scripts/capture-full-post-cdp.mjs <url> <output.png> [port]');
const port=Number(portArg); const tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const tab=tabs.find(x=>x.type==='page'); if(!tab) throw new Error('no Chrome page target');
const ws=new WebSocket(tab.webSocketDebuggerUrl); let id=0; const pending=new Map(); ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}}; await new Promise(r=>ws.onopen=r);
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id:n,method,params}))});
await call('Page.enable'); await call('Runtime.enable'); await call('Page.navigate',{url}); await new Promise(r=>setTimeout(r,4000));
let h=(await call('Page.getLayoutMetrics')).cssContentSize.height; for(let y=0;y<h;y+=700){await call('Runtime.evaluate',{expression:`scrollTo(0,${y})`});await new Promise(r=>setTimeout(r,180));}
await call('Runtime.evaluate',{expression:'scrollTo(0,0)'}); await new Promise(r=>setTimeout(r,800)); const metrics=await call('Page.getLayoutMetrics');
const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true}); fs.mkdirSync(new URL('.',`file:///${out.replaceAll('\\','/')}`).pathname,{recursive:true}); fs.writeFileSync(out,Buffer.from(shot.data,'base64'));
console.log(JSON.stringify({url,out,width:metrics.cssContentSize.width,height:metrics.cssContentSize.height,bytes:fs.statSync(out).size,claim:'browser full-page screenshot; completeness still requires human review'})); ws.close();