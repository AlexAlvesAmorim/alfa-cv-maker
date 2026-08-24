import type { ChatStep } from '../types';

export const WELCOME_MESSAGE =
  'Bem-vindo ao Alfa Curriculum Maker! Eu sou o assistente que vai montar o seu currículo. '
  + 'É só conversar comigo: eu faço as perguntas, sugiro alternativas prontas com base nas suas respostas e, '
  + 'no final, você baixa o currículo em PDF ou DOCX no modelo que escolher.';

export const STEPS: ChatStep[] = [
  {
    id: 'fullName',
    question: 'Pra começar: qual é o seu nome completo? (só o nome, sem "meu nome é")',
    placeholder: 'Digite seu nome completo...',
    suggestions: ['Maria Oliveira Santos', 'João Pedro Almeida'],
  },
  {
    id: 'layout',
    question:
      'Escolha o modelo do seu currículo — são 7, cada um com um objetivo:\n\n'
      + '• Clássico: Curriculum Vitae tradicional para áreas formais\n'
      + '• ATS: padrão para robôs de triagem de RH\n'
      + '• XYZ: padrão Google, conquistas medidas\n'
      + '• Moderno: barra lateral com sua foto\n'
      + '• Executivo: faixa escura com foto, visual sênior\n'
      + '• Clean: elegante, serif com foto\n'
      + '• Minimal: duas colunas sóbrias',
    placeholder: 'Escolha um modelo abaixo...',
    suggestions: [
      'Clássico (Curriculum Vitae tradicional)',
      'ATS (padrão para robôs de RH)',
      'XYZ (padrão Google)',
      'Moderno (barra lateral com foto)',
      'Executivo (faixa escura com foto)',
      'Clean (elegante, serif com foto)',
      'Minimal (duas colunas sóbrias)',
    ],
  },
  {
    id: 'contact',
    question:
      'Agora seus dados de contato — eles aparecem logo abaixo do nome, nesta ordem:\ntelefone | e-mail | cidade/endereço | LinkedIn\n\nSepare com barras ( | ), por favor.',
    placeholder: 'Ex.: (11) 98888-7777 | maria@email.com | São Paulo/SP | linkedin.com/in/maria',
    suggestions: ['(11) 98888-7777 | maria@email.com | São Paulo/SP'],
  },
  {
    id: 'experiences',
    question:
      'Vamos às experiências! Preencha o formulário abaixo (cargo, empresa, período e conquista).\n\n'
      + 'Dica de ouro — fórmula XYZ do Google: na conquista, escreva "Conquistei [resultado], medido por [número], fazendo [ação]".',
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
    suggestions: ['Inglês intermediário', 'Espanhol básico', 'Pular esta etapa'],
  },
  {
    id: 'photo',
    question:
      'Quer adicionar uma foto? Eu removo o fundo automaticamente e enquadro no formato 3x4 (padrão para currículos).\n\n'
      + 'Dica: posicione o rosto centralizado, como numa foto 3x4 de documento. '
      + 'Ela entra na barra lateral do modelo Moderno.',
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
