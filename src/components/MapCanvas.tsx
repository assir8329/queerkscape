import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs, getDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Star } from './Star';
import { KalawakanBackground } from './KalawakanBackground';
import { useDispersedStars } from '../lib/orbital-dispersion';
import { ThoughtBubble } from './ThoughtBubble';
import { UnsaidThought } from '../types';
import { incrementViewCount } from './UnsaidThoughts';
import { RightActionStack } from './RightActionStack';
import { LocateFixed, ZoomIn, ZoomOut, X, Sparkles, Eye, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Connection {
  id: string;
  users: string[];
  type?: 'buklod' | 'public';
  from_coord?: { x: number; y: number; color?: string };
  to_coord?: { x: number; y: number; color?: string };
}

const getHexColor = (vibeColor: string) => {
  const colors: Record<string, string> = {
    '#FF6B6B': '#FF6B6B',
    '#4ECDC4': '#4ECDC4',
    '#45B7D1': '#45B7D1',
    '#96CEB4': '#96CEB4',
    '#FFEEAD': '#FFEEAD',
    '#D4A5A5': '#D4A5A5',
    '#9B59B6': '#9B59B6',
    '#3498DB': '#3498DB',
    '#E67E22': '#E67E22',
    '#2ECC71': '#2ECC71',
  };
  return colors[vibeColor] || '#FFFFFF';
};

const CACHE_KEY_USERS = 'hiraya_constellation_users';
const CACHE_KEY_CONNECTIONS = 'hiraya_constellation_connections';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface Ugnayan {
  id: string;
  users: string[];
  from_coord: { x: number; y: number; color: string };
  to_coord: { x: number; y: number; color: string };
}

interface MapCanvasProps {
  onUserClick: (user: UserProfile) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  isUiVisible?: boolean;
  onInteraction?: () => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ onUserClick, filterTag, setFilterTag, mapMode, setMapMode, isUiVisible = true, onInteraction }) => {
  const { user, profile, updateLastActive } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [ugnayan, setUgnayan] = useState<Ugnayan[]>([]);
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
  const [activeThought, setActiveThought] = useState<UnsaidThought | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCentered = useRef(false);

  // Layer toggles
  const [activeLayers, setActiveLayers] = useState<string[]>(['stars', 'thoughts', 'connections']);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  // Debounce filterTag
  const [debouncedFilter, setDebouncedFilter] = useState(filterTag);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFilter(filterTag), 300);
    return () => clearTimeout(handler);
  }, [filterTag]);

  useEffect(() => {
    // Update last active on mount
    updateLastActive();
    const interval = setInterval(updateLastActive, 5 * 60 * 1000); // Every 5 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Try to load from cache first
    const cachedUsers = localStorage.getItem(CACHE_KEY_USERS);
    const cachedTime = localStorage.getItem(`${CACHE_KEY_USERS}_time`);
    
    if (cachedUsers && cachedTime && Date.now() - parseInt(cachedTime) < CACHE_EXPIRY) {
      setUsers(JSON.parse(cachedUsers));
    }

    const q = query(collection(db, 'users'), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => doc.data() as UserProfile);
        setUsers(usersData);
        localStorage.setItem(CACHE_KEY_USERS, JSON.stringify(usersData));
        localStorage.setItem(`${CACHE_KEY_USERS}_time`, Date.now().toString());
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'users')
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Try to load from cache first
    const cachedConn = localStorage.getItem(CACHE_KEY_CONNECTIONS);
    const cachedTime = localStorage.getItem(`${CACHE_KEY_CONNECTIONS}_time`);
    
    if (cachedConn && cachedTime && Date.now() - parseInt(cachedTime) < CACHE_EXPIRY) {
      setConnections(JSON.parse(cachedConn));
    }

    const q = query(collection(db, 'connections'), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const connData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Connection));
        setConnections(connData);
        localStorage.setItem(CACHE_KEY_CONNECTIONS, JSON.stringify(connData));
        localStorage.setItem(`${CACHE_KEY_CONNECTIONS}_time`, Date.now().toString());
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'connections')
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'ugnayan'), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ugnayanData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ugnayan));
        setUgnayan(ugnayanData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'ugnayan')
    );
    return () => unsubscribe();
  }, []);

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

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setViewport({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setViewport({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const centerOnUser = () => {
    if (profile && viewport.width > 0) {
      setPosition({
        x: viewport.width / 2 - profile.x * scale,
        y: viewport.height / 2 - profile.y * scale,
      });
      onInteraction?.();
    }
  };

  const resetToFullMap = () => {
    if (viewport.width > 0 && viewport.height > 0) {
      // Scale to fit the smaller dimension to ensure entire map is visible
      const scaleToFit = Math.min(viewport.width / 5000, viewport.height / 5000);
      setScale(scaleToFit);
      setPosition({
        x: viewport.width / 2 - 2500 * scaleToFit,
        y: viewport.height / 2 - 2500 * scaleToFit,
      });
      onInteraction?.();
    }
  };

  useEffect(() => {
    if (viewport.width > 0 && !hasCentered.current) {
      if (mapMode === 'constellation') {
        resetToFullMap();
      } else if (profile) {
        centerOnUser();
      }
      hasCentered.current = true;
    }
  }, [profile, mapMode, viewport]);

  useEffect(() => {
    // Reset centering flag when switching modes to allow re-centering
    hasCentered.current = false;
  }, [mapMode]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (profile?.blockedUsers?.includes(u.uid)) return false;
      if (u.blockedUsers?.includes(profile?.uid || '')) return false;
      if (filterTag === 'favorites' && !profile?.favorites?.includes(u.uid)) return false;
      if (debouncedFilter && debouncedFilter !== 'favorites') {
        const lowerFilter = debouncedFilter.toLowerCase();
        const hasTag = u.tags.some(t => t.toLowerCase().includes(lowerFilter));
        const hasVibe = u.vibe?.toLowerCase().includes(lowerFilter);
        if (!hasTag && !hasVibe) return false;
      }
      return true;
    });
  }, [users, profile, debouncedFilter, filterTag]);

  const dispersedUsers = useDispersedStars(filteredUsers, scale);

  // Virtualization logic
  const visibleUsers = useMemo(() => {
    if (viewport.width === 0) return [];
    const buffer = 200 / scale; // 200px buffer
    const minX = -position.x / scale - buffer;
    const maxX = (-position.x + viewport.width) / scale + buffer;
    const minY = -position.y / scale - buffer;
    const maxY = (-position.y + viewport.height) / scale + buffer;

    return dispersedUsers.filter(u => 
      u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY
    );
  }, [dispersedUsers, position, scale, viewport]);

  const visibleThoughts = useMemo(() => {
    if (viewport.width === 0) return [];
    const buffer = 100 / scale;
    const minX = -position.x / scale - buffer;
    const maxX = (-position.x + viewport.width) / scale + buffer;
    const minY = -position.y / scale - buffer;
    const maxY = (-position.y + viewport.height) / scale + buffer;

    return thoughts.filter(t => 
      t.x != null && t.y != null && t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY
    );
  }, [thoughts, position, scale, viewport]);

  // Render connections on canvas for performance
  const [kindredUids, setKindredUids] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeLayers.includes('connections')) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 5000, 5000);
    
    // Render Ugnayan lines
    const userMap = new Map<string, UserProfile>(users.map(u => [u.uid, u]));
    
    ugnayan.forEach(conn => {
      const isBuklodMode = mapMode === 'earth';
      const isKindred = profile && (conn.users.includes(profile.uid)) && (conn.users.some(uid => kindredUids.includes(uid)));
      
      // In Buklod mode, only show kindred connections
      if (isBuklodMode && !isKindred) return;

      // Use current coordinates if available, otherwise fallback to stored ones
      const u1 = userMap.get(conn.users[0]);
      const u2 = userMap.get(conn.users[1]);
      
      const x1 = u1?.x ?? conn.from_coord.x;
      const y1 = u1?.y ?? conn.from_coord.y;
      const x2 = u2?.x ?? conn.to_coord.x;
      const y2 = u2?.y ?? conn.to_coord.y;
      const c1 = u1?.color ?? conn.from_coord.color;
      const c2 = u2?.color ?? conn.to_coord.color;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      if (isBuklodMode && isKindred) {
        // BUKLOD Styling: Thick, vibrant gradient line
        const color1 = getHexColor(c1 || '#FFFFFF');
        const color2 = getHexColor(c2 || '#FFFFFF');
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color1;
      } else {
        // KALAWAKAN Styling: Faint, gray/white, low opacity
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.1;
        ctx.shadowBlur = 0;
      }
      
      ctx.stroke();
      // Reset shadow for next lines
      ctx.shadowBlur = 0;
    });

    // Legacy connections (optional, keeping for compatibility if needed, but ugnayan is primary now)
    // connections.forEach(conn => { ... })
  }, [ugnayan, mapMode, profile, activeLayers, kindredUids]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', profile.uid),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uids = snapshot.docs.map(doc => {
        const data = doc.data();
        return data.users.find((uid: string) => uid !== profile.uid);
      }).filter(Boolean);
      setKindredUids(uids);
    });
    return () => unsubscribe();
  }, [profile]);

  const isUserActive = (lastActive: any) => {
    if (!lastActive?.toMillis) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastActive.toMillis() > fiveMinutesAgo;
  };

  const activeUserCount = useMemo(() => {
    return users.filter(u => isUserActive(u.lastActive)).length;
  }, [users]);

  const runMigration = async () => {
    console.log('Starting migration...');
    try {
      const interactionsSnap = await getDocs(collection(db, 'interactions'));
      const interactionsData = interactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const userMap = new Map<string, UserProfile>(users.map(u => [u.uid, u]));
      let count = 0;
      
      for (const inter of interactionsData as any[]) {
        const { fromUid, toUid, createdAt } = inter;
        if (!fromUid || !toUid) continue;
        
        const uids = [fromUid, toUid].sort();
        const ugnayanId = uids.join('-');
        
        const ugnayanRef = doc(db, 'ugnayan', ugnayanId);
        const ugnayanSnap = await getDoc(ugnayanRef);
        
        if (!ugnayanSnap.exists()) {
          const u1 = userMap.get(fromUid);
          const u2 = userMap.get(toUid);
          
          if (u1 && u2) {
            await setDoc(ugnayanRef, {
              users: uids,
              participants: uids,
              lastActive: createdAt || new Date(),
              status: 'active',
              from_coord: { x: u1.x, y: u1.y, color: u1.color || '#FFFFFF' },
              to_coord: { x: u2.x, y: u2.y, color: u2.color || '#FFFFFF' },
              createdAt: createdAt || new Date()
            });
            count++;
          }
        }
      }
      alert(`Migration complete! Created ${count} connections.`);
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Migration failed. Check console.');
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-[100dvh] w-screen !overflow-hidden bg-black touch-none"
    >
      {/* Kalawakan Background (Fixed) */}
      <KalawakanBackground />

      <div
        className="absolute origin-top-left"
        style={{
          width: 5000,
          height: 5000,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <canvas 
          ref={canvasRef}
          width={5000}
          height={5000}
          className="absolute inset-0 pointer-events-none"
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
        </svg>

        {activeLayers.includes('stars') && visibleUsers.map((u) => (
          <Star
            key={`user-star-${u.uid}`}
            user={u}
            onClick={onUserClick}
            isActive={isUserActive(u.lastActive)}
            scale={scale}
            isUser={u.uid === user?.uid}
            isKindred={kindredUids.includes(u.uid)}
          />
        ))}

        {activeLayers.includes('thoughts') && visibleThoughts.map((thought) => (
          <ThoughtBubble
            key={thought.id}
            thought={thought}
            onExpand={(t) => {
              setActiveThought(t);
              incrementViewCount(t.id);
            }}
          />
        ))}
      </div>

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

      {/* Hidden Admin Migration Button */}
      {localStorage.getItem('admin_mode') === 'true' && (
        <button
          onClick={runMigration}
          className="absolute top-20 left-6 z-50 bg-red-500/20 hover:bg-red-500/40 text-red-500 text-[10px] px-2 py-1 rounded border border-red-500/50 transition-all uppercase tracking-widest font-bold"
        >
          Run Ugnayan Migration
        </button>
      )}

      {/* Right Action Stack */}
      <RightActionStack 
        isLoggedIn={!!user}
        onCenterMe={centerOnUser}
        onPinMemory={() => {}} // Not available in Kalawakan
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onToggleLayer={toggleLayer}
        activeLayers={activeLayers}
        mapMode={mapMode}
        setMapMode={setMapMode}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        isVisible={isUiVisible}
      />
    </div>
  );
};
