import { DEFAULT_THEME, findTheme } from '../components/finance/themes';

const STORAGE_KEY = 'omnipay_theme_v1';

export function getStoredTheme() {
    try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch (_) {
        return DEFAULT_THEME;
    }
}

// Sets data-theme (drives the CSS-variable overrides in finance.css) and
// toggles Tailwind's `dark` class so components using `dark:` utilities
// (e.g. CardProfileModal) follow the same light/dark split as the theme.
export function applyTheme(key) {
    const theme = findTheme(key);
    document.documentElement.setAttribute('data-theme', theme.key);
    document.documentElement.classList.toggle('dark', !!theme.dark);
    try {
        localStorage.setItem(STORAGE_KEY, theme.key);
    } catch (_) { /* private mode */ }
    return theme.key;
}
