import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from './theme/ThemeContext';
import { useTheme } from './theme/useTheme';
import { THEME_STORAGE_KEY, isThemeId, migrateThemeId, themeMeta } from './theme/themes';
import { ThemePicker } from './components/ThemePicker';

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current">{theme}</span>
      <button type="button" onClick={() => setTheme('noturno')}>
        go-noturno
      </button>
    </div>
  );
}

describe('theme engine', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('começa no Sangue quando não há nada salvo', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current')).toHaveTextContent('blood');
    expect(document.documentElement.getAttribute('data-theme')).toBe('blood');
  });

  it('lê o tema salvo e ignora valor inválido', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'noturno');
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current')).toHaveTextContent('noturno');
    unmount();

    localStorage.setItem(THEME_STORAGE_KEY, 'neon-hacker');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current')).toHaveTextContent('blood');
  });

  it('migra valores aposentados (ocean, forest, system)', () => {
    expect(migrateThemeId('ocean')).toBe('noturno');
    expect(migrateThemeId('forest')).toBe('blood');
    expect(migrateThemeId('system')).toBe('blood');
    expect(migrateThemeId('portal')).toBe('portal');
    expect(migrateThemeId('neon')).toBeNull();

    localStorage.setItem(THEME_STORAGE_KEY, 'ocean');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current')).toHaveTextContent('noturno');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('noturno');
  });

  it('trocar persiste e marca data-theme + color-scheme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByText('go-noturno'));
    expect(screen.getByTestId('current')).toHaveTextContent('noturno');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('noturno');
    expect(document.documentElement.getAttribute('data-theme')).toBe('noturno');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('sincroniza entre abas via storage event', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent(
      window,
      new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'paper' }),
    );
    expect(screen.getByTestId('current')).toHaveTextContent('paper');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('helpers cobrem os 4 temas', () => {
    expect(isThemeId('portal')).toBe(true);
    expect(isThemeId('ocean')).toBe(false);
    expect(isThemeId('neon')).toBe(false);
    expect(themeMeta('paper').name).toBe('Papel');
  });
});

describe('ThemePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('lista os 4 temas e troca ao clicar', () => {
    render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /tema atual/i }));
    for (const name of ['Sangue', 'Portal', 'Noturno', 'Papel']) {
      expect(
        screen.getByRole('option', { name: new RegExp(`^${name}`) }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByRole('option', { name: /^sistema/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /^noturno/i }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('noturno');
    expect(screen.getByRole('button', { name: /tema atual: noturno/i })).toBeInTheDocument();
  });
});
