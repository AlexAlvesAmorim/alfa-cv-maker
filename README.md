# Alfa CV Maker — monte seu currículo conversando com o assistente

![CI](https://github.com/AlexAlvesAmorim/alfa-cv-maker/actions/workflows/ci.yml/badge.svg)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Testes-Vitest-729b1b?logo=vitest&logoColor=white)

Assistente conversacional que monta o currículo completo de forma guiada: faz as perguntas,
sugere alternativas prontas com base no seu perfil e entrega o documento em **PDF e DOCX**.
Depois da montagem, o **Alfa Match** compara seu currículo com uma vaga real e mostra o
alinhamento ATS palavra por palavra — tudo 100% no navegador, sem cadastro e sem servidor.

> Parte do ecossistema [Dev de Favela Hub](https://github.com/AlexAlvesAmorim/EuAlexDev-Hub-Project)
> · Projeto irmão: [ALFA PDF Reader](https://github.com/AlexAlvesAmorim/AlfaPDF)

---

## 📖 Sobre

Quem nunca fez currículo ou não atualiza há anos trava no formato, no que escrever e no medo
do filtro ATS. O Alfa CV Maker resolve isso como um chat: cada etapa é uma mini-consultoria
de carreira (pergunta + exemplos prontos + dica de ouro), e o documento cresce visível a cada
resposta — com prévia ao vivo, rascunho automático e exportação profissional no final.

- 💬 **Fluxo guiado em 9 etapas:** nome → contato → experiências → template → cargo objetivo → resumo → formação → habilidades → idiomas → foto (opcional)
- 🤖 **Sugestões dinâmicas locais** (`src/data/dynamicSuggestions.ts`): geradas do seu perfil, sem chamada de IA externa
- 🎯 **Alfa Match (ATS client-side):** cole a descrição da vaga e receba score 0–100, zonas de requisitos/diferenciais e palavras faltantes
- 📄 **7 templates em PDF e DOCX:** render via `pdfExport.ts` + `docxExport.ts`, com modelo de barra lateral para foto
- 📸 **Foto 3x4 com IA no navegador:** remoção de fundo via `@imgly/background-removal`, nada sai do seu PC
- 📥 **Importação:** envie um PDF (`pdfjs-dist`) ou DOCX (`mammoth`) existente para pré-preencher
- 💾 **Rascunho automático:** `localStorage` com migração v2→v3 — feche e retome de onde parou
- ♿ **Acessibilidade:** skip-link, `role="log"` no chat, foco gerenciado, zoom 200% sem quebra

---

## ✨ Recursos principais

| | |
|---|---|
| 💬 Chat com typing indicator | Respostas com delay proporcional ao tamanho, sem travar o fluxo |
| 🃏 Suggestion chips | Alternativas prontas por etapa + extras colapsáveis |
| 🖼️ Prévia ao vivo | PDF regenerado com debounce enquanto você digita (a partir da etapa 4) |
| 📝 Formulários dedicados | Experiências (múltiplas), contato e foto 3x4 fora do input livre |
| ✅ Validação real | `FIELD_CONSTRAINTS` em `src/types.ts` — limite de caracteres e padrões por campo |
| ↩️ Voltar / editar / recomeçar | Navegação por etapa, edição direto do painel final, restart com limpeza |
| 🔍 Alfa Match standalone | Modo independente de análise de vaga, com atualização do currículo a partir dos gaps |

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + TypeScript + Vite 8 |
| Estilo | CSS modular (`App.css` + `index.css`), sem framework pesado |
| PDF / DOCX | `jspdf`, `docx`, `pdfjs-dist`, `mammoth` |
| Foto IA | `@imgly/background-removal` (client-side) |
| Estado | React hooks (`useState`/`useRef`/`useEffect`), `localStorage` |
| Qualidade | Vitest + Testing Library (`src/**/*.test.ts`), oxlint, `tsc -b` |

### Estrutura

```
src/
├── App.tsx               # máquina do chat (steps, draft, preview, import)
├── types.ts              # ResumeData, FIELD_CONSTRAINTS, EMPTY_RESUME
├── data/steps.ts         # as 9 etapas (perguntas, placeholders, sugestões)
├── data/dynamicSuggestions.ts  # sugestões contextuais por perfil
├── data/templates.ts     # os 7 modelos + recomendação por perfil
├── components/           # ChatMessage, ChatInput, ExperienceForm, ContactForm,
│                         # PhotoUpload, TemplatePicker, SummaryCard, AlfaMatch...
├── utils/pdfExport.ts    # render PDF  |  utils/docxExport.ts  # render DOCX
├── utils/resumeImport.ts # import PDF/DOCX  |  utils/photo.ts  # foto 3x4
└── *.test.ts             # 6 suítes (ats, import, suggestions, content, jobUrl)
```

---

## 🚀 Rodando local

```bash
npm install
npm run dev      # http://localhost:5175
npm run build    # tsc -b + vite build → dist/
npm run preview  # serve o build de produção
npm test         # vitest run (6 suítes)
npm run lint     # oxlint
```

Requisitos: Node 20+. Nenhuma variável de ambiente, nenhum backend.

---

## 🧪 Testes e CI

- `npm test` — 6 arquivos (`App`, `atsAnalyzer`, `dynamicSuggestions`, `jobUrl`, `resumeContent`, `resumeImport`)
- CI (`.github/workflows/ci.yml`): `npm ci` → `lint` → `test` → `build` em push/PR para `master`

---

## 🗺️ Roadmap

- [ ] Quebrar `App.tsx` em hooks (`useChat`, `useDraft`, `useLivePreview`)
- [ ] Fechar gaps WCAG 2.1 AA do critique (foco ao remover experiência, badge acessível, input multilinha)
- [ ] Cobertura de testes dos exports PDF/DOCX
- [ ] Deploy demo estático + link na About do repo

---

Feito com ♥ e café por **Alex Alves Amorim** — [GitHub](https://github.com/AlexAlvesAmorim) · [LinkedIn](https://linkedin.com/in/alex-a-amorim)
