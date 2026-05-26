export const THEME_STORAGE_KEY = 'mr_express_theme';

export const THEMES = {
  'carbon-mint': {
    id: 'carbon-mint',
    name: 'Carbon Mint',
    bg: '#121212',
    card: '#1e1e1e',
    accent: '#00FFC2',
    accentGradient: null,
    accentText: '#121212',
    text: '#FFFFFF',
    textMuted: '#B0B0B0',
    border: 'rgba(255,255,255,0.1)',
    swatches: ['#121212', '#1e1e1e', '#00FFC2'],
  },
  'digital-peach': {
    id: 'digital-peach',
    name: 'Digital Peach',
    bg: '#FFFFFF',
    card: '#F8F9FA',
    accent: '#FF7E5F',
    accentGradient: null,
    accentText: '#FFFFFF',
    text: '#2D3436',
    textMuted: '#636E72',
    border: 'rgba(45,52,54,0.08)',
    swatches: ['#FFFFFF', '#F8F9FA', '#FF7E5F'],
  },
  'cyber-purple': {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    bg: '#0B001A',
    card: '#160033',
    accent: '#E94057',
    accentGradient: 'linear-gradient(135deg, #8A2387 0%, #E94057 100%)',
    accentText: '#FFFFFF',
    text: '#F5F0FF',
    textMuted: '#C4B5FD',
    border: 'rgba(138,35,135,0.35)',
    swatches: ['#0B001A', '#160033', '#8A2387', '#E94057'],
  },
  'neo-earthy': {
    id: 'neo-earthy',
    name: 'Neo-Earthy',
    bg: '#E8ECE9',
    card: '#FFFFFF',
    accent: '#4A5D4E',
    accentGradient: null,
    accentText: '#FFFFFF',
    text: '#2C3531',
    textMuted: '#5C6B62',
    border: 'rgba(74,93,78,0.15)',
    swatches: ['#E8ECE9', '#FFFFFF', '#4A5D4E'],
  },
};

export const DEFAULT_THEME_ID = 'digital-peach';

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID];
}

export function applyThemeToDocument(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-card', theme.card);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty(
    '--theme-accent-gradient',
    theme.accentGradient || theme.accent
  );
  root.style.setProperty('--theme-accent-text', theme.accentText);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--theme-icon-bg', `${theme.accent}22`);
}
