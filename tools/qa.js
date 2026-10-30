const { chromium } = require('playwright');
(async()=>{
  const [,, w, h, tag, extra] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:+w,height:+h}, reducedMotion: extra==='reduce'?'reduce':'no-preference', deviceScaleFactor: 1});
  const p = await ctx.newPage();
  p.on('pageerror', e=>console.log('ERR', e.message));
  p.on('console', m=>{ if(!m.text().includes('GL Driver')) console.log('console:', m.text()); });
  await p.goto('http://localhost:8765/tools/index-dev.html');
  if (extra!=='reduce') await p.waitForSelector('#stage.live',{timeout:60000}).catch(()=>console.log('no live'));
  await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  const shots = [['top',0]];
  const pos = await p.evaluate(()=>{ const t=document.getElementById('seq-track'); const y=t.getBoundingClientRect().top+scrollY; const r=t.offsetHeight-innerHeight;
    const off=(id)=>document.getElementById(id).getBoundingClientRect().top+scrollY;
    return {y,r,poss:off('possibility'),intro:off('approach'),agency:off('agency'),eng:off('engineering'),man:off('manifesto'),res:off('research-intro'),close:off('closing'), H:document.documentElement.scrollHeight, W:document.documentElement.scrollWidth}; });
  console.log(JSON.stringify(pos));
  const list = [['top',0],['poss',pos.poss],['intro',pos.intro+innerHeightGuess()],['s1',pos.y+pos.r*0.18],['s2',pos.y+pos.r*0.45],['s3',pos.y+pos.r*0.65],['s4',pos.y+pos.r*0.86],['s5',pos.y+pos.r*0.99],['modes',pos.y+pos.r+ +h*1.1],['agency',pos.agency],['eng',pos.eng],['man',pos.man],['res',pos.res],['close',pos.close+ +h*0.5]];
  function innerHeightGuess(){ return +h*0.5; }
  for (const [n,y] of list) { if (extra==='reduce' && /^s\d/.test(n)) continue; await p.evaluate(y=>window.scrollTo(0,y), y); await p.waitForTimeout(400); await p.evaluate(y=>window.scrollTo(0,y+1), y); await p.waitForTimeout(2200); await p.screenshot({path:`dev/qa/${tag}-${n}.png`}); }
  await p.goto('http://localhost:8765/tools/index-dev.html#thesis'); await p.waitForTimeout(600); await p.screenshot({path:`dev/qa/${tag}-thesis.png`});
  await b.close();
})().catch(e=>{console.log('FAIL',e);process.exit(1)});
