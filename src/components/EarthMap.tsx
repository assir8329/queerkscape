import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { UserProfile, UnsaidThought, Memory } from '../types';
import { incrementViewCount } from './UnsaidThoughts';
import { MemoryModal } from './MemoryModal';
import { MemoryViewModal } from './MemoryViewModal';
import { RightActionStack } from './RightActionStack';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, MessageSquare, Sparkles, Eye, MapPin } from 'lucide-react';
import { getHexColor } from '../lib/colors';

interface EarthMapProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onUserClick: (user: UserProfile) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  isUiVisible?: boolean;
  onInteraction?: () => void;
}
// ... (rest of the helper functions remain the same)

const regionCenters: Record<string, { lat: number; lng: number; zoom: number }> = {
  "Bulacan": { lat: 14.7942, lng: 120.8799, zoom: 10 },
  "Metro Manila": { lat: 14.5995, lng: 120.9842, zoom: 10 },
  "Philippines": { lat: 12.8797, lng: 121.7740, zoom: 6 },
  "California": { lat: 36.7783, lng: -119.4179, zoom: 6 },
  "New York": { lat: 40.7128, lng: -74.0060, zoom: 10 },
  "London": { lat: 51.5074, lng: -0.1278, zoom: 10 },
  "Tokyo": { lat: 35.6762, lng: 139.6503, zoom: 10 },
  "Sydney": { lat: -33.8688, lng: 151.2093, zoom: 10 },
};

const getTargetLocation = (user?: UserProfile) => {
  if (!user || !user.location || user.hideLocation) return { lat: 20, lng: 0, zoom: 2 };

  const { region, country, lat, lng } = user.location;
  
  if (region && regionCenters[region]) return regionCenters[region];
  if (country && regionCenters[country]) return regionCenters[country];
  
  // Privacy-safe fallback: round to 1 decimal place (~11km accuracy)
  if (lat && lng) {
     return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10, zoom: 8 };
  }

  return { lat: 20, lng: 0, zoom: 2 };
};

