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
const UNIVERSE_SIZE = 5000;
const wrap = (v: number, m: number) => ((v % m) + m) % m;

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
      const targetX = wrap(profile.x, UNIVERSE_SIZE);
      const targetY = wrap(profile.y, UNIVERSE_SIZE);
      setPosition({
        x: viewport.width / 2 - targetX * scale,
        y: viewport.height / 2 - targetY * scale,
      });
      onInteraction?.();
    }
  };

  const resetToFullMap = () => {
    if (viewport.width > 0) {
      const scaleToFit = viewport.width / UNIVERSE_SIZE;
      setScale(scaleToFit);
      setPosition({
        x: viewport.width / 2 - (UNIVERSE_SIZE / 2) * scaleToFit,
        y: viewport.height / 2 - (UNIVERSE_SIZE / 2) * scaleToFit,
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
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Wrap world coordinates to ensure seamless panning
    const worldX = wrap(-newX / scale, UNIVERSE_SIZE);
    const worldY = wrap(-newY / scale, UNIVERSE_SIZE);
    
    setPosition({
      x: -worldX * scale,
      y: -worldY * scale,
    });
    
    // Update dragStart to prevent jumping after wrap
    setDragStart({
      x: e.clientX + worldX * scale,
      y: e.clientY + worldY * scale,
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
        setPosition(pos => {
          const newX = centerX - (centerX - pos.x) * zoomFactor;
          const newY = centerY - (centerY - pos.y) * zoomFactor;
          const worldX = wrap(-newX / newScale, UNIVERSE_SIZE);
          const worldY = wrap(-newY / newScale, UNIVERSE_SIZE);
          return {
            x: -worldX * newScale,
            y: -worldY * newScale
          };
        });
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
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const worldX = wrap(-newX / scale, UNIVERSE_SIZE);
      const worldY = wrap(-newY / scale, UNIVERSE_SIZE);
      
      setPosition({
        x: -worldX * scale,
        y: -worldY * scale,
      });
      
      setDragStart({
        x: e.touches[0].clientX + worldX * scale,
        y: e.touches[0].clientY + worldY * scale,
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

  const dispersedUsers = useDispersedStars(filteredUsers, scale);

  // Virtualization logic with wrap-around support
  const visibleUsers = useMemo(() => {
    if (viewport.width === 0) return [];
    const buffer = 200 / scale;
    const cameraX = wrap(-position.x / scale, UNIVERSE_SIZE);
    const cameraY = wrap(-position.y / scale, UNIVERSE_SIZE);
    
    const minX = cameraX - buffer;
    const maxX = cameraX + viewport.width / scale + buffer;
    const minY = cameraY - buffer;
    const maxY = cameraY + viewport.height / scale + buffer;

    const inRange = (val: number, min: number, max: number) => {
      if (min < 0) return val >= min + UNIVERSE_SIZE || val <= max;
      if (max > UNIVERSE_SIZE) return val >= min || val <= max - UNIVERSE_SIZE;
      return val >= min && val <= max;
    };

    return dispersedUsers.filter(u => 
      inRange(u.x, minX, maxX) && inRange(u.y, minY, maxY)
    );
  }, [dispersedUsers, position, scale, viewport]);

  const visibleThoughts = useMemo(() => {
    if (viewport.width === 0) return [];
    const buffer = 100 / scale;
    const cameraX = wrap(-position.x / scale, UNIVERSE_SIZE);
    const cameraY = wrap(-position.y / scale, UNIVERSE_SIZE);
    
    const minX = cameraX - buffer;
    const maxX = cameraX + viewport.width / scale + buffer;
    const minY = cameraY - buffer;
    const maxY = cameraY + viewport.height / scale + buffer;

    const inRange = (val: number, min: number, max: number) => {
      if (min < 0) return val >= min + UNIVERSE_SIZE || val <= max;
      if (max > UNIVERSE_SIZE) return val >= min || val <= max - UNIVERSE_SIZE;
      return val >= min && val <= max;
    };

    return thoughts.filter(t => 
      t.x != null && t.y != null && inRange(t.x, minX, maxX) && inRange(t.y, minY, maxY)
    );
  }, [thoughts, position, scale, viewport]);

  const getWrappedElementPos = (elementX: number, elementY: number) => {
    const cameraX = wrap(-position.x / scale, UNIVERSE_SIZE);
    const cameraY = wrap(-position.y / scale, UNIVERSE_SIZE);
    
    let dx = elementX - cameraX;
    if (dx > UNIVERSE_SIZE / 2) dx -= UNIVERSE_SIZE;
    if (dx < -UNIVERSE_SIZE / 2) dx += UNIVERSE_SIZE;
    
    let dy = elementY - cameraY;
    if (dy > UNIVERSE_SIZE / 2) dy -= UNIVERSE_SIZE;
    if (dy < -UNIVERSE_SIZE / 2) dy += UNIVERSE_SIZE;
    
    return { x: cameraX + dx, y: cameraY + dy };
  };

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
      let x2 = u2?.x ?? conn.to_coord.x;
      let y2 = u2?.y ?? conn.to_coord.y;
      const c1 = u1?.color ?? conn.from_coord.color;
      const c2 = u2?.color ?? conn.to_coord.color;

      // Wrap-around line logic: find the shortest path across the universe
      if (Math.abs(x2 - x1) > UNIVERSE_SIZE / 2) {
        if (x2 > x1) x2 -= UNIVERSE_SIZE;
        else x2 += UNIVERSE_SIZE;
      }
      if (Math.abs(y2 - y1) > UNIVERSE_SIZE / 2) {
        if (y2 > y1) y2 -= UNIVERSE_SIZE;
        else y2 += UNIVERSE_SIZE;
      }

      // Adjust endpoints relative to the camera to ensure they are drawn in the correct "wrap"
      const p1 = getWrappedElementPos(x1, y1);
      const p2 = getWrappedElementPos(x2, y2);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
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

  const nebulaIntensity = useMemo(() => {
    // Base intensity + boost from active users
    return 0.3 + Math.min(activeUserCount * 0.05, 0.6);
  }, [activeUserCount]);

  const nebulaScale = useMemo(() => {
    return 1 + Math.min(activeUserCount * 0.02, 0.4);
  }, [activeUserCount]);

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
      className="relative w-full h-full overflow-hidden bg-black cursor-grab active:cursor-grabbing touch-none"
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
      {/* Kalawakan Background (Fixed) */}
      <KalawakanBackground />

      <div
        className="absolute origin-top-left"
        style={{
          width: 5000,
          height: 5000,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Puso ng Hiraya (Heart of Hiraya) - Central Nebula */}
        {mapMode === 'constellation' && (() => {
          const wrapped = getWrappedElementPos(UNIVERSE_SIZE / 2, UNIVERSE_SIZE / 2);
          return (
            <div 
              className="absolute pointer-events-none z-0"
              style={{
                left: wrapped.x,
                top: wrapped.y,
                width: 1200,
                height: 1200,
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(75, 0, 130, 0.3) 0%, rgba(138, 43, 226, 0.15) 50%, transparent 80%)',
                filter: 'blur(40px)',
                opacity: nebulaIntensity,
                transition: 'opacity 1s ease-in-out',
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/10 text-[10px] uppercase tracking-[0.5em] font-bold whitespace-nowrap">
                Puso ng Hiraya
              </div>
            </div>
          );
        })()}

        <canvas 
          ref={canvasRef}
          width={5000}
          height={5000}
          className="absolute inset-0 pointer-events-none"
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Orbital Group Glows */}
          {Array.from(new Set(visibleUsers.filter(u => (u as any).isDispersed).map(u => `${(u as any).originalX},${(u as any).originalY}`))).map(groupKey => {
            const [gx, gy] = (groupKey as string).split(',').map(Number);
            const groupMembers = visibleUsers.filter(u => (u as any).originalX === gx && (u as any).originalY === gy);
            if (groupMembers.length < 2) return null;
            
            const N = groupMembers.length;
            const radius = 40 + (N * 5) + 30; // Slightly larger than the orbit in world coordinates

            return (
              <circle
                key={`group-glow-${groupKey}`}
                cx={gx}
                cy={gy}
                r={radius}
                fill="url(#orbitalGradient)"
                className="opacity-20 transition-all duration-500"
              />
            );
          })}

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
            <radialGradient id="orbitalGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.6)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </radialGradient>
            <radialGradient id="constellationGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </radialGradient>
          </defs>
        </svg>

        {activeLayers.includes('stars') && visibleUsers.map((u) => {
          const wrapped = getWrappedElementPos(u.x, u.y);
          return (
            <Star
              key={`user-star-${u.uid}`}
              user={{ ...u, x: wrapped.x, y: wrapped.y }}
              onClick={onUserClick}
              isActive={isUserActive(u.lastActive)}
              scale={scale}
              isUser={u.uid === user?.uid}
              isKindred={kindredUids.includes(u.uid)}
            />
          );
        })}

        {activeLayers.includes('thoughts') && visibleThoughts.map((thought) => {
          const wrapped = getWrappedElementPos(thought.x!, thought.y!);
          return (
            <ThoughtBubble
              key={thought.id}
              thought={{ ...thought, x: wrapped.x, y: wrapped.y }}
              onExpand={(t) => {
                setActiveThought(t);
                incrementViewCount(t.id);
              }}
            />
          );
        })}
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
              left: `${(wrap(-position.x / scale, UNIVERSE_SIZE) / UNIVERSE_SIZE) * 100}%`,
              top: `${(wrap(-position.y / scale, UNIVERSE_SIZE) / UNIVERSE_SIZE) * 100}%`,
              width: `${Math.min(100, (viewport.width / scale / UNIVERSE_SIZE) * 100)}%`,
              height: `${Math.min(100, (viewport.height / scale / UNIVERSE_SIZE) * 100)}%`,
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
