"""E2E smoke: chat feliz + Alfa Match. Roda contra APP_URL (default dev :5175)."""

import os
import sys
from playwright.sync_api import sync_playwright

APP_URL = os.environ.get("APP_URL", "http://localhost:5175")
failures: list[str] = []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto(APP_URL)
    page.wait_for_load_state("networkidle")

    # 1. Boas-vindas + primeira pergunta
    check("welcome", page.get_by_text("Bem-vindo ao Alfa Curriculum Maker").count() > 0)
    page.wait_for_selector("text=qual é o seu nome completo", timeout=8000)

    # 2. Responde o nome e avança para o contato
    page.get_by_label("Sua resposta").fill("Maria Silva Teste")
    page.get_by_label("Sua resposta").press("Enter")
    page.wait_for_selector("text=seus dados de contato", timeout=8000)
    check("avanco para contato", True)

    # 3. Vai ao Alfa Match e analisa uma vaga curta
    page.get_by_role("button", name="Alfa Match").click()
    page.wait_for_selector("text=O encaixe entre o seu currículo", timeout=5000)
    vaga = page.get_by_placeholder("Cole aqui a descrição da vaga ou o link do anúncio")
    vaga.fill("Desenvolvedor React\nRequisitos: React, TypeScript e Git.")
    page.get_by_label("Título da vaga").fill("Desenvolvedor React — Estágio")
    page.get_by_role("button", name="Analisar compatibilidade").click()
    page.wait_for_selector(".match-card__score", timeout=15000)
    score = page.text_content(".match-card__score") or ""
    check(f"score visível ({score.strip()})", "%" in score)
    title = page.text_content(".match-card__title") or ""
    check(f"título editável usado ({title.strip()})", "Estágio" in title)
    shots = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
    os.makedirs(shots, exist_ok=True)
    page.screenshot(path=os.path.join(shots, "match-result.png"))
    print("shot: match-result.png")

    browser.close()

if failures:
    print("FALHAS:", failures)
    sys.exit(1)
print("E2E OK")
