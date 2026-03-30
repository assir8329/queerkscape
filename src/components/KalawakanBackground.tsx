import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from 'motion/react';

export const KalawakanBackground: React.FC = () => {
  const [init, setInit] = useState(false);
  const [dimensions, setDimensions] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1920, height: typeof window !== 'undefined' ? window.innerHeight : 1080 });
  const [shootingStars, setShootingStars] = useState<{ id: number; x: number; y: number; length: number; color: string; duration: number }[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createShootingStar = useCallback(() => {
    const id = Date.now() + Math.random();
    const colors = ['#ff3f81', '#29c4ff', '#ffffff', '#79449a', '#fdfc47'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const startX = Math.random() * dimensions.width;
    const startY = Math.random() * (dimensions.height / 2);
    const length = Math.random() * 80 + 50;
    const duration = Math.random() * 1000 + 800;

    setShootingStars(prev => [...prev, { id, x: startX, y: startY, length, color: randomColor, duration }]);

    setTimeout(() => {
      setShootingStars(prev => prev.filter(s => s.id !== id));
    }, duration + 100);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const loop = () => {
      timeout = setTimeout(() => {
        createShootingStar();
        loop();
      }, Math.random() * 4000 + 2000);
    };
    loop();
    return () => clearTimeout(timeout);
  }, [createShootingStar]);

  const particlesOptions = useMemo(() => ({
    fpsLimit: 30,
    detectRetina: false,
    particles: {
      number: { 
        value: 200, 
        density: { 
          enable: true, 
          area: 1200 
        } 
      },
      color: { 
        value: ["#ffffff", "#ffe9c4", "#d4fbff"] 
      },
      shape: { 
        type: "circle" 
      },
      opacity: {
        value: { min: 0.1, max: 0.5 },
        animation: {
          enable: true,
          speed: 0.1,
          sync: false,
          startValue: "random"
        }
      },
      size: { 
        value: { min: 0.5, max: 0.8 } 
      },
      move: {
        enable: false
      }
    },
    interactivity: {
      events: {}
    },
    fullScreen: { enable: false }
  }), []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none z-0 bg-black">
      {/* Particles (Stars) */}
      {init && (
        <Particles
          id="tsparticles"
          options={particlesOptions as any}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Shooting Stars */}
      <AnimatePresence>
        {shootingStars.map(star => (
          <motion.div
            key={star.id}
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1,
              rotate: -35 
            }}
            animate={{ 
              x: -800, 
              y: 800, 
              opacity: 0,
              rotate: -35 
            }}
            transition={{ 
              duration: star.duration / 1000, 
              ease: "easeIn" 
            }}
            className="absolute pointer-events-none"
            style={{
              left: star.x,
              top: star.y,
              width: star.length,
              height: 2,
              background: `linear-gradient(90deg, ${star.color}, transparent)`,
              filter: `drop-shadow(0 0 8px ${star.color})`,
              borderRadius: 999,
              zIndex: 2
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
