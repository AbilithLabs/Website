const { chromium } = require('playwright');
(async()=>{ const [W,H,tag,...ps]=process.argv.slice(2); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:+W,height:+H}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/tools/harness.html'); await p.waitForFunction('window.ready===true');
for (const v of ps){ const [r,x]=v.split(':'); const a=await p.evaluate(([r,x])=>{const o=window.S.update({region:r,p:+x,time:0,idle:false}); return Object.entries(o.anchors).filter(([k,v])=>!v.ok).map(([k])=>k).join(',');},[r,x]); console.log(v,'offscreen:',a); await p.screenshot({path:`out/${tag}-${r}${x}.png`}); }
await b.close();})();
