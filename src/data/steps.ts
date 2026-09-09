import type { ChatStep } from '../types';
import { TEMPLATES } from './templates';

export const WELCOME_MESSAGE =
  'Bem-vindo ao Alfa Curriculum Maker! Eu sou o assistente que vai montar o seu currículo. '
  + 'São 9 passos rapidinhos (uns 5 minutos), grátis e sem cadastro — e se você já tem um currículo pronto, dá para importar o arquivo em vez de digitar tudo. '
  + 'No final, você baixa o currículo em PDF ou DOCX no modelo que escolher.';

export const STEPS: ChatStep[] = [
  {
    id: 'fullName',
    question: 'Pra começar: qual é o seu nome completo?',
    placeholder: 'Ex.: Maria Silva Oliveira...',
    suggestions: [],
  },
  {
    id: 'contact',
    question:
      'Prazer! Agora seus dados de contato — eles aparecem logo abaixo do seu nome no currículo.\n\n'
      + 'Preencha o formulário abaixo: telefone e e-mail são os canais que o recrutador mais usa para chamar.',
    placeholder: 'Use o formulário acima...',
    suggestions: [],
  },
  {
    id: 'experiences',
    question:
      'Vamos às experiências! Preencha o formulário abaixo (cargo, empresa, período e conquista).\n\n'
      + 'Dica de ouro — fórmula XYZ do Google: na conquista, escreva "Conquistei [resultado], medido por [número], fazendo [ação]".\n\n'
      + 'Ex.: Atendente — Padaria Pão Dourado (2023–2025): aumentei a venda de combos em 20% com atendimento consultivo.',
    placeholder: 'Use o formulário acima...',
    suggestions: [],
  },
  {
    id: 'targetRole',
    dynamic: true,
    question:
      'Analisei suas experiências e separei cargos que combinam com o seu perfil. Qual objetivo você quer no currículo?',
    placeholder: 'Ex.: Desenvolvedor Front-end Júnior...',
    suggestions: [],
  },
  {
    id: 'summary',
    dynamic: true,
    question:
      'Com base no seu objetivo e nas suas experiências, preparei resumos prontos. Uma boa estrutura tem 3 partes:\n\n'
      + '1. Cargo ou área de interesse\n'
      + '2. Um diferencial ou competência importante\n'
      + '3. Seu propósito com a vaga\n\n'
      + 'Escolha uma sugestão ou escreva o seu:',
    placeholder: 'Ou digite seu próprio resumo...',
    suggestions: [],
  },
  {
    id: 'layout',
    question:
      'Agora o visual: com base no seu objetivo e experiências, destaquei abaixo o modelo que mais combina com o seu momento.\n\n'
      + 'Dica: selo ATS ✓ = passa em robôs (Gupy/Kenoby), Visual = bonito mas pode falhar no robô. Toque num card para escolher — ou em "Ver exemplo" para espiar antes.',
    placeholder: 'Escolha um modelo acima...',
    suggestions: TEMPLATES.map((template) => template.value),
  },
  {
    id: 'education',
    question: 'E a formação? Curso, instituição e período (ou status: cursando/concluído). Uma por linha.',
    placeholder: 'Ex.: Análise e Desenvolvimento de Sistemas - Faculdade X (cursando 3º semestre)',
    suggestions: ['Análise e Desenvolvimento de Sistemas - 2025 (cursando)', 'Ensino Médio Completo'],
  },
  {
    id: 'skills',
    dynamic: true,
    question:
      'Habilidades! Com base na sua área, sugeri este pacote — pode escolher ou misturar com as suas:',
    placeholder: 'Ex.: React, Git, comunicação, proatividade',
    suggestions: [],
  },
  {
    id: 'languages',
    question: 'Você fala algum idioma além do português?',
    placeholder: 'Ex.: Inglês intermediário',
    optional: true,
    suggestions: ['Inglês intermediário', 'Espanhol básico'],
  },
  {
    id: 'photo',
    question:
      'Quer adicionar uma foto? Eu removo o fundo automaticamente e enquadro no formato 3x4 — foto de documento 3cm×4cm com rosto centralizado.\n\n'
      + 'Dica: use foto frontal com boa luz. Ela entra na barra lateral do modelo Moderno; nos outros modelos aparece no topo. Totalmente opcional.',
    placeholder: 'Use o botão abaixo ou pule esta etapa...',
    optional: true,
    suggestions: [],
  },
];

export const FINISH_MESSAGE =
  'Prontinho! Seu currículo está estruturado e pronto para sair nos dois formatos:\n\n'
  + '• PDF — layout finalizado, pronto para enviar ou imprimir\n'
  + '• DOCX — editável no Word/Google Docs, caso queira ajustar algo\n\n'
  + 'Confira os dados no painel abaixo e baixe no modelo que você escolheu.';

export const PHASES = [
  { name: 'Você', steps: [0, 1] },
  { name: 'Trajetória', steps: [2, 3, 4] },
  { name: 'Modelo', steps: [5] },
  { name: 'Detalhes', steps: [6, 7, 8] },
  { name: 'Foto', steps: [9] },
] as const;

export function phaseForStep(stepIndex: number, finished: boolean): string {
  if (finished) return 'Pronto para enviar';
  const phaseIndex = PHASES.findIndex((phase) => (phase.steps as readonly number[]).includes(stepIndex));
  if (phaseIndex < 0) return `Fase 1 de ${PHASES.length} · Você`;
  return `Fase ${phaseIndex + 1} de ${PHASES.length} · ${PHASES[phaseIndex].name}`;
}
