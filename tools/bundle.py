#!/usr/bin/env python3
"""Emit single-file builds of platform pages.

The repo is structured as shared modules (platform/core, platform/vendor,
per-app scripts) because that's what keeps two-plus projects from drifting.
But a single self-contained HTML file is still the best *delivery* format —
double-click it anywhere, mail it, drop it in a chat. This script turns any
app page back into that format by inlining every local <script src> in place.

Usage:
    python3 tools/bundle.py                  # bundle the default page set
    python3 tools/bundle.py apps/sauna/plan.html [more pages...]

Output lands in dist/ as <app>-<page>.html.
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(REPO, 'dist')

DEFAULT_PAGES = [
    'apps/sauna/index.html',
    'apps/sauna/plan.html',
]

SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')


def bundle(page_rel):
    page_abs = os.path.join(REPO, page_rel)
    base = os.path.dirname(page_abs)
    src = open(page_abs, encoding='utf-8').read()

    def repl(m):
        path = os.path.normpath(os.path.join(base, m.group(1)))
        js = open(path, encoding='utf-8').read()
        # A literal close tag inside the JS would truncate the inline script.
        if '</scr' + 'ipt>' in js:
            raise SystemExit(f'{path}: contains a literal script close tag; cannot inline')
        return '<script>\n' + js + '\n</scr' + 'ipt>'

    out, n = SCRIPT_RE.subn(repl, src)
    parts = page_rel.split('/')
    name = f'{parts[-2]}-{os.path.splitext(parts[-1])[0]}.html'
    os.makedirs(DIST, exist_ok=True)
    dest = os.path.join(DIST, name)
    open(dest, 'w', encoding='utf-8').write(out)
    print(f'{page_rel}: inlined {n} scripts -> dist/{name} ({len(out):,} bytes)')


if __name__ == '__main__':
    pages = sys.argv[1:] or DEFAULT_PAGES
    for p in pages:
        bundle(p)
