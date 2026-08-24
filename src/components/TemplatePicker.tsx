import { useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { FICTIONAL_RESUME } from '../data/fictionalResume';
import { TemplateThumb } from './TemplateThumb';
import { TemplateExampleModal } from './TemplateExampleModal';

interface TemplatePickerProps {
  selected: string;
  disabled: boolean;
  onPick: (value: string) => void;
}

interface ExampleState {
  url: string;
  value: string;
  label: string;
}

export function TemplatePicker({ selected, disabled, onPick }: TemplatePickerProps) {
  const [example, setExample] = useState<ExampleState | null>(null);

  async function openExample(value: string, label: string) {
    const { buildResumePdf } = await import('../utils/pdfExport');
    const url = URL.createObjectURL(buildResumePdf({ ...FICTIONAL_RESUME, layout: value }));
    setExample({ url, value, label });
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
      <div className="template-picker" role="listbox" aria-label="Modelos de currículo">
        {TEMPLATES.map((template) => {
          const isSelected = selected === template.value;
          return (
            <div
              key={template.id}
              className={`template-card ${isSelected ? 'template-card--selected' : ''}`}
            >
              <button
                type="button"
                className="template-card__thumb"
                disabled={disabled}
                onClick={() => void openExample(template.value, template.label)}
                aria-label={`Ver exemplo preenchido do modelo ${template.label}`}
                title="Ver exemplo preenchido"
              >
                <TemplateThumb id={template.id} />
                <span className="template-card__zoom">Ver exemplo preenchido</span>
              </button>
              {isSelected && <span className="template-card__badge">Escolhido</span>}
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className="template-card__select"
                disabled={disabled}
                onClick={() => onPick(template.value)}
              >
                <span className="template-card__label">{template.label}</span>
                <span className="template-card__desc">{template.description}</span>
              </button>
            </div>
          );
        })}
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
