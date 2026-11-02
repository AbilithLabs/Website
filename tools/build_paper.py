"""Build the white paper page and the Resources index.

src/white-paper/paper.md + src/white-paper/figures/fig-N.svg
    -> public/resources/white-paper.html  (served at /resources/white-paper)
    -> public/resources/index.html        (served at /resources)

Both pages reuse the home page's design tokens, nav, grid overlay and buttons,
read straight from src/page.html, so they stay in step with the rest of the site.
tools/build.py runs this after building the home page.
"""
import html
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'white-paper')
OUT = os.path.join(ROOT, 'public', 'resources')

PAPER = {
    'url': '/resources/white-paper',
    'kicker': 'White paper',
    'title': 'Somatic Computing',
    'full_title': 'Somatic Computing: Abilith White Paper',
    'dek': 'Why physical skill has never scaled, why it can now, and how somatic computing works.',
    'author': 'Ashwin',
    'date': 'Nov 2, 2026',
    'iso_date': '2026-11-02',
    'cover': ('AI just got a body.', 'Yours.'),
}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=IBM+Plex+Mono:wght@400;500&display=swap">')

WORDMARK = ('<svg viewBox="0 0 30 14" aria-hidden="true"><rect x="0.5" y="4.5" width="5" height="5" fill="none" stroke="currentColor"/>'
            '<rect x="11.5" y="2.5" width="7" height="9" fill="currentColor"/><rect x="24.5" y="4.5" width="5" height="5" fill="none" stroke="currentColor"/>'
            '<path d="M6 7h5M19 7h5" stroke="currentColor"/></svg>')

def page_source():
    return open(os.path.join(ROOT, 'src', 'page.html')).read()


def site_footer():
    """The home page's footer, copied as is (its links are absolute, so they work from /resources too)."""
    m = re.search(r'<footer class="site-foot">.*?</footer>', page_source(), re.S)
    assert m, 'expected <footer class="site-foot"> in src/page.html'
    return m.group(0)


def site_css():
    """The home page's shared rules: tokens, base type, grid overlay, nav, buttons and footer."""
    page = page_source()
    css = page[page.index('<style>') + len('<style>'):page.index('</style>')]
    base = css[css.index(':root {'):css.index('/* ---------- hero ---------- */')]
    keep = [l for l in css.splitlines()
            if re.match(r'(\.btn[ .:{]|footer[ .:{]|\.foot-|\.prose \.pull |@media[^{]*\{ *(footer|\.foot-))', l)]
    assert sum(l.startswith('.btn') for l in keep) >= 5, 'expected the .btn rules in src/page.html'
    assert any(l.startswith('footer') for l in keep) and any(l.startswith('.foot-') for l in keep), 'expected the footer rules in src/page.html'
    assert any(l.startswith('.prose .pull') for l in keep), 'expected the .prose .pull rule in src/page.html'
    return base + '\n'.join(keep) + '\n'


