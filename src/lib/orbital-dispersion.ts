import { useMemo } from 'react';
import { UserProfile } from '../contexts/AuthContext';

export interface DispersedUser extends UserProfile {
  originalX?: number;
  originalY?: number;
  originalLat?: number;
  originalLng?: number;
  isDispersed: boolean;
  groupSize: number;
}

/**
 * Groups users by proximity and applies orbital dispersion to overlapping stars.
 * Supports both MapCanvas (x, y) and EarthMap (lat, lng) coordinate systems.
 */
export const getDispersedUsers = (
  users: UserProfile[],
  scale: number, // For MapCanvas, this is the zoom scale. For EarthMap, this can be 2^zoom.
  isLatLong: boolean = false,
  baseRadius: number = 40
): DispersedUser[] => {
  if (!users || users.length === 0) return [];

  // Stable sort by UID to ensure consistent orbital positions
  const sortedUsers = [...users].sort((a, b) => a.uid.localeCompare(b.uid));

  const groups: Map<string, UserProfile[]> = new Map();
  
  // Dynamic threshold based on zoom/scale
  // For MapCanvas: 5 pixels on screen
  // For EarthMap: roughly 0.0001 degrees at high zoom
  const proximityThreshold = isLatLong 
    ? 0.0001 * (18 / scale) // Adjust threshold based on Leaflet zoom level (scale here would be zoom level)
    : 5 / scale;

  sortedUsers.forEach(user => {
    let key = "";
    if (isLatLong && user.location) {
      const gridLat = Math.round(user.location.lat / proximityThreshold) * proximityThreshold;
      const gridLng = Math.round(user.location.lng / proximityThreshold) * proximityThreshold;
      key = `${gridLat},${gridLng}`;
    } else {
      const gridX = Math.round(user.x / proximityThreshold) * proximityThreshold;
      const gridY = Math.round(user.y / proximityThreshold) * proximityThreshold;
      key = `${gridX},${gridY}`;
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(user);
  });

  const dispersedUsers: DispersedUser[] = [];

  groups.forEach((groupUsers, key) => {
    const [centerA, centerB] = key.split(',').map(Number);
    const N = groupUsers.length;

    if (N === 1) {
      const u = groupUsers[0];
      dispersedUsers.push({
        ...u,
        originalX: u.x,
        originalY: u.y,
        originalLat: u.location?.lat,
        originalLng: u.location?.lng,
        isDispersed: false,
        groupSize: 1
      });
    } else {
      // Apply orbital dispersion
      // radiusBase is in world units. 
      // For MapCanvas, 40 units is roughly 40 pixels at scale 1.
      // For EarthMap, we need a much smaller value in degrees.
      const radiusBase = isLatLong ? 0.0005 * (18 / scale) : baseRadius;
      const radius = radiusBase + (N * (isLatLong ? 0.0001 : 5));
      const angleStep = (2 * Math.PI) / N;

      groupUsers.forEach((u, index) => {
        const angle = index * angleStep;
        
        if (isLatLong && u.location) {
          const newLat = centerA + radius * Math.cos(angle);
          const newLng = centerB + radius * Math.sin(angle);
          dispersedUsers.push({
            ...u,
            location: { ...u.location, lat: newLat, lng: newLng },
            originalLat: centerA,
            originalLng: centerB,
            isDispersed: true,
            groupSize: N
          });
        } else {
          const newX = centerA + radius * Math.cos(angle);
          const newY = centerB + radius * Math.sin(angle);
          dispersedUsers.push({
            ...u,
            x: newX,
            y: newY,
            originalX: centerA,
            originalY: centerB,
            isDispersed: true,
            groupSize: N
          });
        }
      });
    }
  });

  return dispersedUsers;
};

/**
 * Custom hook for orbital dispersion.
 */
export const useDispersedStars = (
  users: UserProfile[],
  scale: number,
  isLatLong: boolean = false
) => {
  return useMemo(() => {
    return getDispersedUsers(users, scale, isLatLong);
  }, [users, scale, isLatLong]);
};
