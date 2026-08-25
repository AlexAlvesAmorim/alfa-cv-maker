import { useState } from 'react';
import type { Experience } from '../types';

interface ExperienceFormProps {
  initial: Experience[];
  disabled: boolean;
  onSave: (experiences: Experience[]) => void;
}

const EMPTY_FIELD: Experience = { role: '', company: '', period: '', achievement: '' };

export function ExperienceForm({ initial, disabled, onSave }: ExperienceFormProps) {
  const [list, setList] = useState<Experience[]>(initial);
  const [draft, setDraft] = useState<Experience>(EMPTY_FIELD);

  const draftIsFilled = draft.role.trim() !== '' || draft.company.trim() !== '';

  function updateDraft(field: keyof Experience, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addExperience() {
    if (!draftIsFilled) return;
    setList((current) => [
      ...current,
      {
        role: draft.role.trim(),
        company: draft.company.trim(),
        period: draft.period.trim(),
        achievement: draft.achievement.trim(),
      },
    ]);
    setDraft(EMPTY_FIELD);
  }

  function saveAndContinue() {
    const merged = draftIsFilled
      ? [
          ...list,
          {
            role: draft.role.trim(),
            company: draft.company.trim(),
            period: draft.period.trim(),
            achievement: draft.achievement.trim(),
          },
        ]
      : list;
    onSave(merged);
  }

  function removeExperience(index: number) {
    setList((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="exp-form">
      <div className="exp-form__grid">
        <input
          className="exp-form__input"
          placeholder="Cargo *"
          value={draft.role}
          disabled={disabled}
          onChange={(event) => updateDraft('role', event.target.value)}
          aria-label="Cargo"
        />
        <input
          className="exp-form__input"
          placeholder="Empresa *"
          value={draft.company}
          disabled={disabled}
          onChange={(event) => updateDraft('company', event.target.value)}
          aria-label="Empresa"
        />
        <input
          className="exp-form__input"
          placeholder="Período (ex.: 2023-2025)"
          value={draft.period}
          disabled={disabled}
          onChange={(event) => updateDraft('period', event.target.value)}
          aria-label="Período"
        />
        <input
          className="exp-form__input exp-form__input--wide"
          placeholder="Conquista (fórmula XYZ: resultado medido + ação)"
          value={draft.achievement}
          disabled={disabled}
          onChange={(event) => updateDraft('achievement', event.target.value)}
          aria-label="Conquista"
        />
      </div>
      <div className="exp-form__actions">
        <button type="button" className="chip" onClick={addExperience} disabled={disabled}>
          + Adicionar experiência
        </button>
        {(list.length > 0 || draftIsFilled) && (
          <button
            type="button"
            className="chip chip--save"
            onClick={saveAndContinue}
            disabled={disabled}
          >
            Salvar {list.length + (draftIsFilled ? 1 : 0)} experiência
            {list.length + (draftIsFilled ? 1 : 0) > 1 ? 's' : ''} e continuar
          </button>
        )}
        {list.length === 0 && !draftIsFilled && (
          <button
            type="button"
            className="chip chip--skip"
            onClick={() => onSave([])}
            disabled={disabled}
          >
            Não tenho experiência formal
          </button>
        )}
      </div>
      {list.length > 0 && (
        <ul className="exp-form__list">
          {list.map((experience, index) => (
            <li key={`${experience.role}-${index}`}>
              <span>
                <strong>{experience.role}</strong>
                {experience.company ? ` — ${experience.company}` : ''}
                {experience.period ? ` (${experience.period})` : ''}
                {experience.achievement ? `: ${experience.achievement}` : ''}
              </span>
              <button
                type="button"
                className="exp-form__remove"
                onClick={() => removeExperience(index)}
                disabled={disabled}
                aria-label={`Remover ${experience.role}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
