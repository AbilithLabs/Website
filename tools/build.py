"""Build the static site.

src/page.html + src/scene.js -> public/index.html (deployed by Vercel)
                              -> tools/index-dev.html (local preview with a local three.js)
renders/*.jpg -> public/img/*.webp (when Pillow is installed)
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = '0.160.0'
CDN = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@%s/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@%s/examples/jsm/"}}</script>' % (THREE, THREE)
LOCAL = '<script type="importmap">{"imports":{"three":"/tools/node_modules/three/build/three.module.js","three/addons/":"/tools/node_modules/three/examples/jsm/"}}</script>'
HEAD = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'

page = open(os.path.join(ROOT, 'src/page.html')).read()
scene = open(os.path.join(ROOT, 'src/scene.js')).read().replace('export async function', 'async function')
body = page.replace('/*SCENE*/', scene)
# the page markup starts with head elements (<title>, <meta>, <style>); everything before <body-content> is fine inside <head>
site = HEAD + re.sub(r'(img/[a-z0-9-]+)\.jpg', r'\1.webp', body.replace('<!--IMPORTMAP-->', CDN)) + '</html>'
os.makedirs(os.path.join(ROOT, 'public/img'), exist_ok=True)
open(os.path.join(ROOT, 'public/index.html'), 'w').write(site)
open(os.path.join(ROOT, 'tools/index-dev.html'), 'w').write(HEAD + body.replace('<!--IMPORTMAP-->', LOCAL).replace('img/', '/renders/') + '</html>')

try:
    from PIL import Image
    widths = {'hero': 1440, 'music': 1200, 'cooking': 760, 'object': 1000}
    for f in sorted(os.listdir(os.path.join(ROOT, 'renders'))):
        if not f.endswith('.jpg'):
            continue
        name = f[:-4]
        im = Image.open(os.path.join(ROOT, 'renders', f)).convert('RGB')
        w = widths.get(name, 800)
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'public/img', name + '.webp'), 'WEBP', quality=68, method=6)
except ImportError:
    print('Pillow not installed: public/img left as is')
print('built public/index.html', len(site))
