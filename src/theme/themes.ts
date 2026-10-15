/** Temas avançados do app — sem biblioteca externa.
 *
 * O app inteiro consome `var(--...)` (ver `index.css`), então trocar de tema
 * é só trocar os valores das variáveis via `[data-theme="..."]`. Os nomes com
 * "red" são históricos (slots de destaque) — em outros temas guardam azul,
 * verde etc. Semânticos (`--success`, `--error`, `--warning`) mantêm o matiz
 * em todos os temas, só ajustam contraste (claro x escuro).
 */

export type ThemeId = 'blood' | 'portal' | 'noturno' | 'paper';

export interface ThemeMeta {
  id: ThemeId;
  /** Nome curto no seletor. */
  name: string;
  /** Uma linha de descrição. */
  tagline: string;
  /** [fundo, destaque] para o selo de cor do seletor. */
  swatch: [string, string];
  dark: boolean;
}

export const THEMES: ThemeMeta[] = [
  { id: 'blood', name: 'Sangue', tagline: 'Vermelho escuro original', swatch: ['#0e0407', '#c1121f'], dark: true },
  { id: 'portal', name: 'Portal', tagline: 'Claro, CTA azul vibrante', swatch: ['#eaf0f9', '#1250c4'], dark: false },
  { id: 'noturno', name: 'Noturno', tagline: 'Portal navy com rosa neon', swatch: ['#060d1f', '#4d8dff'], dark: true },
  { id: 'paper', name: 'Papel', tagline: 'Quente, papel e tinta', swatch: ['#f4efe6', '#c1121f'], dark: false },
];

/** Valores aposentados → para onde migra quem tinha salvo. */
const RETIRED_THEME_MAP: Record<string, ThemeId> = {
  ocean: 'noturno',
  forest: 'blood',
  system: 'blood',
};

export const DEFAULT_THEME: ThemeId = 'blood';

export const THEME_STORAGE_KEY = 'alfa-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function migrateThemeId(value: unknown): ThemeId | null {
  if (isThemeId(value)) return value;
  if (typeof value === 'string' && RETIRED_THEME_MAP[value]) {
    return RETIRED_THEME_MAP[value];
  }
  return null;
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
