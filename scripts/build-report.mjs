#!/usr/bin/env node
/** Relatório de Evolução do Alfa Curriculum Maker → docs/relatorio-alfa.pdf
 *
 *  Usa o jspdf que o projeto já tem (zero dependência nova).
 *  Uso: npm run report
 *
 *  Estrutura:
 *    1. Capa + sumário executivo
 *    2. Linha do tempo (todos os commits, comentados)
 *    3. Capítulos por frente de trabalho (narrativa densa)
 *    4. Apêndices: matriz de modelos, tokens dos temas, testes,
 *       diffs completos, listagens de código, dependências, índice remissivo
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'relatorio-alfa.pdf');

function sh(cmd, maxBuffer = 64 * 1024 * 1024) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', maxBuffer });
}

/* jspdf standard fonts falam WinAnsi: troca o que não existe lá. */
const SANITIZE = new Map([
  ['✓', '[ok]'], ['✕', '[x]'], ['✗', '[x]'], ['→', '->'], ['←', '<-'],
  ['↓', 'v'], ['↑', '^'], ['↩', '<-'], ['…', '...'], ['‘', "'"], ['’', "'"],
  ['“', '"'], ['”', '"'], ['–', '-'], ['✔', '[ok]'], ['●', '*'], ['○', 'o'],
  ['▪', '-'], ['◦', '-'], ['✓'.normalize('NFC'), '[ok]'],
]);
function clean(text) {
  let out = String(text ?? '').replace(/\t/g, '  ');
  for (const [from, to] of SANITIZE) out = out.split(from).join(to);
  // Qualquer codepoint fora do WinAnsi vira '?', nunca quebra o PDF.
  // eslint-disable-next-line no-control-regex — \x09\x0A\x0D (tab/LF/CR) são intencionais aqui.
  return out.replace(/[^\x09\x0A\x0D\x20-\u024F\u2013\u2014\u2018-\u201E\u2022\u2026\u2039\u203A\u20AC]/g, '?');
}

/* ---------------- layout ---------------- */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
doc.setProperties({
  title: 'Alfa Curriculum Maker — Relatório de Evolução Completo',
  author: 'Alex Alves Amorim',
  subject: 'Histórico completo de evolução do projeto',
  keywords: 'curriculo, ats, release, report',
});

let y = 0;
const chapterPages = [];

function newPage() {
  if (doc.getNumberOfPages() === 1 && y === 0) {
    y = MARGIN;
    return;
  }
  doc.addPage();
  y = MARGIN;
}

function ensure(needed) {
  if (y + needed > PAGE_H - MARGIN) newPage();
}

function chapter(title) {
  if (chapterPages.length > 0) {
    console.log(`  .. ${chapterPages.length} capítulos, pág atual ${doc.getNumberOfPages()}`);
  }
  newPage();
  chapterPages.push({ title, page: doc.getNumberOfPages() });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(138, 15, 30);
  ensure(16);
  const lines = doc.splitTextToSize(clean(title), CONTENT_W);
  doc.text(lines, MARGIN, y + 8);
  y += lines.length * 9 + 4;
  doc.setDrawColor(138, 15, 30);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 8;
}