PAGE_CSS = """
/* ---------- resources pages ---------- */
.res { position: relative; z-index: 2; padding-top: calc(var(--nav-h) + clamp(28px, 5vw, 64px)); padding-bottom: 48px; }
.crumb { display: inline-flex; gap: 10px; align-items: center; color: var(--paper-dim); text-decoration: none; padding: 6px 0; }
.crumb:hover { color: var(--paper); }
.grid12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 16px; }

/* paper head */
.p-head { margin-top: clamp(40px, 6vw, 84px); row-gap: 22px; align-items: start; }
.p-head .eyebrow { grid-column: 1 / span 3; padding-top: 0.6em; }
.p-head h1 { grid-column: 4 / span 9; font-size: clamp(60px, 10.5vw, 184px); font-stretch: 62%; font-weight: 750; line-height: 0.82; }
.p-head .p-dek { grid-column: 4 / span 6; font-size: var(--t-l); line-height: 1.45; color: var(--paper); max-width: 40ch; }
.p-byline { grid-column: 4 / span 9; display: flex; flex-wrap: wrap; gap: 8px 22px; color: var(--paper-dim); }
.p-byline b { color: var(--paper); font-weight: 500; }
.p-cover { margin: clamp(48px, 7vw, 96px) 0 0; position: relative; border: 1px solid var(--rule-strong); background: var(--ink-raise); aspect-ratio: 21 / 8; display: grid; align-content: space-between; padding: clamp(16px, 2vw, 28px); overflow: hidden; }
.p-cover .mono { color: var(--paper-dim); display: flex; justify-content: space-between; gap: 16px; }
.p-cover p { font-family: var(--display); font-weight: 750; font-stretch: 62%; text-transform: uppercase; line-height: 0.84; font-size: clamp(44px, 8.4vw, 150px); margin: 0; }
.p-cover p em { font-style: normal; color: transparent; -webkit-text-stroke: 1px var(--paper); }

/* paper body */
.p-body { margin-top: clamp(56px, 8vw, 120px); align-items: start; }
.p-toc { grid-column: 1 / span 2; position: sticky; top: calc(var(--nav-h) + 28px); display: grid; gap: 14px; }
.p-toc > p { color: var(--paper-dim); }
.p-toc ol { list-style: none; margin: 0; padding: 0; display: grid; }
.p-toc a { display: grid; grid-template-columns: 26px 1fr; gap: 6px; padding: 7px 0; border-top: 1px solid var(--rule); color: var(--paper-dim); text-decoration: none; font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.35; transition: color 0.2s; }
.p-toc a:hover, .p-toc a[aria-current] { color: var(--paper); }
.p-toc a[aria-current] span { color: var(--accent); }
.p-text { grid-column: 4 / span 9; min-width: 0; }
.p-sec { display: grid; grid-template-columns: repeat(9, 1fr); gap: 0 16px; border-top: 1px solid var(--rule-strong); padding-top: 20px; scroll-margin-top: calc(var(--nav-h) + 20px); }
.p-sec + .p-sec { margin-top: clamp(72px, 9vw, 128px); }
.p-sec > * { grid-column: 1 / span 6; min-width: 0; }
.p-sec > * + * { margin-top: 1.15em; }
.p-sec > .p-fig, .p-sec > .p-closer { grid-column: 1 / -1; }
.p-sec .p-n { font-size: var(--t-xs); line-height: 1.4; color: var(--paper-dim); margin-bottom: 18px; }
.p-sec h2 { font-size: clamp(42px, 5.4vw, 88px); font-stretch: 62%; font-weight: 750; line-height: 0.84; margin-top: 0; }
.p-sec h2 + .p-sub, .p-sec h3 + .p-sub { margin-top: 12px; }
.p-sec .p-sub { font-size: var(--t-l); line-height: 1.4; color: var(--paper-dim); }
.p-sec h2 + .p-sub + *, .p-sec h2 + p:not(.p-sub) { margin-top: 2em; }
.p-sec h3 { font-size: clamp(28px, 2.7vw, 40px); font-stretch: 70%; margin-top: 2.4em; }
.p-sec p, .p-sec li { font-size: 18px; line-height: 1.65; color: #d9d1c5; }
.p-sec > h2 + p:not(.p-sub), .p-sec > h2 + .p-sub + p { color: var(--paper); }
.p-sec strong { color: var(--paper); font-weight: 600; }
.p-sec .pull { margin-top: 2em; margin-bottom: 0.9em; }
.p-sec ul, .p-sec ol { list-style: none; margin-left: 0; margin-right: 0; padding: 0; }
.p-sec ul li, .p-sec ol li { border-top: 1px solid var(--rule-strong); padding: 16px 0 18px; }
.p-sec ul li > strong:first-child { font-family: var(--mono); font-size: 12px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; margin-right: 0.5em; }
.p-sec ol { counter-reset: n; }
.p-sec ol li { counter-increment: n; display: grid; grid-template-columns: 54px 1fr; gap: 12px; }
.p-sec ol li::before { content: counter(n, decimal-leading-zero); font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em; color: var(--paper-dim); padding-top: 5px; }
.cites { font-family: var(--mono); font-size: 0.7em; letter-spacing: 0.02em; color: var(--paper-dim); white-space: nowrap; }
.cites a { color: inherit; text-decoration: none; }
.cites a:hover { color: var(--accent); }
.p-fig { margin: 2.2em 0 1.4em; overflow-x: auto; border: 1px solid var(--rule-strong); scroll-margin-top: calc(var(--nav-h) + 20px); }
.p-fig svg { display: block; width: 100%; height: auto; }
.p-sec .p-closer { margin-top: clamp(56px, 7vw, 96px); font-family: var(--display); font-weight: 750; font-stretch: 62%; text-transform: uppercase; line-height: 0.84; font-size: clamp(56px, 8.6vw, 156px); color: var(--paper); }
.p-closer span, .p-closer em { display: block; }
.p-closer em { font-style: normal; color: transparent; -webkit-text-stroke: 1px var(--paper); }

/* sources */
.p-refs ol li { padding: 12px 0 14px; font-size: 15px; line-height: 1.5; color: var(--paper-dim); scroll-margin-top: calc(var(--nav-h) + 20px); }
.p-refs ol li:target { color: var(--paper); }
.p-refs ol li:target::before { color: var(--accent); }
.p-refs a { color: var(--paper); text-decoration: underline; text-decoration-color: var(--rule-strong); text-underline-offset: 3px; overflow-wrap: anywhere; }
.p-refs a:hover { text-decoration-color: var(--accent); }
.p-sec .p-note { border-top: 1px solid var(--rule-strong); padding-top: 14px; margin-top: 3em; color: var(--paper-dim); font-size: var(--t-s); }
.res .back { margin-top: clamp(64px, 8vw, 110px); }

/* resources index */
.r-head { margin-top: clamp(40px, 6vw, 84px); row-gap: 18px; align-items: start; }
.r-head .eyebrow { grid-column: 1 / span 3; padding-top: 0.6em; }
.r-head h1 { grid-column: 4 / span 9; font-size: clamp(64px, 12vw, 210px); font-stretch: 62%; font-weight: 750; line-height: 0.82; }
.r-list { list-style: none; margin: clamp(56px, 8vw, 120px) 0 0; padding: 0; }
.r-card > a { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px 16px; text-decoration: none; border-top: 1px solid var(--rule-strong); padding-top: 18px; align-items: end; }
.r-card .p-cover { grid-column: 1 / span 7; margin: 0; aspect-ratio: 16 / 9; transition: border-color 0.2s; }
.r-card .p-cover p { font-size: clamp(36px, 5.2vw, 92px); }
.r-card a:hover .p-cover { border-color: var(--paper); }
.r-meta { grid-column: 9 / span 4; display: grid; gap: 14px; align-content: end; }
.r-meta .tag { color: var(--accent); }
.r-meta h2 { font-size: clamp(32px, 3.4vw, 54px); font-stretch: 66%; }
.r-meta p { color: var(--paper-dim); max-width: 40ch; }
.r-meta .mono { color: var(--paper-dim); }

@media (max-width: 900px) {
  .p-head .eyebrow, .p-head h1, .p-head .p-dek, .p-byline, .r-head .eyebrow, .r-head h1 { grid-column: 1 / -1; }
  .p-cover { aspect-ratio: 4 / 3; }
  .p-body { display: block; }
  .p-toc { position: static; margin-bottom: 64px; }
  .p-sec { display: block; }
  .p-fig svg { min-width: 640px; }
  .r-card > a { grid-template-columns: 1fr; }
  .r-card .p-cover, .r-meta { grid-column: auto; }
}
@media (max-width: 520px) { .p-sec p, .p-sec li { font-size: 17px; } .p-sec ol li { grid-template-columns: 38px 1fr; } }
@media print {
  .grid-overlay, .nav, .p-toc, .crumb, .back { display: none !important; }
  .res { padding-top: 0; }
  .p-body { display: block; }
}
"""

