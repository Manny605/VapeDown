export const THEMES = [
  {
    id: 'emerald',
    label: 'Émeraude',
    bg: '#050805',
    accent: '#10D980',
    card: '#0c160e',
  },
  {
    id: 'violet',
    label: 'Violet',
    bg: '#050508',
    accent: '#7C6AF7',
    card: '#0D1B2E',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bg: '#080504',
    accent: '#FB923C',
    card: '#1a0d07',
  },
  {
    id: 'arctic',
    label: 'Arctic',
    bg: '#040809',
    accent: '#22D3EE',
    card: '#081520',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    bg: '#080405',
    accent: '#F87171',
    card: '#180a0a',
  },
  {
    id: 'light',
    label: 'Clair',
    bg: '#f5f7f5',
    accent: '#059669',
    card: '#ffffff',
  },
];

export function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id || 'emerald');
  localStorage.setItem('vapedown-theme', id || 'emerald');
}

export function getStoredTheme() {
  return localStorage.getItem('vapedown-theme') || 'emerald';
}
