// Curated theme presets. Each key maps to a `:root[data-theme="key"]` block
// in finance.css that overrides the CSS custom properties the whole finance
// UI is built on (--bg-page, --bg-card, --primary, --text-*, etc.) — so
// picking a theme here reskins the app without touching component code.
export const THEMES = [
    { key: 'default',  label: 'Default',   dark: false, swatchBg: '#F7F8FA', swatchCard: '#FFFFFF', swatchAccent: '#5B5BF5' },
    { key: 'ocean',    label: 'Ocean',     dark: false, swatchBg: '#F0F7FF', swatchCard: '#FFFFFF', swatchAccent: '#0A84FF' },
    { key: 'sunset',   label: 'Sunset',    dark: false, swatchBg: '#FFF6F0', swatchCard: '#FFFFFF', swatchAccent: '#FF7849' },
    { key: 'forest',   label: 'Forest',    dark: false, swatchBg: '#F1F9F3', swatchCard: '#FFFFFF', swatchAccent: '#1AA260' },
    { key: 'rose',     label: 'Rose',      dark: false, swatchBg: '#FFF1F6', swatchCard: '#FFFFFF', swatchAccent: '#DB2777' },
    { key: 'mint',     label: 'Mint',      dark: false, swatchBg: '#EFFBF8', swatchCard: '#FFFFFF', swatchAccent: '#0D9488' },
    { key: 'sand',     label: 'Sand',      dark: false, swatchBg: '#FBF6EC', swatchCard: '#FFFFFF', swatchAccent: '#B45309' },
    { key: 'slate',    label: 'Slate',     dark: false, swatchBg: '#F2F4F7', swatchCard: '#FFFFFF', swatchAccent: '#475569' },
    { key: 'violet',   label: 'Violet',    dark: false, swatchBg: '#F6F2FF', swatchCard: '#FFFFFF', swatchAccent: '#7C3AED' },
    { key: 'midnight', label: 'Midnight',  dark: true,  swatchBg: '#10182B', swatchCard: '#182338', swatchAccent: '#5EA1FF' },
    { key: 'graphite', label: 'Graphite',  dark: true,  swatchBg: '#1C1C1F', swatchCard: '#232327', swatchAccent: '#22D3EE' },
    { key: 'carbon',   label: 'Carbon',    dark: true,  swatchBg: '#101012', swatchCard: '#18181B', swatchAccent: '#FBBF24' },
    { key: 'plum',     label: 'Plum',      dark: true,  swatchBg: '#241833', swatchCard: '#2E1E40', swatchAccent: '#E879F9' },
    { key: 'highContrast', label: 'High Contrast', dark: true, swatchBg: '#000000', swatchCard: '#111111', swatchAccent: '#FFD000' },
];

export const DEFAULT_THEME = 'default';

export const findTheme = (key) => THEMES.find((t) => t.key === key) || THEMES[0];