TOC_JS = """<script>
(() => {
  const links = [...document.querySelectorAll('.p-toc a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = byId.get(e.target.id);
      if (a) a.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-25% 0px -70% 0px' });
  document.querySelectorAll('.p-sec[id]').forEach((s) => io.observe(s));
})();
</script>"""


def esc(s):
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


class Paper:
    def __init__(self, text, figures):
        self.figures = figures
        text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
        self.blocks = [b.strip('\n') for b in re.split(r'\n\s*\n', text) if b.strip()]
        self.n_sources = 0
        for b in self.blocks:
            if b.startswith('1. [') and '](' in b:
                self.n_sources = max(self.n_sources, len(re.findall(r'^\d+\. ', b, re.M)))
        assert self.n_sources, 'no Sources list found'

    def inline(self, s):
        s = esc(s)
        s = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', lambda m: f'<a href="{attr(m.group(2))}" rel="noopener">{m.group(1)}</a>', s)
        s = re.sub(r'\[(\d+(?:, \d+)*)\](?!\()', self.cites, s)
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        s = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'<em>\1</em>', s)
        bare = re.sub(r'<[^>]+>', '', re.sub(r'<span class="cites">.*?</span>', '', s))
        assert '[' not in bare and '**' not in bare, 'unconverted markdown in: ' + s[:80]
        return s

    def cites(self, m):
        nums = [int(x) for x in m.group(1).split(', ')]
        for n in nums:
            assert 1 <= n <= self.n_sources, f'citation [{n}] has no source'
        return '<span class="cites">[' + ', '.join(f'<a href="#src-{n}" aria-label="Source {n}">{n}</a>' for n in nums) + ']</span>'

    @staticmethod
    def split_heading(text):
        main, _, sub = text.partition(': ')
        return main, (sub[:1].upper() + sub[1:]) if sub else ''

    def render(self):
        sections, cur, toc, words = [], None, [], 0
        for b in self.blocks:
            if b.startswith('## '):
                title = b[3:].strip()
                main, sub = self.split_heading(title)
                refs = title == 'Sources'
                sid = 'sources' if refs else slug(main)
                num = None if refs else len(toc) + 1
                toc.append((sid, f'{num:02d}' if num else '', main))
                cur = {'id': sid, 'refs': refs, 'parts': []}
                sections.append(cur)
                if num:
                    cur['parts'].append(f'<p class="p-n mono" aria-hidden="true">{num:02d}</p>')
                cur['parts'].append(f'<h2 id="h-{sid}">{esc(main)}</h2>')
                if sub:
                    cur['parts'].append(f'<p class="p-sub">{esc(sub)}</p>')
                continue
            assert cur is not None, 'text before the first section: ' + b[:60]
            if not cur['refs']:
                words += len(re.sub(r'\[[\d, ]+\]|::\w+', '', b).split())
            cur['parts'].append(self.block(b, cur['refs']))
        body = ''.join(
            f'<section class="p-sec{" p-refs" if s["refs"] else ""}" id="{s["id"]}" aria-labelledby="h-{s["id"]}">' + ''.join(s['parts']) + '</section>'
            for s in sections)
        toc_html = '<nav class="p-toc" aria-label="Contents"><p class="mono">Contents</p><ol>' + ''.join(
            f'<li><a href="#{sid}"><span>{n}</span>{esc(t)}</a></li>' for sid, n, t in toc) + '</ol></nav>'
        return body, toc_html, words

    def block(self, b, refs):
        if b.startswith('### '):
            main, sub = self.split_heading(b[4:].strip())
            out = f'<h3>{esc(main)}</h3>'
            return out + (f'<p class="p-sub">{esc(sub)}</p>' if sub else '')
        if b.startswith('::figure '):
            name = b.split()[1]
            return f'<figure class="p-fig" id="{name}">{self.figures[name]}</figure>'
        if b.startswith('::pull '):
            return f'<p class="pull">{self.inline(b[7:])}</p>'
        if b.startswith('::closer '):
            first, second = b[9:].split('|')
            return f'<p class="p-closer"><span>{esc(first)}</span> <em>{esc(second)}</em></p>'
        lines = b.split('\n')
        if all(l.startswith('- ') for l in lines):
            return '<ul>' + ''.join(f'<li>{self.inline(l[2:])}</li>' for l in lines) + '</ul>'
        if all(re.match(r'\d+\. ', l) for l in lines):
            items = [re.sub(r'^\d+\. ', '', l) for l in lines]
            if refs:
                return '<ol>' + ''.join(f'<li id="src-{i}"><span>{self.inline(t)}</span></li>' for i, t in enumerate(items, 1)) + '</ol>'
            return '<ol>' + ''.join(f'<li><span>{self.inline(t)}</span></li>' for t in items) + '</ol>'
        if re.fullmatch(r'\*[^*].*[^*]\*', b):
            return f'<p class="p-note">{self.inline(b[1:-1])}</p>'
        assert not b.startswith(('#', '::', '|', '>')), 'unhandled block: ' + b[:60]
        return f'<p>{self.inline(" ".join(lines))}</p>'


