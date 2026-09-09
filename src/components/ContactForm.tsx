import { useId, useState } from 'react';
import { classifyContactPart, contactParts } from '../utils/resumeContent';

interface ContactFormProps {
  initial: string;
  disabled: boolean;
  onSave: (contact: string) => void;
}

interface ContactDraft {
  phone: string;
  email: string;
  city: string;
  linkedin: string;
}

function draftFromContact(contact: string): ContactDraft {
  const draft: ContactDraft = { phone: '', email: '', city: '', linkedin: '' };
  for (const part of contactParts(contact)) {
    const kind = classifyContactPart(part);
    if (kind === 'phone' && !draft.phone) draft.phone = part;
    else if (kind === 'email' && !draft.email) draft.email = part;
    else if (kind === 'link' && !draft.linkedin) draft.linkedin = part;
    else if (!draft.city) draft.city = part;
  }
  return draft;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({ initial, disabled, onSave }: ContactFormProps) {
  const [draft, setDraft] = useState<ContactDraft>(() => draftFromContact(initial));
  const [touched, setTouched] = useState(false);
  const formId = useId();

  const hasPhone = draft.phone.trim() !== '';
  const hasEmail = draft.email.trim() !== '';
  const anyFilled = hasPhone || hasEmail || draft.city.trim() !== '' || draft.linkedin.trim() !== '';
  const emailInvalid = hasEmail && !EMAIL_PATTERN.test(draft.email.trim());
  const missingCore = anyFilled && !hasPhone && !hasEmail;

  function update(field: keyof ContactDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    setTouched(true);
    if (emailInvalid) return;
    const parts = [draft.phone, draft.email, draft.city, draft.linkedin]
      .map((value) => value.trim())
      .filter(Boolean);
    onSave(parts.join(' | '));
  }

  return (
    <div className="exp-form contact-form">
      <div className="exp-form__grid">
        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={`${formId}-phone`}>
            Telefone / WhatsApp
          </label>
          <input
            id={`${formId}-phone`}
            className="exp-form__input"
            placeholder="(11) 98888-7777"
            type="tel"
            autoComplete="tel"
            autoFocus
            value={draft.phone}
            disabled={disabled}
            onChange={(event) => update('phone', event.target.value)}
          />
        </div>
        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={`${formId}-email`}>
            E-mail
          </label>
          <input
            id={`${formId}-email`}
            className="exp-form__input"
            placeholder="maria@email.com"
            type="email"
            autoComplete="email"
            value={draft.email}
            disabled={disabled}
            aria-invalid={touched && emailInvalid}
            aria-describedby={touched && emailInvalid ? `${formId}-email-error` : undefined}
            onChange={(event) => update('email', event.target.value)}
          />
          {touched && emailInvalid && (
            <span className="contact-form__error" id={`${formId}-email-error`} role="alert">
              Confira o e-mail: parece que faltou algo (ex.: nome@dominio.com).
            </span>
          )}
        </div>
        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={`${formId}-city`}>
            Cidade/UF
          </label>
          <input
            id={`${formId}-city`}
            className="exp-form__input"
            placeholder="São Paulo/SP"
            autoComplete="address-level2"
            value={draft.city}
            disabled={disabled}
            onChange={(event) => update('city', event.target.value)}
          />
        </div>
        <div className="contact-form__field">
          <label className="contact-form__label" htmlFor={`${formId}-linkedin`}>
            LinkedIn (opcional)
          </label>
          <input
            id={`${formId}-linkedin`}
            className="exp-form__input"
            placeholder="linkedin.com/in/maria"
            inputMode="url"
            value={draft.linkedin}
            disabled={disabled}
            onChange={(event) => update('linkedin', event.target.value)}
          />
        </div>
      </div>
      {touched && missingCore && (
        <span className="contact-form__hint" role="note">
          Sem telefone e sem e-mail, o recrutador não consegue te chamar — vale preencher pelo menos um dos dois.
        </span>
      )}
      <div className="exp-form__actions">
        <button
          type="button"
          className="chip chip--save"
          onClick={save}
          disabled={disabled || !anyFilled || emailInvalid}
        >
          Salvar contato e continuar
        </button>
      </div>
    </div>
  );
}
