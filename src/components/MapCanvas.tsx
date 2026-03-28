import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Star } from './Star';
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
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
  const [activeThought, setActiveThought] = useState<UnsaidThought | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
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
    if (viewport.width > 0) {
      const scaleToFit = viewport.width / 5000;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    onInteraction?.();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
    onInteraction?.();
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number, centerX?: number, centerY?: number) => {
    setScale((prev) => {
      const newScale = Math.min(Math.max(0.2, prev + delta), 3);
      
      if (centerX !== undefined && centerY !== undefined) {
        // Zoom towards the cursor/pinch center
        const zoomFactor = newScale / prev;
        setPosition(pos => ({
          x: centerX - (centerX - pos.x) * zoomFactor,
          y: centerY - (centerY - pos.y) * zoomFactor,
        }));
      }
      
      return newScale;
    });
    onInteraction?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap
      resetToFullMap();
      setLastTap(0);
      return;
    }
    setLastTap(now);

    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDistance(distance);
      setTouchStartScale(scale);
    }
    onInteraction?.();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDistance !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance / touchStartDistance;
      const newScale = Math.min(Math.max(0.2, touchStartScale * delta), 3);
      
      // Calculate pinch center
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      const zoomFactor = newScale / scale;
      setPosition(pos => ({
        x: centerX - (centerX - pos.x) * zoomFactor,
        y: centerY - (centerY - pos.y) * zoomFactor,
      }));
      setScale(newScale);
    }
    onInteraction?.();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDistance(null);
  };

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

  // Virtualization logic
  const visibleUsers = useMemo(() => {
    if (viewport.width === 0) return [];
    const buffer = 200 / scale; // 200px buffer
    const minX = -position.x / scale - buffer;
    const maxX = (-position.x + viewport.width) / scale + buffer;
    const minY = -position.y / scale - buffer;
    const maxY = (-position.y + viewport.height) / scale + buffer;

    return filteredUsers.filter(u => 
      u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY
    );
  }, [filteredUsers, position, scale, viewport]);

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
    
    const userMap = new Map<string, UserProfile>(users.map(u => [u.uid, u]));
    
    connections.forEach(conn => {
      const u1 = userMap.get(conn.users[0]);
      const u2 = userMap.get(conn.users[1]);
      
      if (u1 && u2 && u1.x !== undefined && u1.y !== undefined && u2.x !== undefined && u2.y !== undefined) {
        const isBuklod = profile && (conn.users.includes(profile.uid)) && (conn.users.some(uid => kindredUids.includes(uid)));
        
        ctx.beginPath();
        ctx.moveTo(u1.x, u1.y);
        ctx.lineTo(u2.x, u2.y);
        
        if (isBuklod) {
          const color1 = getHexColor(u1.color || '#FFFFFF');
          const color2 = getHexColor(u2.color || '#FFFFFF');
          const gradient = ctx.createLinearGradient(u1.x, u1.y, u2.x, u2.y);
          gradient.addColorStop(0, color1);
          gradient.addColorStop(1, color2);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.8;
          ctx.shadowBlur = 15;
          ctx.shadowColor = color1;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.15;
          ctx.shadowBlur = 0;
        }
        
        ctx.stroke();
      }
    });
  }, [connections, users, profile, activeLayers, kindredUids]);

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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#050510] cursor-grab active:cursor-grabbing touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={(e) => {
        handleZoom(e.deltaY > 0 ? -0.1 : 0.1, e.clientX, e.clientY);
      }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          width: 5000,
          height: 5000,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '50px 50px' }} />
             
        <canvas 
          ref={canvasRef}
          width={5000}
          height={5000}
          className="absolute inset-0 pointer-events-none"
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Constellation Glows */}
          {Array.from(new Set(visibleUsers.filter(u => u.constellationId).map(u => u.constellationId))).map(constellationId => {
            const members = visibleUsers.filter(u => u.constellationId === constellationId);
            if (members.length < 2) return null;
            
            const minX = Math.min(...members.map(m => m.x));
            const maxX = Math.max(...members.map(m => m.x));
            const minY = Math.min(...members.map(m => m.y));
            const maxY = Math.max(...members.map(m => m.y));
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const rx = (maxX - minX) / 2 + 150;
            const ry = (maxY - minY) / 2 + 150;

            return (
              <ellipse
                key={`constellation-glow-${constellationId}`}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="url(#constellationGradient)"
                className="opacity-30 transition-all duration-1000"
              />
            );
          })}

          <defs>
            <radialGradient id="constellationGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </radialGradient>
          </defs>
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

      {/* Mini-map */}
      <div className="absolute bottom-6 left-6 w-36 h-36 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden z-30 shadow-2xl hidden sm:block">
        <div className="relative w-full h-full">
          {/* Mini-map stars */}
          {filteredUsers.map(u => (
            <div
              key={u.uid}
              className="absolute w-1 h-1 bg-white/50 rounded-full"
              style={{
                left: `${(u.x / 5000) * 100}%`,
                top: `${(u.y / 5000) * 100}%`,
              }}
            />
          ))}
          {/* Viewport indicator */}
          <div
            className="absolute border border-purple-500/50 bg-purple-500/10 pointer-events-none"
            style={{
              left: `${Math.max(0, (-position.x / scale / 5000) * 100)}%`,
              top: `${Math.max(0, (-position.y / scale / 5000) * 100)}%`,
              width: `${Math.min(100, (viewport.width / scale / 5000) * 100)}%`,
              height: `${Math.min(100, (viewport.height / scale / 5000) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Right Action Stack */}
      <RightActionStack 
        isLoggedIn={!!user}
        onCenterMe={centerOnUser}
        onPinMemory={() => {}} // Not available in Kalawakan
        onZoomIn={() => handleZoom(0.2, viewport.width / 2, viewport.height / 2)}
        onZoomOut={() => handleZoom(-0.2, viewport.width / 2, viewport.height / 2)}
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