// Custom icon for clusters
const createCustomIcon = (color: string, count: number) => {
  const hex = getHexColor(color);
  const size = Math.min(40 + count * 5, 80); // Scale size based on count

  const html = `
    <div style="
      --cluster-color: ${hex};
      width: ${size}px;
      height: ${size}px;
      background-color: ${hex}40;
      border: 2px solid ${hex};
      border-radius: 50%;
      box-shadow: 0 0 15px ${hex}80;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${Math.max(12, size / 3)}px;
      backdrop-filter: blur(4px);
      animation: pulse-cluster 2s infinite;
    ">
      ${count > 1 ? count : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Custom icon for individual stars
const createStarIcon = (color: string) => {
  const hex = getHexColor(color);
  const size = 16; // Small size
  const duration = 1.5 + Math.random() * 2; // 1.5s to 3.5s
  const delay = Math.random() * 3; // 0s to 3s
  const burstDuration = 4 + Math.random() * 4; // 4s to 8s
  const burstDelay = Math.random() * 5; // 0s to 5s

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, ${hex} 0%, ${hex}80 40%, transparent 80%);
        border-radius: 50%;
        box-shadow: 0 0 10px ${hex}, 0 0 20px ${hex}80;
        animation: star-twinkle ${duration}s infinite alternate ease-in-out;
        animation-delay: ${delay}s;
        --star-color: ${hex};
        --star-glow: ${hex}80;
      "></div>
      <div style="
        position: absolute;
        width: 4px;
        height: 4px;
        background: #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 8px #ffffff, 0 0 15px ${hex};
        opacity: 0;
        animation: star-burst ${burstDuration}s infinite ease-in-out;
        animation-delay: ${burstDelay}s;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createThoughtIcon = () => {
  const html = `
    <div style="
      width: 32px;
      height: 32px;
      background-color: rgba(168, 85, 247, 0.2);
      border: 2px solid rgba(168, 85, 247, 0.6);
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a855f7;
      backdrop-filter: blur(4px);
      animation: pulse-thought 3s infinite;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createMemoryIcon = () => {
  const html = `
    <div style="
      width: 24px;
      height: 24px;
      background-color: rgba(234, 179, 8, 0.2);
      border: 2px solid rgba(234, 179, 8, 0.8);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 0 15px rgba(234, 179, 8, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #eab308;
      backdrop-filter: blur(4px);
    ">
      <div style="width: 6px; height: 6px; background: #eab308; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Deterministic pseudo-random number generator based on string
const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
};

const getJitteredPosition = (baseLat: number, baseLng: number, uid: string, zoom: number) => {
  const rand = seededRandom(uid);
  // Jitter should be proportional to zoom to maintain visual distance on screen
  // At higher zoom, we want smaller coordinate offsets to keep stars close to their location
  const spread = 0.04 / Math.pow(2, Math.max(0, zoom - 8));
  const offsetLat = (rand() / 4294967296 - 0.5) * spread;
  const offsetLng = (rand() / 4294967296 - 0.5) * spread;
  return {
    lat: baseLat + offsetLat,
    lng: baseLng + offsetLng
  };
};

interface ClusterData {
  lat: number;
  lng: number;
  users: UserProfile[];
}

const MapContent: React.FC<{
  users: UserProfile[],
  thoughts: UnsaidThought[],
  memories: Memory[],
  showStars: boolean,
  showThoughts: boolean,
  showMemories: boolean,
  isAddingMemory: boolean,
  onUserClick: (user: UserProfile) => void,
  onClusterClick: (cluster: ClusterData) => void,
  onThoughtClick: (thought: UnsaidThought) => void,
  onMemoryClick: (memory: Memory) => void,
  onMapClick: (lat: number, lng: number) => void,
  onInteraction?: () => void
}> = ({ users, thoughts, memories, showStars, showThoughts, showMemories, isAddingMemory, onUserClick, onClusterClick, onThoughtClick, onMemoryClick, onMapClick, onInteraction }) => {
  const [zoom, setZoom] = useState(2);

  useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
      onInteraction?.();
    },
    moveend: () => {
      onInteraction?.();
    },
    click: (e) => {
      if (isAddingMemory) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
      onInteraction?.();
    }
  });

  // Group users by proximity based on zoom level
  const clusters = useMemo(() => {
    const result: ClusterData[] = [];
    // Dynamic distance threshold based on zoom
    // We want roughly 50 pixels of distance for clustering
    // Formula: (pixels * 360) / (256 * 2^zoom)
    const clusterDistance = 50 * 360 / (256 * Math.pow(2, zoom));

    users.forEach(user => {
      if (!user.location || user.hideLocation) return;
      
      const found = result.find(c => {
        const dist = Math.sqrt(
          Math.pow(c.lat - user.location!.lat, 2) + 
          Math.pow(c.lng - user.location!.lng, 2)
        );
        return dist < clusterDistance;
      });

      if (found) {
        found.users.push(user);
      } else {
        result.push({
          lat: user.location.lat,
          lng: user.location.lng,
          users: [user],
        });
      }
    });

    return result;
  }, [users, zoom]);

  return (
    <>
      {showStars && clusters.map((cluster, i) => {
        // If cluster has only one user, render as a star
        if (cluster.users.length === 1) {
          const user = cluster.users[0];
          const pos = getJitteredPosition(user.location!.lat, user.location!.lng, user.uid, zoom);
          
          return (
            <Marker 
              key={`user-${user.uid}`}
              position={[pos.lat, pos.lng]}
              icon={createStarIcon(user.color)}
              eventHandlers={{
                click: () => onUserClick(user)
              }}
            >
              <Popup className="custom-popup">
                <div className="bg-[#1a1a2e] text-white p-3 rounded-lg border border-white/10 shadow-xl min-w-[150px]">
                  <h3 className="font-bold mb-1">{user.nickname || user.username}</h3>
                  {(user.zodiacSign || user.mbti) && (
                    <div className="flex items-center gap-2 text-[10px] text-white/50 mb-1">
                      {user.zodiacSign && <span>♈ {user.zodiacSign}</span>}
                      {user.mbti && <span>🧠 {user.mbti}</span>}
                    </div>
                  )}
                  {user.signal && (
                    <p className="text-sm text-white/80 italic mb-2">"{user.signal}"</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {user.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }

        // Render as a cluster
        const color = cluster.users[0]?.color || 'purple';
        return (
          <Marker 
            key={`cluster-${i}`} 
            position={[cluster.lat, cluster.lng]}
            icon={createCustomIcon(color, cluster.users.length)}
            eventHandlers={{
              click: () => onClusterClick(cluster)
            }}
          />
        );
      })}

      {/* Always render thoughts on top */}
      {showThoughts && thoughts.map((thought) => {
        if (!thought.lat || !thought.lng) return null;
        // Apply jitter offset to avoid overlapping markers
        const pos = getJitteredPosition(thought.lat, thought.lng, thought.id, zoom);
        return (
          <Marker
            key={`thought-${thought.id}`}
            position={[pos.lat, pos.lng]}
            icon={createThoughtIcon()}
            zIndexOffset={1000}
            eventHandlers={{
              click: () => onThoughtClick(thought)
            }}
          >
            <Popup className="custom-popup">
              <div className="bg-[#0a0a1a] text-white p-4 rounded-xl border border-white/10 shadow-2xl min-w-[200px] text-center">
                <p className="text-sm italic leading-relaxed mb-3">"{thought.text}"</p>
                {thought.region && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 mb-2">
                    <MapPin className="w-3 h-3 text-purple-400/60" />
                    <span>{thought.city || thought.region}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${thought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'}`} />
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    {thought.isAnonymous ? 'Anonymous' : 'A Soul'}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Render memories */}
      {showMemories && memories.map((memory) => {
        if (!memory.lat || !memory.lng) return null;
        const pos = getJitteredPosition(memory.lat, memory.lng, memory.id, zoom);
        return (
          <Marker
            key={`memory-${memory.id}`}
            position={[pos.lat, pos.lng]}
            icon={createMemoryIcon()}
            zIndexOffset={500}
            eventHandlers={{
              click: () => onMemoryClick(memory)
            }}
          />
        );
      })}
    </>
  );
};

