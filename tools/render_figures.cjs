// Render the white paper figures to static SVG.
//
// Each figure is drawn as a small React component (the same code as the
// matching figure in the white paper's Claude Doc) in src/white-paper/figures/fig-N.jsx.
// This writes fig-N.svg next to it, which tools/build_paper.py inlines into the page.
//
//   cd tools && npm install && cd .. && node tools/render_figures.cjs
//
// The figure's own background grid is dropped, because the page already draws
// the site's 12-column grid over everything.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const dir = path.join(__dirname, '..', 'src', 'white-paper', 'figures');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsx')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const { code } = esbuild.transformSync(src, { loader: 'jsx', format: 'cjs', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' });
  const mod = { exports: {} };
  new Function('React', 'module', 'exports', 'require', code)(React, mod, mod.exports, require);
  let svg = renderToStaticMarkup(React.createElement(mod.exports.default));
  const before = svg.length;
  svg = svg.replace(/<g data-claude-anchor="grid">(?:<line [^>]*><\/line>)+<\/g>/, '');
  if (svg.length === before) throw new Error(f + ': background grid not found');
  svg = svg.replace(/ data-claude-(?:text-id|anchor)="[^"]*"/g, '');
  fs.writeFileSync(path.join(dir, f.replace(/\.jsx$/, '.svg')), svg + '\n');
  console.log(f.replace(/\.jsx$/, '.svg'), svg.length);
}
