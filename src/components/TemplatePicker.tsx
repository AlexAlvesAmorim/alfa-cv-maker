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

  const orderedTemplates = useMemo(() => {
    if (!recommended) return TEMPLATES;
    const index = TEMPLATES.findIndex((template) => template.id === recommended);
    if (index <= 0) return TEMPLATES;
    const copy = [...TEMPLATES];
    const [first] = copy.splice(index, 1);
    return [first, ...copy];
  }, [recommended]);

  const visibleTemplates = showAll ? orderedTemplates : orderedTemplates.slice(0, VISIBLE_CARDS);

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
        {visibleTemplates.map((template) => {
          const isSelected = selected === template.value;
          const isRecommended = recommended === template.id;
          return (
            <div
              key={template.id}
              className={`template-card ${isSelected ? 'template-card--selected' : ''} ${isRecommended ? 'template-card--recommended' : ''}`}
            >
              {isSelected && <span className="template-card__badge">Escolhido</span>}
              {!isSelected && isRecommended && (
                <span className="template-card__badge template-card__badge--recommended">
                  Recomendado para você
                </span>
              )}
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                className="template-card__select"
                onClick={() => onPick(template.value)}
              >
                <span className="template-card__thumb" aria-hidden="true">
                  <TemplateThumb id={template.id} />
                </span>
                <span className="template-card__label">{template.label}</span>
                <span className="template-card__desc">{template.description}</span>
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
        {!showAll && orderedTemplates.length > VISIBLE_CARDS && (
          <button
            type="button"
            className="chip chip--more template-picker__expand"
            onClick={() => setShowAll(true)}
          >
            Ver todos os modelos ({orderedTemplates.length}) ↓
          </button>
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
