# Abilith website

Concept site for Abilith and its first wearable, Hermes 1.0. It's a single static page: a scroll-driven Three.js scene of the arm-length wearable, followed by the vision, engineering, thesis and research sections.

## Layout

- `src/page.html`: markup, styles and page script. `/*SCENE*/` and `<!--IMPORTMAP-->` are filled in at build time.
- `src/scene.js`: the procedural 3D arm and wearable (Three.js 0.160). The intro shows the hand resting on a table; the chapters raise the arm into profile (`setStance`).
- `renders/`: pre-rendered stills (editorial frames, storyboard fallback for reduced motion / no WebGL, hero poster).
- `public/`: the built site that Vercel serves. Don't edit it by hand.
- `tools/`: build script and render/QA helpers.

## Build

```
python3 tools/build.py
```

This writes `public/index.html` and converts `renders/*.jpg` to `public/img/*.webp` (if Pillow is installed). Commit `public/` as well, because Vercel serves it as-is with no build step.

## Re-render stills and preview locally

```
cd tools && npm install && cd ..
python3 -m http.server 8765
# preview: http://localhost:8765/tools/index-dev.html
node tools/stills.js '[{"w":1600,"h":1000,"still":"music","stance":"table","out":"renders/music.jpg"}]'
```

The stills are `music`, `cooking` and `object` (all with `"stance":"table"`). Storyboard frames use `{"region":"seq","p":0.2,"center":true}` (Sense), `0.4` (Adapt), `0.66` (Assist) and `0.86` (Learn). The hero poster uses `{"region":"hero","p":0}`. `tools/seq.js` and `tools/qa.js` take QA screenshots.

All imagery is concept renders. Hermes 1.0 is in early development and isn't working hardware.
