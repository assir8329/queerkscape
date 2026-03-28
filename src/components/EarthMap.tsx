import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { UserProfile, UnsaidThought, Memory } from '../types';
import { incrementViewCount } from './UnsaidThoughts';
import { MemoryModal } from './MemoryModal';
import { MemoryCard } from './MemoryCard';
import { RightActionStack } from './RightActionStack';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import L from 'leaflet';
import { useDispersedStars } from '../lib/orbital-dispersion';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, MessageSquare, Sparkles, Eye, MapPin, Clock } from 'lucide-react';
import { getHexColor } from '../lib/colors';

interface EarthMapProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  onUserClick: (user: UserProfile) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  isUiVisible?: boolean;
  onInteraction?: () => void;
  isAddingMemory?: boolean;
  setIsAddingMemory?: (adding: boolean) => void;
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
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
     return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10, zoom: 8 };
  }

  return { lat: 20, lng: 0, zoom: 2 };
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
        animation-name: star-twinkle;
        animation-duration: ${duration}s;
        animation-iteration-count: infinite;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
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
        animation-name: star-burst;
        animation-duration: ${burstDuration}s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
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
  const size = 16;
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: rgba(168, 85, 247, 0.2);
      border: 1px solid rgba(168, 85, 247, 0.8);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a855f7;
      backdrop-filter: blur(2px);
      animation-name: pulse-thought;
      animation-duration: 3s;
      animation-iteration-count: infinite;
    ">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createMemoryIcon = () => {
  const size = 16;
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: rgba(234, 179, 8, 0.2);
      border: 1px solid rgba(234, 179, 8, 0.8);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #eab308;
      backdrop-filter: blur(2px);
    ">
      <div style="width: 4px; height: 4px; background: #eab308; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
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
  onThoughtClick: (thought: UnsaidThought | null) => void,
  onMemoryClick: (memory: Memory) => void,
  onMapClick: (lat: number, lng: number) => void,
  activeThought: UnsaidThought | null,
  onInteraction?: () => void
}> = ({ users, thoughts, memories, showStars, showThoughts, showMemories, isAddingMemory, onUserClick, onClusterClick, onThoughtClick, onMemoryClick, onMapClick, activeThought, onInteraction }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

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

  const dispersedUsers = useDispersedStars(users, zoom, true);

  return (
    <>
      {showStars && dispersedUsers.map((user, i) => {
        if (!user.location || isNaN(user.location.lat) || isNaN(user.location.lng)) return null;
        
        return (
          <Marker 
            key={`user-${user.uid}`}
            position={[user.location.lat, user.location.lng]}
            icon={createStarIcon(user.color)}
            eventHandlers={{
              click: () => onUserClick(user)
            }}
          />
        );
      })}

      {/* Orbital Group Glows for EarthMap */}
      {showStars && Array.from(new Set(dispersedUsers.filter(u => (u as any).isDispersed).map(u => `${(u as any).originalLat},${(u as any).originalLng}`))).map(groupKey => {
        const [glat, glng] = (groupKey as string).split(',').map(Number);
        const groupMembers = dispersedUsers.filter(u => (u as any).originalLat === glat && (u as any).originalLng === glng);
        if (groupMembers.length < 2) return null;
        
        const N = groupMembers.length;
        // Radius in degrees for the glow
        const radiusBase = 0.0005 * (18 / zoom);
        const radius = radiusBase + (N * 0.0001) + 0.0002;

        return (
          <Marker
            key={`group-glow-${groupKey}`}
            position={[glat, glng]}
            icon={L.divIcon({
              html: `<div style="
                width: 100px;
                height: 100px;
                background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                filter: blur(10px);
                pointer-events: none;
              "></div>`,
              className: 'group-glow-icon',
              iconSize: [0, 0],
            })}
            zIndexOffset={-100}
          />
        );
      })}

      {/* Always render thoughts on top */}
      {showThoughts && thoughts.map((thought) => {
        if (thought.lat == null || thought.lng == null || isNaN(thought.lat) || isNaN(thought.lng)) return null;
        return (
          <Marker
            key={`thought-${thought.id}`}
            position={[thought.lat, thought.lng]}
            icon={createThoughtIcon()}
            zIndexOffset={1000}
            eventHandlers={{
              click: () => {
                onThoughtClick(thought);
              }
            }}
          />
        );
      })}

      {/* Render memories */}
      {showMemories && memories.map((memory) => {
        if (memory.lat == null || memory.lng == null || isNaN(memory.lat) || isNaN(memory.lng)) return null;
        const user = users.find(u => u.uid === memory.userId);
        return (
          <Marker
            key={`memory-${memory.id}`}
            position={[memory.lat, memory.lng]}
            icon={createMemoryIcon()}
            zIndexOffset={500}
            eventHandlers={{
              click: () => onMemoryClick(memory)
            }}
          >
            <Popup className="custom-popup">
              <MemoryCard 
                memory={memory} 
                user={user}
                onClose={() => map?.closePopup()} 
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export const EarthMap: React.FC<EarthMapProps> = ({ users, currentUser, onUserClick, filterTag, setFilterTag, mapMode, setMapMode, isUiVisible = true, onInteraction, isAddingMemory: externalIsAddingMemory, setIsAddingMemory: externalSetIsAddingMemory }) => {
  const [activeThought, setActiveThought] = useState<UnsaidThought | null>(null);
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  
  // Memory specific state
  const [internalIsAddingMemory, setInternalIsAddingMemory] = useState(false);
  const isAddingMemory = externalIsAddingMemory !== undefined ? externalIsAddingMemory : internalIsAddingMemory;
  const setIsAddingMemory = externalSetIsAddingMemory !== undefined ? externalSetIsAddingMemory : setInternalIsAddingMemory;

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
      limit(100)
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
      if (!isNaN(target.lat) && !isNaN(target.lng)) {
        map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.5 });
      }
    }
  }, [map, currentUser]);

  const handleCenterOnMe = () => {
    if (map && currentUser) {
      const target = getTargetLocation(currentUser);
      if (!isNaN(target.lat) && !isNaN(target.lng)) {
        map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.5 });
      }
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
        <div 
          className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] glass-dark text-yellow-400 px-6 py-3 rounded-full font-bold shadow-2xl border border-yellow-500/30"
          style={{
            animationName: 'pulse',
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
          }}
        >
          Tap anywhere on the map to leave a Bakás
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
          url={isAddingMemory 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          }
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
          onClusterClick={(cluster) => {
            if (map && !isNaN(cluster.lat) && !isNaN(cluster.lng)) {
              const currentZoom = map.getZoom();
              map.flyTo([cluster.lat, cluster.lng], Math.min(currentZoom + 3, 18), { duration: 1 });
            }
          }} 
          onThoughtClick={(t) => {
            setActiveThought(t);
            if (t) incrementViewCount(t.id);
          }}
          onMemoryClick={handleMemoryClick}
          onMapClick={handleMapClick}
          activeThought={activeThought}
          onInteraction={onInteraction}
        />
      </MapContainer>

      {/* Right Action Stack */}
      <RightActionStack 
        isLoggedIn={!!currentUser}
        onCenterMe={handleCenterOnMe}
        onPinMemory={() => setIsAddingMemory(!isAddingMemory)}
        isAddingMemory={isAddingMemory}
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

      {/* Expanded Thought Modal */}
      <AnimatePresence>
        {activeThought && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
              
              <button 
                onClick={() => setActiveThought(null)}
                className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-white/30 hover:text-white transition-all z-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-3">
                {/* Header Label */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeThought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'} shadow-[0_0_8px_rgba(168,85,247,0.5)]`} />
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    {activeThought.isAnonymous ? 'A Whisper' : 'A Soul'}
                  </span>
                </div>

                {/* Main Content */}
                <p className="text-sm text-white/90 leading-relaxed font-medium">
                  "{activeThought.text}"
                </p>

                {/* Metadata Footer */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-3 mt-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40 font-medium">
                    {activeThought.region && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-purple-400/60" />
                        <span>{activeThought.city || activeThought.region}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{activeThought.createdAt?.toMillis ? new Date(activeThought.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                    </div>

                    {(activeThought.viewCount !== undefined && activeThought.viewCount > 0) && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        <span>{activeThought.viewCount} stars listening</span>
                      </div>
                    )}
                  </div>
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
        @keyframes pulse-thought {
          0% { transform: scale(1); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
        }
      `}</style>
    </motion.div>
  );
};
