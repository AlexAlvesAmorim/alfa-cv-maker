"""Gera icons/icon-*.png a partir de public/favicon.svg via screenshot."""

import os
import sys
from urllib.parse import quote
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "icons")
os.makedirs(OUT, exist_ok=True)

svg_path = os.path.join(ROOT, "public", "favicon.svg")
with open(svg_path, encoding="utf-8") as fh:
    svg = quote(fh.read(), safe="")


def shot(page, size, bg, path, img_size=None):
    img = img_size or size
    html = (
        "<html><body style='margin:0;display:grid;place-items:center;"
        f"width:{size}px;height:{size}px;background:{bg}'>"
        f"<img src='data:image/svg+xml,{svg}' width='{img}' height='{img}'>"
        "</body></html>"
    )
    page.set_viewport_size({"width": size, "height": size})
    page.goto("about:blank")
    page.set_content(html)
    page.screenshot(path=path)
    print("ok:", path, os.path.getsize(path), "bytes")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(device_scale_factor=1)
    shot(page, 192, "transparent", os.path.join(OUT, "icon-192.png"))
    shot(page, 512, "transparent", os.path.join(OUT, "icon-512.png"))
    # Maskable precisa de respiro: selo a 80% centralizado sobre o fundo do tema.
    shot(page, 512, "#0e0407", os.path.join(OUT, "icon-maskable.png"), img_size=410)
    browser.close()

print("done.")