function h3(title) {
  ensure(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(clean(title), CONTENT_W);
  doc.text(lines, MARGIN, y + 5);
  y += lines.length * 5.5 + 2;
}

function p(text, { size = 10, gap = 2.2 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(clean(text), CONTENT_W);
  const lh = size * 0.48;
  for (const line of lines) {
    ensure(lh + 1);
    doc.text(line, MARGIN, y + 4);
    y += lh;
  }
  y += gap;
}

function bullets(items, { size = 10 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(30, 30, 30);
  const lh = size * 0.48;
  for (const item of items) {
    const lines = doc.splitTextToSize(clean(item), CONTENT_W - 6);
    for (let i = 0; i < lines.length; i += 1) {
      ensure(lh + 1);
      doc.text(i === 0 ? `- ${lines[i]}` : `  ${lines[i]}`, MARGIN + 2, y + 4);
      y += lh;
    }
  }
  y += 2.5;
}

function codeBlock(text, { size = 7.2 } = {}) {
  const lh = size * 0.52;
  doc.setFont('courier', 'normal');
  doc.setFontSize(size);
  for (const rawLine of clean(text).split('\n')) {
    const wrapped = doc.splitTextToSize(rawLine.length > 0 ? rawLine : ' ', CONTENT_W - 4);
    for (const line of wrapped) {
      ensure(lh + 0.6);
      doc.setFillColor(244, 244, 242);
      doc.rect(MARGIN, y - 0.5, CONTENT_W, lh + 0.6, 'F');
      doc.setTextColor(25, 25, 25);
      doc.text(line, MARGIN + 2, y + 3.4);
      y += lh + 0.6;
    }
  }
  y += 3;
}

function table(headers, rows, { size = 8.5, widths = null } = {}) {
  const cols = headers.length;
  const colW = widths ?? Array.from({ length: cols }, () => CONTENT_W / cols);
  const lh = size * 0.52;
  const drawRow = (cells, bold, fill) => {
    const wrapped = cells.map((c, i) => doc.splitTextToSize(clean(c), colW[i] - 3));
    const height = Math.max(...wrapped.map((w) => w.length)) * (lh + 1.5) + 2;
    ensure(height + 1);
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(MARGIN, y, CONTENT_W, height, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(25, 25, 25);
    let x = MARGIN;
    wrapped.forEach((lines, i) => {
      lines.forEach((line, li) => doc.text(line, x + 1.5, y + 4 + li * (lh + 1.5)));
      x += colW[i];
    });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + height, MARGIN + CONTENT_W, y + height);
    y += height;
  };
  drawRow(headers, true, [232, 228, 222]);
  rows.forEach((row, i) => drawRow(row, false, i % 2 === 0 ? null : [246, 246, 244]));
  y += 3;
}

/* ---------------- dados do repo ---------------- */

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const today = new Date().toISOString().slice(0, 10);

const commits = sh('git log --reverse --pretty=format:%H%x1f%ad%x1f%an%x1f%s --date=short')
  .trim()
  .split('\n')
  .map((line) => {
    const [hash, date, author, subject] = line.split('\x1f');
    return { hash, date, author, subject };
  });

function testCases(file) {
  const src = fs.readFileSync(path.join(ROOT, 'src', file), 'utf-8');
  const cases = [];
  const re = /(?:describe|it|test)\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) cases.push(m[1]);
  return cases;
}

function themeTokens() {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf-8');
  const blocks = {};
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  blocks[':root (Sangue)'] = rootMatch ? rootMatch[1] : '';
  for (const m of css.matchAll(/\[data-theme='([^']+)'\]\s*\{([\s\S]*?)\n\}/g)) {
    blocks[m[1]] = m[2];
  }
  const parse = (body) => {
    const vars = [];
    for (const lm of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars.push([lm[1].trim(), lm[2].trim()]);
    }
    return vars;
  };
  return Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, parse(v)]));
}

/* ---------------- capa ---------------- */

doc.setFont('helvetica', 'bold');
doc.setFontSize(30);
doc.setTextColor(138, 15, 30);
y = 60;
for (const line of doc.splitTextToSize('Alfa Curriculum Maker', CONTENT_W)) {
  doc.text(line, MARGIN, y);
  y += 13;
}
doc.setFontSize(18);
doc.setTextColor(60, 60, 60);
for (const line of doc.splitTextToSize('Relatório de Evolução Completo', CONTENT_W)) {
  doc.text(line, MARGIN, y);
  y += 9;
}
y += 6;
doc.setDrawColor(138, 15, 30);
doc.setLineWidth(1);
doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
y += 12;
doc.setFont('helvetica', 'normal');
doc.setFontSize(12);
doc.setTextColor(40, 40, 40);
for (const line of [
  `Do v1.0.0 à identidade Portal: cada mudança, cada decisão, cada teste.`,
  `Gerado em ${today} · versão ${pkg.version} · ${commits.length} commits no histórico.`,
  `Autor: Alex Alves Amorim · Licença MIT · 100% client-side.`,
]) {
  doc.text(clean(line), MARGIN, y);
  y += 8;
}

