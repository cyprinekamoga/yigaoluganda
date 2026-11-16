"""Converts the screenshots from scripts/screenshots.mjs into the landing page's WebP images:
e2e-shots/screens-en/*.png → landing/assets/screens/*.webp, screens-sv → landing/assets/screens/sv/."""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for lang, sub in (('en', ''), ('sv', 'sv')):
    src = os.path.join(ROOT, 'e2e-shots', f'screens-{lang}')
    dst = os.path.join(ROOT, 'landing', 'assets', 'screens', sub)
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        if not name.endswith('.png') or name.startswith('build-start'):
            continue
        out = os.path.join(dst, name[:-4] + '.webp')
        Image.open(os.path.join(src, name)).convert('RGB').save(out, 'WEBP', quality=78, method=6)
        print(f'{lang}: {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} KB)')
