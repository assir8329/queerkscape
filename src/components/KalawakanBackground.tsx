import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from 'motion/react';

export const KalawakanBackground: React.FC = () => {
  const [init, setInit] = useState(false);
  const [shootingStars, setShootingStars] = useState<{ id: number; x: number; y: number; length: number; color: string; duration: number }[]>([]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const createShootingStar = useCallback(() => {
    const id = Date.now() + Math.random();
    const colors = ['#ff3f81', '#29c4ff', '#ffffff', '#79449a', '#fdfc47'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * (window.innerHeight / 2);
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
    particles: {
      number: { 
        value: 250, 
        density: { 
          enable: true, 
          area: 800 
        } 
      },
      color: { 
        value: ["#ffffff", "#ffe9c4", "#d4fbff"] 
      },
      shape: { 
        type: "circle" 
      },
      opacity: {
        value: { min: 0.1, max: 0.7 },
        animation: {
          enable: true,
          speed: 0.4,
          sync: false,
          startValue: "random"
        }
      },
      size: { 
        value: { min: 0.5, max: 1.2 } 
      },
      move: {
        enable: false,
        speed: 0,
        random: false,
        straight: false,
        outModes: {
          default: "none"
        }
      }
    },
    interactivity: {
      events: {
        onHover: {
          enable: false
        },
        onClick: {
          enable: false
        }
      }
    },
    retina_detect: true,
    fullScreen: { enable: false }
  }), []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-black">
      {/* Background Gradients */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(circle at top right, rgba(121, 68, 154, 0.12), transparent),
          radial-gradient(circle at 20% 80%, rgba(41, 196, 255, 0.12), transparent)
        `
      }} />

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
              x: -window.innerWidth * 0.5, 
              y: window.innerWidth * 0.5, 
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
