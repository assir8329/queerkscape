export const VIBES = [
  { id: 'hard-masc', label: 'Hard Masc', color: '#2563eb' }, // Blue
  { id: 'soft-masc', label: 'Soft Masc', color: '#7dd3fc' }, // Sky
  { id: 'androgynous', label: 'Androgynous', color: '#a855f7' }, // Purple
  { id: 'femme', label: 'Femme', color: '#ec4899' }, // Pink
  { id: 'hyper-femme', label: 'Hyper Femme', color: '#be185d' }, // Dark Pink
  { id: 'stem', label: 'Stem', color: '#10b981' }, // Emerald
  { id: 'butch', label: 'Butch', color: '#f97316' }, // Orange
];

export const getHexColor = (color: string) => {
  if (color.startsWith('#')) return color;
  const map: Record<string, string> = {
    purple: '#a855f7',
    pink: '#ec4899',
    blue: '#3b82f6',
    cyan: '#06b6d4',
    yellow: '#facc15',
  };
  return map[color] || '#a855f7';
};
