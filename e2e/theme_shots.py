"""Screenshots dos 4 temas (header + hero) para revisão visual. Saída em e2e/shots/."""

import os
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://localhost:5175")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

THEMES = ["vinho", "portal", "noturno", "paper"]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for theme in THEMES:
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.add_init_script(f"localStorage.setItem('alfa-theme', '{theme}');")
        page.goto(APP_URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_selector(".header__title")
        page.wait_for_timeout(800)
        path = os.path.join(OUT, f"theme-{theme}.png")
        page.screenshot(path=path)
        print("ok:", path)
        page.close()
    browser.close()
print("done.")
