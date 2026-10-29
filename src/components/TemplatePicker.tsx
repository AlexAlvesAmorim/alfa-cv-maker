import { useMemo, useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { FICTIONAL_RESUME } from '../data/fictionalResume';
import { TemplateThumb } from './TemplateThumb';
import { TemplateExampleModal } from './TemplateExampleModal';

interface TemplatePickerProps {
  selected: string;
  disabled: boolean;
  recommended?: string;
  onPick: (value: string) => void;
}

interface ExampleState {
  url: string;
  value: string;
  label: string;
}

const VISIBLE_CARDS = 4;

export function TemplatePicker({ selected, disabled, recommended, onPick }: TemplatePickerProps) {
  const [example, setExample] = useState<ExampleState | null>(null);
  const [showAll, setShowAll] = useState(false);

  const recommendedValue = TEMPLATES.find((template) => template.id === recommended)?.value ?? '';
  const [pending, setPending] = useState(selected || recommendedValue);

  const orderedTemplates = useMemo(() => {
    if (!recommended) return TEMPLATES;
    const index = TEMPLATES.findIndex((template) => template.id === recommended);
    if (index <= 0) return TEMPLATES;
    const copy = [...TEMPLATES];
    const [first] = copy.splice(index, 1);
    return [first, ...copy];
  }, [recommended]);

  const pendingTemplate = TEMPLATES.find((template) => template.value === pending);
  const pendingIsAts = pendingTemplate ? pendingTemplate.kind === 'ats' : true;

  // Build the recommended reason based on user profile
  const recommendedReason = recommended
    ? TEMPLATES.find((t) => t.id === recommended)?.atsNote
      ? 'Mais criativo, pode falhar em alguns filtros ATS'
      : 'Passa nos filtros automáticos (Gupy, Kenoby) ✓'
    : '';

  async function openExample(value: string, label: string) {
    const { buildResumePdf } = await import('../utils/pdfExport');
    const url = URL.createObjectURL(buildResumePdf({ ...FICTIONAL_RESUME, layout: value }));
    setExample((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { url, value, label };
    });
  }

  function closeExample() {
    if (example) URL.revokeObjectURL(example.url);
    setExample(null);
  }

  function useExample() {
    const value = example?.value;
    closeExample();
    if (value) onPick(value);
  }

  return (
    <>
      <div className="template-picker" role="group" aria-label="Modelos de currículo">
        {/* Primary choice: two clear options in human language */}
        <div className="template-picker__primary">
          {recommended && (
            <div className={`template-card template-card--primary ${pending === recommendedValue ? 'template-card--selected' : ''} ${TEMPLATES.find((t) => t.id === recommended)?.kind === 'ats' ? 'template-card--ats' : 'template-card--visual'}`}>
              <span aria-hidden="true" className={`template-card__kind ${TEMPLATES.find((t) => t.id === recommended)?.kind === 'ats' ? 'template-card__kind--ats' : 'template-card__kind--visual'}`}>
                {TEMPLATES.find((t) => t.id === recommended)?.kind === 'ats' ? 'Passa nos filtros automáticos' : 'Mais criativo'}
              </span>
              {!pending && (
                <span aria-hidden="true" className="template-card__badge template-card__badge--recommended">
                  ★ Recomendado
                </span>
              )}
              <button
                type="button"
                aria-pressed={pending === recommendedValue}
                disabled={disabled}
                className="template-card__select"
                aria-label={`Modelo ${TEMPLATES.find((t) => t.id === recommended)?.label}${recommendedReason ? ` — ${recommendedReason}` : ''}${pending === recommendedValue ? ' — escolhido' : ''}`}
                onClick={() => setPending(recommendedValue)}
              >
                <span className="template-card__thumb" aria-hidden="true">
                  <TemplateThumb id={recommended} />
                </span>
                <span className="template-card__label">{TEMPLATES.find((t) => t.id === recommended)?.label}</span>
                <span className="template-card__desc template-card__desc--reason">{recommendedReason}</span>
              </button>
            </div>
          )}
          {/* Alternative option: the other axis */}
          <div className={`template-card template-card--primary ${pending === (orderedTemplates[1]?.value || '') ? 'template-card--selected' : ''} ${orderedTemplates[1]?.kind === 'ats' ? 'template-card--ats' : 'template-card--visual'}`}>
            <span aria-hidden="true" className={`template-card__kind ${orderedTemplates[1]?.kind === 'ats' ? 'template-card__kind--ats' : 'template-card__kind--visual'}`}>
              {orderedTemplates[1]?.kind === 'ats' ? 'Passa nos filtros automáticos' : 'Mais criativo'}
            </span>
            <button
              type="button"
              aria-pressed={pending === orderedTemplates[1]?.value}
              disabled={disabled}
              className="template-card__select"
              aria-label={`Modelo ${orderedTemplates[1]?.label}${orderedTemplates[1]?.kind === 'ats' ? ' — passa nos robôs de triagem' : ' — visual, pode falhar em alguns filtros'}${pending === orderedTemplates[1]?.value ? ' — escolhido' : ''}`}
              onClick={() => orderedTemplates[1] && setPending(orderedTemplates[1].value)}
            >
              <span className="template-card__thumb" aria-hidden="true">
                {orderedTemplates[1] && <TemplateThumb id={orderedTemplates[1].id} />}
              </span>
              <span className="template-card__label">{orderedTemplates[1]?.label}</span>
              <span className="template-card__desc template-card__desc--reason">
                {orderedTemplates[1]?.kind === 'ats' ? 'Passa nos robôs de triagem (Gupy, Kenoby) ✓' : 'Visual bonito — pode falhar em alguns filtros'}
              </span>
            </button>
          </div>
        </div>

        {/* "Ver todos" link */}
        {orderedTemplates.length > 2 && (
          <button
            type="button"
            className="chip chip--more template-picker__expand"
            onClick={() => setShowAll(true)}
          >
            Ver todos os modelos ({orderedTemplates.length}) ↓
          </button>
        )}

        {/* Full grid when expanded */}
        {showAll && (
          <div className="template-picker__grid">
            {orderedTemplates.slice(2).map((template) => {
              const isSelected = pending === template.value;
              const isAts = template.kind === 'ats';
              return (
                <div
                  key={template.id}
                  className={`template-card ${isSelected ? 'template-card--selected' : ''} ${isAts ? 'template-card--ats' : 'template-card--visual'}`}
                  title={template.atsNote ?? undefined}
                >
                  <span aria-hidden="true" className={`template-card__kind ${isAts ? 'template-card__kind--ats' : 'template-card__kind--visual'}`}>
                    {isAts ? 'ATS ✓' : 'Visual'}
                  </span>
                  {isSelected && <span aria-hidden="true" className="template-card__badge">Escolhido</span>}
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={disabled}
                    className="template-card__select"
                    aria-label={`Modelo ${template.label}${isSelected ? ' — escolhido' : ''} — ${isAts ? 'passa em robôs de triagem ATS' : 'visual, pode falhar no robô de triagem'}`}
                    onClick={() => setPending(template.value)}
                  >
                    <span className="template-card__thumb" aria-hidden="true">
                      <TemplateThumb id={template.id} />
                    </span>
                    <span className="template-card__label">{template.label}</span>
                    <span className="template-card__desc">{template.description}{template.atsNote ? ` — ${template.atsNote}` : ''}</span>
                  </button>
                  <button
                    type="button"
                    className="template-card__example"
                    disabled={disabled}
                    onClick={() => void openExample(template.value, template.label)}
                  >
                    Ver exemplo preenchido
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showAll && orderedTemplates.length > VISIBLE_CARDS && (
          <button
            type="button"
            className="chip chip--more template-picker__expand"
            onClick={() => setShowAll(false)}
          >
            Ver menos modelos ↑
          </button>
        )}
      </div>
      <div className="template-continue">
        <button
          type="button"
          className="btn btn--primary template-continue__btn"
          disabled={disabled || pending === ''}
          onClick={() => {
            if (pending !== '') onPick(pending);
          }}
        >
          {pendingTemplate ? `Usar ${pendingTemplate.label}` : 'Escolha um modelo acima'}
        </button>
        {pendingTemplate && (
          <p className="template-continue__note">
            {pendingIsAts ? 'Passa nos robôs de triagem (Gupy, Kenoby) ✓' : 'Visual bonito — pode falhar em alguns filtros'}
            <span className="template-continue__hint"> — dá para trocar depois no painel final</span>
          </p>
        )}
      </div>
      {example && (
        <TemplateExampleModal
          url={example.url}
          label={example.label}
          onUse={useExample}
          onClose={closeExample}
        />
      )}
    </>
  );
}
