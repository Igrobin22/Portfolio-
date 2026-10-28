"""Bring the approved local hero into the site; pass the prototype directory."""
from pathlib import Path
import re
import shutil
import sys

source = Path(sys.argv[1]).resolve()
root = Path(__file__).resolve().parents[1]
assets = root / 'assets/nvisuals-hero'
assets.mkdir(parents=True, exist_ok=True)
for name in ['hero-engine.js', 'hero-proximity.js', 'hero-experience.js', 'hero-text-energy.js', 'hero-entrance.js']:
    (assets / name).write_text((source / name).read_text(encoding='utf-8'), encoding='utf-8')
shutil.copy2(source / 'assets/original.png', assets / 'character.png')
for name in ['delirium-local.ttf', 'themadi-local.ttf', 'FONT-LICENSE.txt', 'THEMADI-SOURCE.txt']:
    shutil.copy2(source / 'assets/hero' / name, assets / name)
for stem in ['after-effects', 'capcut', 'photoshop-capcut-perspective']:
    for extension in ['.png', '.webp', '@2x.webp']:
        name = stem + extension
        shutil.copy2(source / 'assets/hero/decorated-v2' / name, assets / name)

def selector_scope(selector):
    selector = selector.strip()
    selector = re.sub(r'body(\[[^\]]+\])\s+\.hero(?![\w-])', r'.nv-hero\1', selector)
    selector = re.sub(r'body(?=\[)', '.nv-hero', selector)
    selector = re.sub(r'\.hero(?![\w-])', '.nv-hero', selector)
    if selector.startswith('html['):
        return selector.replace('] ', '] .nv-hero ', 1)
    if selector.startswith('.nv-hero'):
        return selector
    return '.nv-hero ' + selector

def scope_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    output, pos = [], 0
    while pos < len(css):
        start = css.find('{', pos)
        if start < 0:
            break
        header = css[pos:start].strip()
        depth, end = 1, start + 1
        while depth:
            if css[end] == '{': depth += 1
            elif css[end] == '}': depth -= 1
            end += 1
        body = css[start + 1:end - 1]
        if header.startswith('@media'):
            output.append(header + '{' + scope_css(body) + '}')
        elif header.startswith('@'):
            output.append(header + '{' + body + '}')
        else:
            output.append(','.join(selector_scope(part) for part in header.split(',')) + '{' + body + '}')
        pos = end
    return '\n'.join(output)

parts = [scope_css((source / name).read_text(encoding='utf-8')) for name in [
    'hero-vectors.css', 'hero-proximity.css', 'hero-experience.css', 'hero-entrance.css'
]]
(assets / 'hero-effects.css').write_text('\n'.join(parts) + '\n', encoding='utf-8')

prototype = (source / 'hero.html').read_text(encoding='utf-8')
composition = prototype[prototype.index('      <div class="composition"'):prototype.index('      <div class="hero-mobile-copy"')]
callout = prototype[prototype.index('      <div class="experience-callout"'):prototype.index('      <div class="site-hero-actions"')]
for old, new in [('assets/original.png', 'assets/nvisuals-hero/character.png'), ('assets/hero/decorated-v2/', 'assets/nvisuals-hero/')]:
    composition = composition.replace(old, new)
composition = composition.replace('17.8vw', '16.5vw').replace('14.5vw', '13.5vw').replace('11.5vw', '11vw')
hero = '''  <section id="hero" class="nv-hero" aria-label="Nvisuals animated hero">
    <div class="hero-bg" aria-hidden="true"></div>
    <div class="hero-grid" aria-hidden="true"></div>
''' + composition + callout + '''    <div class="nv-hero-actions">
      <a class="btn-primary" href="#portfolio" onclick="goTo('portfolio');return false">View Work</a>
      <a class="btn-ghost" href="#contact" onclick="goTo('home','contact');return false">Start a Project</a>
    </div>
    <button class="nv-motion-toggle" type="button" aria-label="Pause hero animation" aria-pressed="true" data-playing="true">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path class="nv-pause" d="M4 2h3v12H4zM10 2h3v12h-3z"/><path class="nv-play" d="M4 2l10 6-10 6z"/></svg>
    </button>
  </section>'''

index = root / 'index.html'
raw_page = index.read_bytes()
line_ending = '\r\n' if raw_page.count(b'\r\n') == raw_page.count(b'\n') else '\n'
page = index.read_text(encoding='utf-8')
if 'class="nv-hero"' in page:
    print('Hero assets refreshed; existing site integration preserved.')
    sys.exit(0)
start = page.index('  <section id="hero">')
end = page.index('  </section>', start) + len('  </section>')
page = page[:start] + hero + page[end:]
# Keep shared button styles; remove the replaced hero and blueprint styles.
css_start = page.index('/* ── HOME: HERO ── */')
css_end = page.index('/* ── HOME SECTIONS ── */', css_start)
old_css = page[css_start:css_end]
buttons = old_css[old_css.index('.btn-primary{'):old_css.index('.hero-scroll{')]
page = page[:css_start] + buttons + '\n' + page[css_end:]
js_start = page.index('// ── BLUEPRINT MORPH 3D ──')
js_end = page.index('// ── CONTACT FORM ──', js_start)
page = page[:js_start] + page[js_end:]
head = '''<script>
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.documentElement.dataset.heroIntro='pending';
  setTimeout(()=>{delete document.documentElement.dataset.heroIntro;},8500);
}
</script>
<link rel="preload" href="assets/nvisuals-hero/delirium-local.ttf" as="font" type="font/ttf" crossorigin media="(min-width:701px)">
<link rel="preload" href="assets/nvisuals-hero/themadi-local.ttf" as="font" type="font/ttf" crossorigin media="(max-width:700px)">
<link rel="preload" href="assets/nvisuals-hero/character.png" as="image" fetchpriority="high">
<link rel="stylesheet" href="assets/nvisuals-hero/hero-layout.css?v=1">
<link rel="stylesheet" href="assets/nvisuals-hero/hero-effects.css?v=1">
'''
page = page.replace('</head>', head + '</head>', 1)
scripts = '\n'.join('<script src="assets/nvisuals-hero/' + name + '"></script>' for name in [
    'hero-engine.js', 'hero-proximity.js', 'hero-experience.js', 'hero-text-energy.js', 'hero-entrance.js', 'hero-site.js'
])
page = page.replace('</body>', scripts + '\n</body>', 1)
# Keep the original file's line endings so unrelated lines do not change.
with index.open('w', encoding='utf-8', newline=line_ending) as handle:
    handle.write(page)
