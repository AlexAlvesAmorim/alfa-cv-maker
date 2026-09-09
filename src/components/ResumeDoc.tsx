import type { ResumeData } from '../types';

interface ResumeDocProps {
  resume: ResumeData;
  finished: boolean;
}

interface DocItem {
  label: string;
  done: (resume: ResumeData) => boolean;
}

const ITEMS: DocItem[] = [
  { label: 'Nome', done: (resume) => resume.fullName.trim() !== '' },
  { label: 'Contato', done: (resume) => resume.contact.trim() !== '' },
  { label: 'Experiências', done: (resume) => resume.experiences.length > 0 },
  { label: 'Objetivo', done: (resume) => resume.targetRole.trim() !== '' },
  { label: 'Resumo', done: (resume) => resume.summary.trim() !== '' },
  { label: 'Modelo', done: (resume) => resume.layout.trim() !== '' },
  { label: 'Formação', done: (resume) => resume.education.trim() !== '' },
  { label: 'Habilidades', done: (resume) => resume.skills.trim() !== '' },
  { label: 'Idiomas', done: (resume) => resume.languages.trim() !== '' },
  { label: 'Foto 3x4', done: (resume) => resume.photo.trim() !== '' },
];

export function ResumeDoc({ resume, finished }: ResumeDocProps) {
  const doneCount = ITEMS.filter((item) => item.done(resume)).length;
  const displayName = resume.fullName.trim() === '' ? 'Seu nome aqui' : resume.fullName.trim();

  return (
    <aside className="doc-rail" aria-label="Seu currículo em construção">
      <div className="doc-sheet" aria-hidden="true">
        <p className="doc-sheet__name">{displayName}</p>
        <p className="doc-sheet__role">{resume.targetRole.trim() === '' ? 'Seu objetivo' : resume.targetRole.trim()}</p>
        <span className="doc-sheet__rule" />
        <div className="doc-sheet__lines" key={doneCount}>
          {ITEMS.slice(0, Math.max(doneCount, 1)).map((item, index) => (
            <span
              key={item.label}
              className="doc-sheet__line"
              style={{ width: `${96 - ((index * 37) % 34)}%` }}
            />
          ))}
        </div>
        {finished && <span className="doc-sheet__stamp">Pronto ✓</span>}
      </div>
      <ul className="doc-list">
        {ITEMS.map((item) => {
          const done = item.done(resume);
          return (
            <li key={item.label} className={`doc-item ${done ? 'doc-item--done' : ''}`}>
              <span className="doc-item__check" aria-hidden="true">
                {done ? (
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6.5 4.8 9 10 3" />
                  </svg>
                ) : null}
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
      <p className="doc-count" role="status">
        {finished ? 'Currículo completo — hora de baixar' : `${doneCount} de ${ITEMS.length} seções prontas`}
      </p>
    </aside>
  );
}