/* ---------------- 1. sumário executivo ---------------- */

chapter('1. Sumário executivo');
p('Este relatório documenta a evolução completa do Alfa Curriculum Maker: assistente conversacional que monta currículos em 9 etapas guiadas, exporta em PDF e DOCX em 9 modelos, analisa compatibilidade ATS contra vagas reais (Alfa Match) e roda 100% no navegador, sem cadastro e sem servidor.');
p(`Estado atual: ${commits.length} commits, ${pkg.version === '1.0.0' ? 'versão 1.0.0' : `versão ${pkg.version}`}, suíte de testes unitários mais E2E com Playwright, CI com lint + testes + build + E2E, deploy contínuo no GitHub Pages e PWA instalável com service worker.`);
bullets([
  'Chat guiado em 9 etapas com sugestões dinâmicas locais, prévia ao vivo e rascunho automático.',
  'Alfa Match: score 0-100 por vaga, zonas de requisitos/diferenciais, card de resultado e título de vaga editável.',
  'Exportação PDF (jsPDF, desenho absoluto) e DOCX (docx, tabelas sem borda) com guardrails de paginação testados.',
  'Quatro temas com personalidade própria (Sangue, Portal, Noturno, Papel), transições suaves e modo de fluidez com auto-animate, View Transitions e Motion.',
  'Identidade com Lucide, Space Grotesk, ícones PWA gerados do favicon e zero dependência de theming.',
]);

/* ---------------- 2. linha do tempo ---------------- */

chapter('2. Linha do tempo — todos os commits comentados');
p('Histórico integral do repositório, do mais antigo ao mais recente. Cada entrada traz data, autor, mensagem e estatística de arquivos; os capítulos seguintes detalham as frentes de trabalho.');
for (const c of commits) {
  let stat = '';
  try {
    stat = sh(`git show --stat --oneline ${c.hash}`).split('\n').slice(1).join('\n').trim();
  } catch {
    stat = '(estatística indisponível)';
  }
  h3(`${c.date} · ${c.hash.slice(0, 8)} · ${c.subject} (${c.author})`);
  if (stat) codeBlock(stat, { size: 7 });
}

/* ---------------- 3. capítulos por frente ---------------- */

