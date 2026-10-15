import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { themeMeta } from '../theme/themes';

export function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = themeMeta(theme);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <div className="theme-picker" ref={boxRef}>
      <button
        type="button"
        className="header__mode-btn theme-picker__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tema atual: ${current.name}. Trocar tema`}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="theme-picker__dot"
          aria-hidden="true"
          style={{ background: `linear-gradient(135deg, ${current.swatch[0]} 50%, ${current.swatch[1]} 50%)` }}
        />
        <span className="theme-picker__name">{current.name}</span>
      </button>
      <AnimatePresence>
        {open && (
        <motion.ul
          className="theme-picker__menu"
          role="listbox"
          aria-label="Escolher tema do app"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {themes.map((option) => (
            <li key={option.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.id === theme}
                className={`theme-picker__option ${option.id === theme ? 'theme-picker__option--active' : ''}`}
                onClick={() => {
                  setTheme(option.id);
                  setOpen(false);
                }}
              >
                <span
                  className="theme-picker__dot"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${option.swatch[0]} 50%, ${option.swatch[1]} 50%)` }}
                />
                <span className="theme-picker__text">
                  <span className="theme-picker__label">{option.name}</span>
                  <span className="theme-picker__tagline">{option.tagline}</span>
                </span>
                {option.id === theme && (
                  <Check size={13} aria-hidden="true" className="theme-picker__check" />
                )}
              </button>
            </li>
          ))}
        </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
