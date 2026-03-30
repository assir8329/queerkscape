import React from 'react';
import { motion } from 'motion/react';

interface PusoNgHirayaProps {
  x: number;
  y: number;
  opacity: number;
  scale?: number;
}

export const PusoNgHiraya: React.FC<PusoNgHirayaProps> = ({ x, y, opacity, scale = 1 }) => {
  return (
    <div 
      className="absolute pointer-events-none z-0"
      style={{
        left: x,
        top: y,
        width: 1500 * scale,
        height: 1500 * scale,
        transform: 'translate(-50%, -50%)',
        opacity: opacity,
        transition: 'opacity 1s ease-in-out, width 1s ease-in-out, height 1s ease-in-out',
      }}
    >
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Turbulence filter for wispy edges */}
          <filter id="nebula-noise" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="5"
              seed="42"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="120"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Grainy texture filter */}
          <filter id="grainy-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.1" />
            </feComponentTransfer>
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>

          <radialGradient id="core-grad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#ffaa00" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <radialGradient id="inner-grad">
            <stop offset="0%" stopColor="#8a2be2" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#4b0082" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="outer-grad">
            <stop offset="0%" stopColor="#4169e1" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#00008b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Dust Layer */}
        <motion.circle
          cx="500"
          cy="500"
          r="450"
          fill="url(#outer-grad)"
          filter="url(#nebula-noise)"
          style={{ opacity: 0.15 }}
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <circle
          cx="500"
          cy="500"
          r="450"
          fill="white"
          filter="url(#grainy-noise)"
          style={{ opacity: 0.05, mixBlendMode: 'overlay' }}
        />

        {/* Inner Cloud Layer */}
        <motion.circle
          cx="500"
          cy="500"
          r="300"
          fill="url(#inner-grad)"
          filter="url(#nebula-noise)"
          style={{ mixBlendMode: 'screen' }}
          animate={{
            scale: [1, 1.03, 1],
            filter: ["url(#nebula-noise) blur(20px)", "url(#nebula-noise) blur(25px)", "url(#nebula-noise) blur(20px)"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Core Heat Center */}
        <motion.circle
          cx="500"
          cy="500"
          r="80"
          fill="url(#core-grad)"
          style={{ filter: 'blur(15px)' }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>

      {/* Label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-[12px] uppercase tracking-[0.8em] font-bold whitespace-nowrap pointer-events-none">
        Puso ng Hiraya
      </div>
    </div>
  );
};