const CHAPTERS = [
  {
    title: '3. Fundação: chat guiado, exportação e ATS local',
    body: [
      'O núcleo do produto nasceu em três pilares: (1) máquina de chat por etapas com rascunho em localStorage e migração de versão; (2) renderizadores PDF e DOCX por modelo, com sanitização WinAnsi para o jsPDF; (3) analisador ATS puramente local com stopwords em PT/EN, dicionário de stacks, zoneamento de requisitos/diferenciais e escore ponderado.',
      'Decisões estruturantes: nenhum backend e nenhuma chamada de IA externa — tudo computado no navegador, o que viabiliza o discurso de privacidade e o deploy estático. Templates como dados (data/templates.ts) com recomendação por perfil, e seções como dados (buildSections) compartilhadas entre PDF e DOCX.',
      'Arquivos centrais: src/App.tsx e hooks (useChatBot, useDraft, useLivePreview), src/utils/pdfExport.ts, src/utils/docxExport.ts, src/utils/atsAnalyzer.ts, src/utils/resumeContent.ts, src/utils/resumeImport.ts.',
    ],
  },
  {
    title: '4. Estética do Match: do veredito técnico ao card de resultado',
    body: [
      'Pedido: a área de match deveria parecer um card de vaga — título, percentual em destaque, barra fina, seção de pontos fortes e seção de impeditivos. O relatório antigo (AtsReport) mostrava apenas veredito e chips de termos ausentes.',
      'Implementação: novo componente MatchCard (título + score + barra + duas seções com ícones) e helpers em utils/matchCard.ts — inferJobTitle e inferJobSubtitle extraem título e contexto da descrição, matchedBullets prioriza requisitos, blockerBullets combina senioridade com requisitos em falta, scopeTitle adapta o cabeçalho ao score.',
      'O AtsReport virou envoltório: card em cima, detalhes por palavra-chave em <details> embaixo. Ligado nos dois pontos de análise (AlfaMatch standalone e painel do SummaryCard).',
    ],
  },
  {
    title: '5. Contras honestos: só o que a vaga pediu e falta',
    body: [
      'Problema real flagrado em print: impeditivos com ruído — idade da empresa ("15 anos"), níveis contraditórios ("júnior" + "sênior") e bigramas de prosa ("using react", "backend solutions") vindos da apresentação institucional, não dos requisitos.',
      'Correções no atsAnalyzer: cabeçalhos em inglês passam a zonear (Requirements/Responsibilities/Benefits), âncoras de seção ignorada/general corrigidas, anos de experiência exigem qualificador ("3 anos de experiência", "5 years of experience"), stopwords EN de prosa (using, modern, solutions, cutting), supressão de unigramas só para compostos sólidos (dois TECH ou dois ROLE_EDU) e descarte de bigramas cuja substância o currículo já cobre via unigramas.',
      'Regra final dos contras (blockerBullets): só requisitos em falta + senioridade; sem seção de requisitos, cai para stacks e diferenciais — nunca prosa geral. Níveis contraditórios se anulam nos contras e seguem visíveis nos detalhes.',
    ],
  },
  {
    title: '6. Engine de temas: quatro identidades, zero dependência',
    body: [
      'Levantamento de bibliotecas (@klh-app/theme, react-easy-theme, vartheme, daisyUI, MUI/Chakra) concluiu que nenhuma pagava o custo: o app já tematizava por variáveis CSS, que é exatamente o padrão dessas libs. Engine própria em src/theme (themes.ts, context.ts, ThemeContext.tsx, useTheme.ts), ~80 linhas.',
      'Mecanismo: ThemeProvider com persistência em localStorage (alfa-theme), atributo data-theme no <html>, sincronia entre abas via storage event, color-scheme e theme-color por tema, script pré-tinta no index.html contra flash, e seletor ThemePicker no Header com selo bicolor.',
      'Correção de contraste medida por script (WCAG AA): rótulos on-bright/on-blood/on-success por tema — botões reprovavam em 3 dos 4 temas antes. Cores chapadas com matiz fixo (vermelhos em sombras, palcos, vidros) viraram 12 variáveis por tema.',
      'A opção Sistema foi removida a pedido: no SO escuro ela resolvia sempre para Sangue e parecia duplicada. Migração automática de valores antigos (ocean para noturno, forest/system para blood).',
    ],
  },
  {
    title: '7. Restyle Portal/Noturno e remoção da menção de marca',
    body: [
      'Os temas genéricos Oceano e Floresta foram substituídos por dois temas com referência de cores de portal de vagas (azul Denim #1250C4 e rosa #DE0059): Portal claro (cards brancos, CTA azul, raios generosos 10/14/20) e Noturno navy (#060d1f, azul vibrante, rosa neon, glow presente). Sangue intacto como referência; Papel com cantos editoriais.',
      'Cada tema ganhou personalidade além do matiz: escala de raios própria, intensidade de glow, palco de impressão e textura de dots por tema. Raios vivem nas mesmas variáveis (--radius-sm/md/lg), então o App.css reagiu sem mudanças.',
      'A pedido, todas as menções nominais à marca de referência foram removidas de código e UI (tagline "Claro, CTA azul vibrante"); restaram apenas os valores de cor. Menções funcionais a sites de vagas nos textos de ajuda foram mantidas por serem exemplos, não identidade.',
    ],
  },
  {
    title: '8. Identidade: Lucide, Space Grotesk e Motion',
    body: [
      'Pesquisa de bibliotecas concluiu: lucide-react (ícones consistentes com tree-shaking) e motion (sucessora do framer-motion, compatível com React 19) valiam a dependência; Tailwind/daisyUI/shadcn/MUI exigiriam reescrever o CSS à toa. Fonte display trocada de Archivo para Space Grotesk (fallback offline intacto).',
      'Troca sistemática: emojis e SVGs avulsos por Lucide com tamanhos preservados (X, ArrowLeft, SendHorizontal, CornerDownLeft, Check, CircleCheck, TriangleAlert, FileText, Maximize2), currentColor herdando o tema, regra svg.lucide no CSS.',
      'Motion com MotionConfig reducedMotion="user": entrada com spring nos dois modais, menu do seletor de temas, card final do assistente; AnimatePresence com exit em todos os pontos de montagem condicional.',
    ],
  },
  {
    title: '9. Competências em colunas nos modelos',
    body: [
      'Pedido: skills partidas em colunas para melhor escaneabilidade e menos páginas. Mapeamento completo dos 9 modelos nos dois exportadores.',
      'Resultado: DOCX ganhou helper skillsTable (tabela sem bordas, 3 colunas; 2 na lateral do Minimal) aplicado a Clássico, AtsDev, XYZ, Clean, Minimal e Referência. PDF já tinha drawColumns em Clássico/AtsDev/XYZ; Referência migrou de bullets rotulados para 3 colunas; Clean foi avaliado e REVERTIDO de propósito — medição mostrou parágrafo com 22mm contra 39mm em colunas, e o guardrail de 2 páginas do importado longo confirmou a regressão.',
      'Preservados lineares: Ats (PDF e DOCX) e laterais estreitas (Canva/Executivo/Minimal-PDF), por segurança ATS e largura insuficiente. Testes com mammoth garantem que nenhuma skill se perde nas tabelas.',
    ],
  },
  {
    title: '10. PWA instalável e deploy contínuo',
    body: [
      'Deploy: og:url + canonical finais, workflow deploy.yml (testa, builda e publica no GitHub Pages) e job de E2E no CI contra o build de produção. Falta apenas ativar Pages no repositório (Settings → Pages → GitHub Actions).',
      'PWA: vite-plugin-pwa em modo generateSW (precache + Google Fonts em cache com Workbox), manifest com caminhos relativos (o absoluto quebrava em subpath) e três ícones PNG gerados do próprio favicon via screenshot em Chromium (192, 512 e maskable com respiro de 80%). Build confirma sw.js, workbox e ícones no dist.',
    ],
  },
  {
    title: '11. Fluidez: auto-animate, View Transitions e saídas',
    body: [
      'Três frentes aprovadas: (1) @formkit/auto-animate (~3KB) nas listas — mensagens do chat, chips, experiências e steps do modal; refs combinadas com useCallback estável após um loop infinito pego em teste (React 19 chama ref inline a cada render). (2) View Transitions API nativa via helper withViewTransition na troca chat/match e nas etapas, com fallback e respeito a reduced-motion. (3) AnimatePresence/exit em todos os modais e no dropdown de temas.',
      'Bundle principal subiu cerca de 4,5KB gzip no total. Testes dedicados para o helper (com/sem API, com/sem reduced-motion).',
    ],
  },
  {
    title: '12. Correções de ambiente e robustez',
    body: [
      'Sessão com debug premiado: um npm install interrompido corrompeu binários nativos (rolldown, pdfjs-dist, oxlint, testing-library, lightningcss) — reparo cirúrgico pacote a pacote nas versões travadas do lockfile, sem reinstalar tudo.',
      'Caça ao servidor Vite órfão segurando a porta 5175 e servindo bundle obsoleto (falso-positivo de bug no título editável): provado via fiber do React e pelo módulo transformado servido, processo identificado e encerrado; E2E passou 100% em servidor fresco.',
      'Título da vaga editável no Alfa Match e no painel do SummaryCard (vazio = inferência automática). Ajustes de tipos do docx v9 (AlignmentType como união de literais) e API do mammoth no Node (Buffer em vez de arrayBuffer).',
    ],
  },
];

