import { TEMPLATES } from '../data/templates';
import { TemplateThumb } from './TemplateThumb';

interface TemplatePickerProps {
  selected: string;
  disabled: boolean;
  onPick: (value: string) => void;
}

export function TemplatePicker({ selected, disabled, onPick }: TemplatePickerProps) {
  return (
    <div className="template-picker" role="listbox" aria-label="Modelos de currículo">
      {TEMPLATES.map((template) => {
        const isSelected = selected === template.value;
        return (
          <button
            key={template.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`template-card ${isSelected ? 'template-card--selected' : ''}`}
            disabled={disabled}
            onClick={() => onPick(template.value)}
          >
            <span className="template-card__thumb">
              <TemplateThumb id={template.id} />
              {isSelected && <span className="template-card__badge">Escolhido</span>}
            </span>
            <span className="template-card__label">{template.label}</span>
            <span className="template-card__desc">{template.description}</span>
          </button>
        );
      })}
    </div>
  );
}
