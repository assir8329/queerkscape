import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../contexts/AuthContext';
import { getHexColor } from '../lib/colors';

interface StarProps {
  user: UserProfile;
  onClick: (user: UserProfile) => void;
  isActive: boolean;
  scale: number;
  isUser: boolean;
}

export const Star: React.FC<StarProps> = ({ user, onClick, isActive, scale, isUser }) => {
  const hexColor = getHexColor(user.color);
  const intensity = isActive ? '0.9' : '0.4';
  const blur = isActive ? '20px' : '10px';
  
  // Adjust size and glow based on scale to ensure visibility
  const isZoomedOut = scale < 0.3;
  const baseSize = isZoomedOut ? Math.max(16, 8 / scale) : 16;
  const glowSize = isZoomedOut ? Math.max(20, 10 / scale) : 20;
  
  // Random floating animation values based on UID to keep it consistent
  const randomDelay = (user.uid.charCodeAt(0) % 10) * 0.5;
  const randomDuration = 3 + (user.uid.charCodeAt(1) % 5);

  // Presence logic
  const lastActiveDate = user.lastActive?.toDate ? user.lastActive.toDate() : new Date(user.lastActive);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
  const diffHours = diffMinutes / 60;
  
  let presenceIndicator = null;
  if (diffMinutes < 15 && !isZoomedOut) {
    presenceIndicator = <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse" />;
  } else if (diffHours < 24 && !isZoomedOut) {
    presenceIndicator = <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,0.5)]" />;
  }

  // Signal today logic
  const signalDate = user.signalUpdatedAt?.toDate ? user.signalUpdatedAt.toDate() : new Date(user.signalUpdatedAt || 0);
  const signaledToday = signalDate.toDateString() === now.toDateString();

  // Convert hex to rgba for shadow
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  };

  const rgbColor = hexToRgb(hexColor);
  
  const animationValues = useMemo(() => {
    const twinkleDuration = 1.5 + (user.uid.charCodeAt(0) % 20) / 10;
    const pulseDuration = 2 + (user.uid.charCodeAt(0) % 20) / 10;
    const burstDuration = 4 + (user.uid.charCodeAt(2) % 40) / 10;
    const delay = (user.uid.charCodeAt(1) % 30) / 10;
    const burstDelay = (user.uid.charCodeAt(3) % 50) / 10;
    
    return {
      twinkleDuration: `${twinkleDuration}s`,
      pulseDuration: `${pulseDuration}s`,
      burstDuration: `${burstDuration}s`,
      delay: `${delay}s`,
      burstDelay: `${burstDelay}s`
    };
  }, [user.uid, user.color]);

  return (
    <motion.div
      className={`absolute flex flex-col items-center justify-center group cursor-pointer ${isUser ? 'z-30' : 'z-10'}`}
      style={{ 
        left: user.x, 
        top: user.y,
        width: baseSize,
        height: baseSize,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: isZoomedOut ? 0 : [0, -10, 0],
        x: isZoomedOut ? 0 : [0, 5, 0]
      }}
      transition={{
        scale: { duration: 0.5 },
        opacity: { duration: 0.5 },
        y: { duration: randomDuration, repeat: Infinity, ease: "easeInOut", delay: randomDelay },
        x: { duration: randomDuration * 1.2, repeat: Infinity, ease: "easeInOut", delay: randomDelay }
      }}
      whileHover={{ scale: 1.3, zIndex: 40 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(user);
      }}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-300 ${signaledToday && !isZoomedOut ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#050510]' : ''}`}
          style={{
            background: `radial-gradient(circle, ${hexColor} 0%, ${hexColor}80 40%, transparent 80%)`,
            boxShadow: `0 0 ${glowSize / 2}px ${hexColor}, 0 0 ${glowSize}px ${hexColor}80 ${isUser ? `, 0 0 ${glowSize * 2}px ${hexColor}40` : ''}`,
            animationName: isZoomedOut ? 'star-pulse' : 'star-twinkle',
            animationDuration: isZoomedOut ? animationValues.pulseDuration : animationValues.twinkleDuration,
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
            animationDelay: animationValues.delay,
            '--star-color': hexColor,
            '--star-glow': `${hexColor}80`,
            filter: isZoomedOut ? 'blur(1px)' : 'none'
          } as React.CSSProperties}
        />
        {isUser && isZoomedOut && (
          <div 
            className="absolute inset-[-50%] rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${hexColor} 0%, transparent 70%)`,
              filter: 'blur(10px)',
              animationName: 'pulse',
              animationDuration: '2s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
            }}
          />
        )}
        <div 
          className="absolute w-1 h-1 bg-white rounded-full opacity-0"
          style={{
            boxShadow: `0 0 8px #ffffff, 0 0 15px ${hexColor}`,
            animationName: 'star-burst',
            animationDuration: animationValues.burstDuration,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
            animationDelay: animationValues.burstDelay,
          }}
        />
        {presenceIndicator}
      </div>
      
      {!isZoomedOut && (
        <div className="mt-2 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-2 py-1 rounded-md pointer-events-none backdrop-blur-sm border border-white/10 flex flex-col items-center gap-1">
          <span>{user.nickname || user.username}</span>
          {(user.zodiacSign || user.mbti) && (
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              {user.zodiacSign && <span>♈ {user.zodiacSign}</span>}
              {user.mbti && <span>🧠 {user.mbti}</span>}
            </div>
          )}
        </div>
      )}
      
      {user.signal && !isZoomedOut && (
        <div className="absolute -top-8 text-[10px] text-white/90 bg-white/10 px-2 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/20 backdrop-blur-md">
          {user.signal}
        </div>
      )}
    </motion.div>
  );
};