for (const ch of CHAPTERS) {
  chapter(ch.title);
  for (const para of ch.body) p(para);
}

/* ---------------- apêndices ---------------- */

chapter('Apêndice A — matriz de modelos × competências');
p('Como cada um dos 9 modelos renderiza a seção de Habilidades/Competências após as mudanças da sessão:');
table(
  ['Modelo', 'PDF', 'DOCX', 'Observação'],
  [
    ['Referência', '3 colunas (•)', 'Tabela 3 colunas', 'Padrão; texto integral preservado'],
    ['Clássico', '3 colunas', 'Tabela 3 colunas', 'PDF já usava drawColumns'],
    ['ATS', 'Parágrafo linear', 'Parágrafo linear', 'ATS-safe: sem colunas/tabela'],
    ['ATS Dev', '3 colunas', 'Tabela 3 colunas', 'PDF já usava drawColumns'],
    ['XYZ', '3 colunas', 'Tabela 3 colunas', 'PDF já usava drawColumns'],
    ['Canva', 'Lateral corrida', 'Sidebar corrida', 'Coluna estreita: colunas não cabem'],
    ['Executivo', 'Lateral corrida', 'Sidebar corrida', 'Coluna estreita: colunas não cabem'],
    ['Clean', 'Parágrafo corrido', 'Tabela 3 colunas', 'PDF revertido: colunas somavam altura'],
    ['Minimal', 'Lateral corrida', 'Tabela 2 colunas', 'Lateral estreita; só no DOCX'],
  ],
  { widths: [32, 48, 48, 52] },
);

