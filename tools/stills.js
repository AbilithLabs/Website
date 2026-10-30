const { chromium } = require('playwright');
(async()=>{
  const jobs = JSON.parse(process.argv[2]);
  const b = await chromium.launch();
  for (const j of jobs) {
    const p = await b.newPage({viewport:{width:j.w,height:j.h}});
    p.on('pageerror', e=>console.log('ERR', e.message));
    await p.goto('http://localhost:8765/tools/stills.html'+(j.stance?'?stance='+j.stance:''));
    await p.waitForFunction('window.ready===true',{timeout:60000});
    if (j.still) await p.evaluate(([n,c])=>window.render(n,c), [j.still, j.cam||null]);
    else await p.evaluate(([r,v,c])=>window.renderState(r,v,c), [j.region,j.p,!!j.center]);
    await p.screenshot({path:j.out, type: j.out.endsWith('.jpg')?'jpeg':'png', quality: j.out.endsWith('.jpg')?84:undefined});
    await p.close();
  }
  await b.close();
})().catch(e=>{console.log('FAIL',e);process.exit(1)});
