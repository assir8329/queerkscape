import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { getHexColor } from '../lib/colors';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const Buklod: React.FC = () => {
  const { profile } = useAuth();
  const [kindredSouls, setKindredSouls] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle resize
  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Kindred Souls (Connections)
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', profile.uid),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const uids = snapshot.docs.map(doc => {
        const data = doc.data();
        return data.users.find((uid: string) => uid !== profile.uid);
      }).filter(Boolean);

      const souls = await Promise.all(uids.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          return userDoc.exists() ? userDoc.data() as UserProfile : null;
        } catch (e) {
          return null;
        }
      }));

      setKindredSouls(souls.filter((s): s is UserProfile => s !== null));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'connections');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  // Proximity Clamp Logic: User is fixed at center, kindreds are relative and clamped
  const clampedSouls = useMemo(() => {
    if (!profile) return [];
    const CLAMP_RADIUS = 300;
    
    return kindredSouls.map(soul => {
      const dx = soul.x - profile.x;
      const dy = soul.y - profile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      let renderX = dx;
      let renderY = dy;
      let isClamped = false;

      if (distance > CLAMP_RADIUS) {
        const ratio = CLAMP_RADIUS / distance;
        renderX = dx * ratio;
        renderY = dy * ratio;
        isClamped = true;
      }
      
      return {
        ...soul,
        relX: renderX,
        relY: renderY,
        isClamped
      };
    });
  }, [kindredSouls, profile]);

  // Draw Star Dust (Static Background)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewportSize.width;
    canvas.height = viewportSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.05; // 5% opacity

    const starCount = Math.floor((canvas.width * canvas.height) / 2000);
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [viewportSize]);

  if (!profile || loading) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-50">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/20 font-black tracking-[0.5em] uppercase text-[10px]"
        >
          Aligning Frequencies...
        </motion.div>
      </div>
    );
  }

  const userVibeColor = profile ? getHexColor(profile.color) : '#22c55e';

  return (
    <div className="fixed inset-0 bg-[#050505] overflow-hidden z-0 flex items-center justify-center">
      {/* Star Dust Layer (Static) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* The Aura Effect (Soft-pulsing div behind the user star) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ 
          background: `radial-gradient(circle, ${userVibeColor}44 0%, transparent 70%)`,
          filter: 'blur(40px)'
        }}
      />

      {/* Shared Energy Glow (Centered on User) */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ backgroundColor: userVibeColor }} 
      />

      {/* Constellation Layer */}
      <div className="relative w-full h-full pointer-events-none">
        {/* SVG Lines from Center (50vw, 50vh) */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            {clampedSouls.map((soul) => (
              <linearGradient 
                key={`grad-${soul.uid}`} 
                id={`grad-${soul.uid}`} 
                gradientUnits="userSpaceOnUse"
                x1="50%" y1="50%" 
                x2={`calc(50% + ${soul.relX}px)`} 
                y2={`calc(50% + ${soul.relY}px)`}
              >
                <stop offset="0%" stopColor={userVibeColor} />
                <stop offset="100%" stopColor={getHexColor(soul.color)} />
              </linearGradient>
            ))}
          </defs>
          {clampedSouls.map((soul) => (
            <motion.line
              key={`line-${soul.uid}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              x1="50%"
              y1="50%"
              x2={`calc(50% + ${soul.relX}px)`}
              y2={`calc(50% + ${soul.relY}px)`}
              stroke={`url(#grad-${soul.uid})`}
              strokeWidth="2"
              strokeDasharray="4 2"
              style={{ filter: `drop-shadow(0 0 8px ${getHexColor(soul.color)}66)` }}
            />
          ))}
        </svg>

        {/* Kindred Stars */}
        {clampedSouls.map((soul) => (
          <div
            key={soul.uid}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{ 
              left: `calc(50% + ${soul.relX}px)`, 
              top: `calc(50% + ${soul.relY}px)`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => setActiveTooltip(activeTooltip === soul.uid ? null : soul.uid)}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.5 }}
              className="w-2 h-2 rounded-full border border-white/30 relative"
              style={{ 
                backgroundColor: getHexColor(soul.color),
                boxShadow: `0 0 15px ${getHexColor(soul.color)}` 
              }}
            >
              {/* Kindred Name Label (Visible for stars in view) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 transition-opacity duration-300">
                <span className="text-[8px] text-white/40 uppercase tracking-[0.2em] whitespace-nowrap font-bold">
                  {soul.nickname || soul.username}
                </span>
              </div>
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
              {activeTooltip === soul.uid && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-2xl"
                >
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">
                    {soul.nickname || soul.username}
                  </p>
                  <p className="text-xs text-white/90 italic font-medium">
                    "{soul.signal || 'Shining silently...'}"
                  </p>
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Central User Star */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                `0 0 30px ${userVibeColor}66`,
                `0 0 60px ${userVibeColor}99`,
                `0 0 30px ${userVibeColor}66`
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full border-2 border-white/20 relative"
            style={{ 
              backgroundColor: userVibeColor,
              filter: `drop-shadow(0 0 15px ${userVibeColor})`
            }}
          >
            <div className="absolute inset-0 rounded-full bg-white/30 blur-sm" />
          </motion.div>
          
          <div className="mt-6 text-center">
            <h2 className="text-white font-black tracking-[0.3em] uppercase text-[10px] opacity-80">YOUR SANCTUARY</h2>
            <div className="w-8 h-[1px] mx-auto mt-2" style={{ backgroundColor: `${userVibeColor}66` }} />
          </div>
        </div>
      </div>

      {/* Atmosphere Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-transparent opacity-40" />
    </div>
  );
};
