import type { ResumeData } from '../types';

export const FICTIONAL_RESUME: ResumeData = {
  fullName: 'Ana Beatriz Ferreira',
  targetRole: 'Desenvolvedora Front-end Júnior',
  layout: '',
  contact: '(11) 97654-3210 | ana.ferreira@email.com | São Paulo/SP | linkedin.com/in/anabferreira',
  summary:
    'Desenvolvedora front-end júnior com foco em React e TypeScript. Já entreguei interfaces responsivas em projetos acadêmicos e freelas, com atenção especial a acessibilidade e performance. Busco minha primeira oportunidade em um time que valorize código limpo e aprendizado contínuo.',
  experiences: [
    {
      role: 'Estagiária de Front-end',
      company: 'Tech Alfa',
      period: '2024-2025',
      achievement: 'Reduzi o tempo de carregamento do painel em 35%, otimizando componentes e imagens',
    },
    {
      role: 'Freelancer Web',
      company: 'Autônoma',
      period: '2023-2024',
      achievement: 'Entreguei 8 sites institucionais responsivos para pequenos negócios locais',
    },
  ],
  education: 'Análise e Desenvolvimento de Sistemas — Faculdade Alfa (cursando 4º semestre)',
  skills: 'React, TypeScript, Git, CSS, Figma, Acessibilidade, Trabalho em equipe',
  languages: 'Inglês intermediário',
  photo: '',
  photoCircle: '',
  accentColor: '',
};
