export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Manila": { lat: 14.5995, lng: 120.9842 },
  "Baliwag": { lat: 14.9547, lng: 120.8960 },
  "Valenzuela": { lat: 14.7011, lng: 120.9830 },
  "Bulacan": { lat: 14.7942, lng: 120.8799 },
  "Quezon City": { lat: 14.6760, lng: 121.0437 },
  "Makati": { lat: 14.5547, lng: 121.0244 },
  "Cebu City": { lat: 10.3157, lng: 123.8854 },
  "Davao City": { lat: 7.1907, lng: 125.4553 },
};

export const DEFAULT_COORDINATES = { lat: 14.5995, lng: 120.9842 }; // Manila fallback

export const getCityOffset = () => (Math.random() - 0.5) * 0.01;

export const getCityBaseCoordinates = (city?: string) => {
  if (city && CITY_COORDINATES[city]) {
    return CITY_COORDINATES[city];
  }
  return DEFAULT_COORDINATES;
};
