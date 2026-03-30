export const RANDOM_NAMES = [
  'Tala',
  'Sinag',
  'Aninag',
  'Alingawngaw',
  'Isang Tinig',
  'Anino'
];

export const getRandomName = (seed?: string) => {
  if (!seed) return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  
  // Deterministic random based on seed (e.g. thought ID or memory ID)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return RANDOM_NAMES[Math.abs(hash) % RANDOM_NAMES.length];
};
