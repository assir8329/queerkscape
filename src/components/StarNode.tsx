import React from 'react';
import { motion } from 'motion/react';

interface StarNodeProps {
  size: number;
  color: string;
  glowColor: string;
  className?: string;
  isSanctuary?: boolean;
}

export const StarNode: React.FC<StarNodeProps> = ({ 
  size, 
  color, 
  glowColor, 
  className = "",
  isSanctuary = false 
}) => {
  const filterId = `star-glow-${Math.random().toString(36).substr(2, 9)}`;
  
  // 5-point star path calculation
  // Center is (50, 50), outer radius 45, inner radius 20
  const starPath = "M50 5 L63 38 L95 38 L69 59 L79 91 L50 71 L21 91 L31 59 L5 38 L37 38 Z";

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <style>
        {`
          @keyframes twinkle {
            0%, 100% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          .star-twinkle {
            animation: twinkle ${isSanctuary ? '4s' : '3s'} ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
            transform-origin: center;
          }
        `}
      </style>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full overflow-visible star-twinkle"
        style={{ 
          filter: `drop-shadow(0 0 ${isSanctuary ? size/2 : size/4}px ${glowColor})`
        }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isSanctuary ? "4" : "2"} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <path
          d={starPath}
          fill={color}
          filter={`url(#${filterId})`}
        />
      </svg>
      
      {/* Extra glow layer for Sanctuary */}
      {isSanctuary && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            filter: 'blur(20px)',
            zIndex: -1
          }}
        />
      )}
    </div>
  );
};