def nav(current):
    links = [('/#hermes', 'Hermes'), ('/#principles', 'Principles'), ('/resources', 'Resources')]
    here = ' aria-current="page"'
    items = ''.join(f'<li><a class="btn-sq" href="{h}"{here if t == current else ""}>{t}</a></li>' for h, t in links)
    return (f'<header class="nav"><a class="wordmark" href="/" aria-label="Abilith, home">{WORDMARK}<span>Abilith</span></a>'
            f'<nav aria-label="Primary"><ul>{items}</ul></nav></header>')


def cover(tag):
    first, second = PAPER['cover']
    return (f'<div class="p-cover" aria-hidden="true"><span class="mono"><span>Abilith / {esc(tag)}</span><span>Somatic computing</span></span>'
            f'<p>{esc(first)} <em>{esc(second)}</em></p><span class="mono"><span>Hermes</span><span>{esc(PAPER["date"])}</span></span></div>')


def page(title, desc, body, extra_head='', tail=''):
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            f'<title>{esc(title)}</title><meta name="description" content="{attr(desc)}">{extra_head}{FONTS}'
            f'<style>{site_css()}{PAGE_CSS}</style></head><body>'
            '<div class="grid-overlay" aria-hidden="true">' + '<i></i>' * 12 + '</div>'
            f'{body}{tail}</body></html>\n')


