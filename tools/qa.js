// QA screenshots of the home page, section by section, plus layout checks.
// usage: node tools/qa.js <width> <height> <tag> [reduce] [outdir]
// Serve the repo root on :8765 first (python3 -m http.server 8765) and run tools/build.py.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [, , w, h, tag, extra, outdir = 'tools/out/qa'] = process.argv;
  fs.mkdirSync(outdir, { recursive: true });
  const reduce = extra === 'reduce';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduce ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  p.on('console', (m) => { if (!m.text().includes('GL Driver')) console.log('console:', m.text()); });
  await p.goto('http://localhost:8765/tools/index-dev.html');
  if (!reduce) await p.waitForSelector('#stage.live', { timeout: 60000 }).catch(() => console.log('no live'));
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });

  const pos = await p.evaluate(() => {
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    const t = document.getElementById('seq-track');
    const ids = ['problem', 'somatic', 'hermes', 'library', 'principles', 'thesis', 'resources', 'closing'];
    const o = { y: top(t), r: t.offsetHeight - innerHeight, modes: top(document.querySelector('.modes')), zones: top(document.querySelector('.zones')), foot: top(document.querySelector('footer')) };
    ids.forEach((id) => (o[id] = top(document.getElementById(id))));
    return o;
  });

  // layout checks: no sideways scroll, nav fits on one line, nothing pokes out of the viewport
  const checks = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('main *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).position === 'fixed') return false;
      if (el.closest('.diagram, .seq-stage, .p-fig')) return false; // scrollable or clipped on purpose
      return r.right > W + 1 || r.left < -1;
    }).slice(0, 8).map((el) => el.tagName.toLowerCase() + '.' + el.className + ' ' + Math.round(el.getBoundingClientRect().right));
    const nav = document.querySelector('.nav');
    const items = [...nav.querySelectorAll('.btn-sq, .wordmark')].map((el) => el.getBoundingClientRect());
    return {
      scrollW: document.documentElement.scrollWidth, W,
      navOneLine: new Set(items.map((r) => Math.round((r.top + r.bottom) / 2))).size === 1, // same vertical centre (the logo is taller than the buttons)
      navRight: Math.round(Math.max(...items.map((r) => r.right))), navLeft: Math.round(Math.min(...items.map((r) => r.left))),
      wide,
    };
  });
  console.log(tag, JSON.stringify(checks));

  const H = +h;
  const list = [['top', 0], ['problem', pos.problem], ['somatic', pos.somatic], ['loop', pos.somatic + H * 0.9], ['intro', pos.hermes + H * 0.3]];
  if (!reduce) list.push(['s1', pos.y + pos.r * 0.18], ['s2', pos.y + pos.r * 0.4], ['s3', pos.y + pos.r * 0.64], ['s4', pos.y + pos.r * 0.86], ['s5', pos.y + pos.r * 0.99]);
  else list.push(['story', pos.hermes + H * 1.1], ['story2', pos.hermes + H * 2]);
  list.push(['modes', pos.modes - 40], ['zones', pos.zones - 40], ['library', pos.library], ['library2', pos.library + H * 0.9], ['principles', pos.principles], ['thesis', pos.thesis], ['resources', pos.resources], ['closing', pos.closing], ['footer', pos.foot - H * 0.4]);
  for (const [n, y] of list) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(400);
    await p.evaluate((y) => window.scrollTo(0, y + 1), y);
    await p.waitForTimeout(reduce ? 300 : 1600);
    await p.screenshot({ path: `${outdir}/${tag}-${n}.png` });
  }

  // old links: #approach lands on Hermes, #research forwards to the white paper
  await p.goto('http://localhost:8765/tools/index-dev.html#approach');
  await p.waitForTimeout(900);
  console.log(tag, '#approach ->', await p.evaluate(() => location.hash + ' top=' + Math.round(document.getElementById('hermes').getBoundingClientRect().top)));
  await p.goto('http://localhost:8765/tools/index-dev.html#research');
  await p.waitForTimeout(900);
  console.log(tag, '#research ->', p.url());
  await b.close();
})().catch((e) => { console.log('FAIL', e); process.exit(1); });