chapter('Apêndice B — tokens dos 4 temas');
p('Todas as variáveis de cor e raio por tema, extraídas do src/index.css. O :root equivale ao Sangue.');
{
  const tokens = themeTokens();
  const names = Object.keys(tokens);
  const allVars = [];
  for (const vars of Object.values(tokens)) {
    for (const [name] of vars) {
      if (!allVars.includes(name)) allVars.push(name);
    }
  }
  const byName = Object.fromEntries(
    Object.entries(tokens).map(([theme, vars]) => [theme, Object.fromEntries(vars)]),
  );
  const rows = allVars.map((v) => [v, ...names.map((n) => byName[n][v] ?? '—')]);
  const nameHeaders = names.map((n) => n.replace(':root (Sangue)', 'Sangue').replace("[data-theme='", '').replace("']", ''));
  table(['Variável', ...nameHeaders], rows, {
    size: 7,
    widths: [52, ...names.map(() => (CONTENT_W - 52) / names.length)],
  });
}

chapter('Apêndice C — suíte de testes');
p('Todos os casos automatizados por arquivo (vitest + Testing Library + Playwright E2E).');
{
  const files = fs
    .readdirSync(path.join(ROOT, 'src'))
    .filter((f) => /\.test\.(ts|tsx)$/.test(f))
    .sort();
  for (const file of files) {
    h3(file);
    const cases = testCases(file);
    if (cases.length === 0) {
      p('(nenhum caso nomeado extraído)');
    } else {
      bullets(cases.map((c) => (c.length > 140 ? `${c.slice(0, 140)}…` : c)), { size: 8.5 });
    }
  }
  h3('e2e/ (Playwright, fora do vitest)');
  bullets(
    [
      'e2e_smoke.py — boas-vindas, avanço de etapa, Alfa Match com score e título editável.',
      'theme_shots.py — screenshots dos 4 temas para revisão visual.',
      'make_icons.py — gera icons/192, 512 e maskable a partir do favicon.svg.',
    ],
    { size: 8.5 },
  );
}