def build():
    figures = {}
    for f in sorted(os.listdir(os.path.join(SRC, 'figures'))):
        if f.endswith('.svg'):
            figures[f[:-4]] = open(os.path.join(SRC, 'figures', f)).read().strip()
    paper = Paper(open(os.path.join(SRC, 'paper.md')).read(), figures)
    body, toc, words = paper.render()
    minutes = max(1, math.ceil(words / 230))
    p = PAPER
    head = (f'<meta name="author" content="{attr(p["author"])}"><meta property="og:type" content="article">'
            f'<meta property="og:title" content="{attr(p["full_title"])}"><meta property="og:description" content="{attr(p["dek"])}">'
            f'<meta property="article:published_time" content="{p["iso_date"]}">')
    paper_html = page(p['full_title'], p['dek'], (
        nav('Resources') +
        '<main class="res wrap" id="top">'
        '<a class="crumb mono" href="/resources"><span aria-hidden="true">&#8592;</span> Resources</a>'
        '<header class="p-head grid12">'
        f'<p class="eyebrow">{esc(p["kicker"])}</p><h1>{esc(p["title"])}</h1>'
        f'<p class="p-dek">{esc(p["dek"])}</p>'
        f'<p class="p-byline mono"><span>By <b>{esc(p["author"])}</b></span><time datetime="{p["iso_date"]}">{esc(p["date"])}</time>'
        f'<span>{minutes} min read</span><span>{paper.n_sources} sources</span></p>'
        '</header>' + cover(p['kicker']) +
        f'<div class="p-body grid12">{toc}<article class="p-text prose" aria-label="{attr(p["full_title"])}">{body}</article></div>'
        '<a class="btn line back" href="/resources"><span class="arr" aria-hidden="true">&#8592;</span> Back to Resources</a>'
        f'{site_footer()}</main>'), extra_head=head, tail=TOC_JS)

    index_html = page('Resources: Abilith', 'Papers and notes from Abilith on somatic computing.', (
        nav('Resources') +
        '<main class="res wrap" id="top">'
        '<header class="r-head grid12"><p class="eyebrow">Papers and notes</p><h1>Resources</h1></header>'
        '<ul class="r-list"><li class="r-card">'
        f'<a href="{p["url"]}">{cover(p["kicker"])}'
        f'<div class="r-meta"><p class="tag mono">{esc(p["kicker"])}</p><h2>{esc(p["full_title"])}</h2>'
        f'<p>{esc(p["dek"])}</p><p class="mono">{esc(p["author"])} &middot; {esc(p["date"])}</p></div></a>'
        '</li></ul>'
        f'{site_footer()}</main>'), extra_head='<meta property="og:type" content="website">')

    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'white-paper.html'), 'w').write(paper_html)
    open(os.path.join(OUT, 'index.html'), 'w').write(index_html)
    print('built public/resources/white-paper.html', len(paper_html), f'({words} words, {minutes} min, {paper.n_sources} sources)')
    print('built public/resources/index.html', len(index_html))


if __name__ == '__main__':
    build()