export const EarthMap: React.FC<EarthMapProps> = ({ users, currentUser, onUserClick, filterTag, setFilterTag, mapMode, setMapMode, isUiVisible = true, onInteraction }) => {
  const [selectedCluster, setSelectedCluster] = useState<ClusterData | null>(null);
  const [expandedThought, setExpandedThought] = useState<UnsaidThought | null>(null);
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  
  // Memory specific state
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [selectedMemoryLocation, setSelectedMemoryLocation] = useState<{lat: number, lng: number, region: string} | null>(null);
  const [viewingMemory, setViewingMemory] = useState<Memory | null>(null);

  // Layer toggles
  const [activeLayers, setActiveLayers] = useState<string[]>(['stars', 'thoughts', 'memories']);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  useEffect(() => {
    const q = query(
      collection(db, 'unsaidThoughts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const thoughtsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UnsaidThought));
        setThoughts(thoughtsData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'unsaidThoughts')
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'memories'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const memoryData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Memory));
        setMemories(memoryData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'memories')
    );
    return () => unsubscribe();
  }, []);

  // Debounce filterTag
  const [debouncedFilter, setDebouncedFilter] = useState(filterTag);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFilter(filterTag), 300);
    return () => clearTimeout(handler);
  }, [filterTag]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (currentUser?.blockedUsers?.includes(u.uid)) return false;
      if (u.blockedUsers?.includes(currentUser?.uid || '')) return false;
      if (filterTag === 'favorites' && !currentUser?.favorites?.includes(u.uid)) return false;
      if (debouncedFilter && debouncedFilter !== 'favorites') {
        const lowerFilter = debouncedFilter.toLowerCase();
        const hasTag = u.tags.some(t => t.toLowerCase().includes(lowerFilter));
        const hasVibe = u.vibe?.toLowerCase().includes(lowerFilter);
        if (!hasTag && !hasVibe) return false;
      }
      return true;
    });
  }, [users, currentUser, debouncedFilter, filterTag]);

  useEffect(() => {
    if (map && currentUser) {
      const target = getTargetLocation(currentUser);
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.5 });
    }
  }, [map, currentUser]);

  const handleCenterOnMe = () => {
    if (map && currentUser) {
      const target = getTargetLocation(currentUser);
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.5 });
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!isAddingMemory) return;
    
    // Reverse geocode to get region
    let region = "Unknown Region";
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
      const data = await response.json();
      if (data && data.address) {
        region = data.address.city || data.address.state || data.address.country || "Unknown Region";
      }
    } catch (error) {
      console.error("Failed to reverse geocode:", error);
    }

    setSelectedMemoryLocation({ lat, lng, region });
    setMemoryModalOpen(true);
    setIsAddingMemory(false);
  };

  const handleMemoryClick = async (memory: Memory) => {
    setViewingMemory(memory);
    
    // Increment view count
    try {
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        viewCount: increment(1)
      });
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`absolute inset-0 z-0 bg-[#050510] overflow-hidden ${isAddingMemory ? 'cursor-crosshair' : ''}`}
    >
      {isAddingMemory && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] glass-dark text-yellow-400 px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse border border-yellow-500/30">
          Tap anywhere on the map to pin a memory
        </div>
      )}

      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        ref={setMap}
        style={{ height: '100%', width: '100%', background: '#050510' }}
        zoomControl={false}
        attributionControl={false}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapContent 
          users={filteredUsers} 
          thoughts={thoughts}
          memories={memories}
          showStars={activeLayers.includes('stars')}
          showThoughts={activeLayers.includes('thoughts')}
          showMemories={activeLayers.includes('memories')}
          isAddingMemory={isAddingMemory}
          onUserClick={onUserClick} 
          onClusterClick={(cluster) => setSelectedCluster(cluster)} 
          onThoughtClick={(t) => {
            setExpandedThought(t);
            incrementViewCount(t.id);
          }}
          onMemoryClick={handleMemoryClick}
          onMapClick={handleMapClick}
          onInteraction={onInteraction}
        />
      </MapContainer>

      {/* Right Action Stack */}
      <RightActionStack 
        onCenterMe={handleCenterOnMe}
        onPinMemory={() => setIsAddingMemory(!isAddingMemory)}
        onToggleLayer={toggleLayer}
        activeLayers={activeLayers}
        mapMode={mapMode}
        setMapMode={setMapMode}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        isVisible={isUiVisible}
      />

      {/* Modals */}
      {selectedMemoryLocation && (
        <MemoryModal
          isOpen={memoryModalOpen}
          onClose={() => {
            setMemoryModalOpen(false);
            setSelectedMemoryLocation(null);
          }}
          currentUser={currentUser}
          lat={selectedMemoryLocation.lat}
          lng={selectedMemoryLocation.lng}
          region={selectedMemoryLocation.region}
        />
      )}

      <MemoryViewModal
        memory={viewingMemory}
        onClose={() => setViewingMemory(null)}
      />

      <AnimatePresence>
        {selectedCluster && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#0f0f1a]/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[50vh] flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedCluster.users[0].location?.city || 'Unknown Region'}
                </h3>
                <p className="text-sm text-white/60">
                  {selectedCluster.users.length} {selectedCluster.users.length === 1 ? 'Star' : 'Stars'} here
                </p>
              </div>
              <button 
                onClick={() => setSelectedCluster(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedCluster.users.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => {
                      setSelectedCluster(null);
                      onUserClick(u);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-left group"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{
                        backgroundColor: `${getHexColor(u.color)}20`,
                        border: `1px solid ${getHexColor(u.color)}`,
                        color: getHexColor(u.color),
                        boxShadow: `0 0 10px ${getHexColor(u.color)}80`
                      }}
                    >
                      {(u.nickname || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate group-hover:text-white transition-colors">
                        {u.nickname || u.username}
                      </div>
                      {(u.zodiacSign || u.mbti) && (
                        <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                          {u.zodiacSign && <span>♈ {u.zodiacSign}</span>}
                          {u.mbti && <span>🧠 {u.mbti}</span>}
                        </div>
                      )}
                      {u.signal && (
                        <div className="text-xs text-white/50 truncate">
                          {u.signal}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Thought Modal */}
      <AnimatePresence>
        {expandedThought && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              
              <button 
                onClick={() => setExpandedThought(null)}
                className="absolute top-4 right-4 p-2 text-white/30 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center gap-6">
                <div className="p-4 bg-purple-500/10 rounded-full">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </motion.div>
                </div>

                <p className="text-xl text-white/90 leading-relaxed italic font-serif">
                  "{expandedThought.text}"
                </p>

                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${expandedThought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'} shadow-[0_0_8px_rgba(168,85,247,0.5)]`} />
                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold">
                      {expandedThought.isAnonymous ? 'Anonymous' : 'A Soul'}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/20">
                    Shared into the scape {expandedThought.createdAt?.toMillis ? new Date(expandedThought.createdAt.toMillis()).toLocaleTimeString() : 'just now'}
                  </span>
                  {expandedThought.region && (
                    <div className="flex items-center gap-1 text-white/40 text-[10px] mt-1">
                      <MapPin className="w-3 h-3 text-purple-400/60" />
                      <span>{expandedThought.city || expandedThought.region}, {expandedThought.country}</span>
                    </div>
                  )}
                  {(expandedThought.viewCount !== undefined && expandedThought.viewCount > 0) && (
                    <div className="flex items-center gap-1.5 text-purple-400/60 text-[10px] mt-2 bg-purple-500/5 px-3 py-1 rounded-full border border-purple-500/10">
                      <Eye className="w-3 h-3" />
                      <span className="font-medium tracking-wider uppercase">{expandedThought.viewCount} stars listening</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style>{`
        .leaflet-container {
          background: #050510 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .custom-popup .leaflet-popup-tip-container {
          display: none;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-leaflet-icon {
          background: transparent;
          border: none;
        }
        @keyframes pulse-cluster {
          0% { transform: scale(1); box-shadow: 0 0 15px var(--cluster-color); }
          50% { transform: scale(1.05); box-shadow: 0 0 25px var(--cluster-color); }
          100% { transform: scale(1); box-shadow: 0 0 15px var(--cluster-color); }
        }
        @keyframes pulse-thought {
          0% { transform: scale(1); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
        }
      `}</style>
    </motion.div>
  );
};