chapter('Apêndice D — diffs completos por commit');
p('Diff unificado integral de cada commit do histórico, do mais antigo ao mais recente. É a fonte primária deste relatório.');
/* Caminhos sem valor de produto (skill vendorada que entrou e saiu, lockfile). */
const DIFF_EXCLUDES = ['":!package-lock.json"', '":!.claude/*"', '":!.agents/*"', '":!skills-lock.json"'].join(' ');
const LIST_EXCLUDES = [':!package-lock.json', ':!.claude/*', ':!.agents/*', ':!skills-lock.json'].join(' ');

for (const c of commits) {
  console.log(`diff ${c.hash.slice(0, 8)} (${c.subject.slice(0, 40)})`);
  let patch = '';
  try {
    patch = sh(`git show --format= --no-ext-diff --unified=2 ${c.hash} -- . ${DIFF_EXCLUDES}`);
  } catch {
    patch = '(diff indisponível)';
  }
  if (patch.trim().length === 0) {
    h3(`${c.date} · ${c.hash.slice(0, 8)} · ${c.subject} (sem diff textual)`);
    continue;
  }
  h3(`${c.date} · ${c.hash.slice(0, 8)} · ${c.subject}`);
  codeBlock(patch, { size: 6.5 });
}

chapter('Apêndice E — listagens de código');
p('Conteúdo integral dos arquivos criados ou alterados na sessão de evolução (ordem alfabética). Arquivos de build, lockfile e binários ficam de fora.');
{
  const changed = new Set();
  try {
    const names = sh(`git log --reverse --pretty=format: --name-only ${commits[0].hash}..HEAD -- . ${LIST_EXCLUDES} ":!dist/*"`);
    for (const n of names.split('\n')) {
      const t = n.trim();
      if (t) changed.add(t);
    }
  } catch {
    // segue com lista manual mínima
  }
  try {
    // Arquivos novos ainda não commitados (deploy, e2e, este gerador...).
    const untracked = sh('git status --porcelain')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('??'))
      .map((l) => l.slice(3).trim());
    for (const u of untracked) {
      if (!/^(e2e\/shots|node_modules|dist)\//.test(u)) changed.add(u);
    }
  } catch {
    // segue só com o histórico
  }
  const files = [...changed]
    .filter((f) => /\.(ts|tsx|css|html|yml|json|py|mjs)$/.test(f) && !f.includes('node_modules'))
    .sort();
  for (const file of files) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.size > 400 * 1024) continue;
    const content = fs.readFileSync(abs, 'utf-8');
    if (content.includes('\0')) continue;
    h3(`${file} (${content.split('\n').length} linhas)`);
    codeBlock(content, { size: 6.5 });
  }
}

chapter('Apêndice F — dependências e scripts');
p('Retrato fiel do package.json: o que roda o produto e com o que ele é verificado.');
{
  const deps = Object.entries(pkg.dependencies ?? {});
  const devDeps = Object.entries(pkg.devDependencies ?? {});
  h3('dependencies');
  table(['Pacote', 'Versão'], deps.map(([k, v]) => [k, String(v)]), { widths: [110, 68] });
  h3('devDependencies');
  table(['Pacote', 'Versão'], devDeps.map(([k, v]) => [k, String(v)]), { widths: [110, 68] });
  h3('scripts');
  table(['Script', 'Comando'], Object.entries(pkg.scripts ?? {}).map(([k, v]) => [k, String(v)]), {
    widths: [52, 126],
  });
}

/* ---------------- índice remissivo + rodapés ---------------- */

chapter('Índice remissivo');
p('Capítulos e a página onde começam:');
table(
  ['Capítulo', 'Página'],
  chapterPages.map((c) => [c.title, String(c.page)]),
  { widths: [140, 38] },
);

const total = doc.getNumberOfPages();
for (let i = 1; i <= total; i += 1) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Alfa Curriculum Maker — Relatório de Evolução · pág ${i} de ${total} · ${today}`, MARGIN, PAGE_H - 8);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.save(OUT);
const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`OK: ${OUT} — ${total} páginas, ${sizeKb} KB`);
